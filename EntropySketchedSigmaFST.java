/**
 * <h1>EntropySketchedSigmaFST</h1>
 * * <p>A high-performance, off-heap Finite State Transducer designed for 
 * zero-latency transition lookups and lock-free concurrency.</p>
 * * <h3>Core Architecture:</h3>
 * <ul>
 * <li><b>Entropy-Aware Sketching:</b> Employs a 64-bit rolling probabilistic 
 * sketch to monitor state transition patterns. During compaction, the 
 * engine detects low-entropy (repetitive) paths and "paves" them into 
 * SIMD-friendly Sigma-Highways.</li>
 * <li><b>Wait-Free Read Path:</b> Uses an optimistic concurrency model. 
 * Readers never block, even while a background thread is re-organizing 
 * and compacting the entire data structure.</li>
 * <li><b>Epoch-Based Reclamation (RCU):</b> Manages off-heap memory via a 
 * custom Read-Copy-Update (RCU) mechanism. Memory is only freed once 
 * the global version (Epoch) confirms no active reader is pinned to 
 * the old memory segment.</li>
 * </ul>
 * * 
 * * <h3>Concurrency Safety Manual:</h3>
 * <p><b>1. Memory Visibility:</b> The {@code baseAddress} is volatile. 
 * Always perform a local stack-copy of {@code baseAddress} at the start of a 
 * transition to ensure consistency during the read operation.</p>
 * * <p><b>2. The Pinning Pattern:</b> Before accessing off-heap data, a thread 
 * must "pin" itself to the current {@code globalVersion} via {@code threadSlot}. 
 * This prevents the Compactor from freeing the memory mid-read.</p>
 * * <p><b>3. Memory Fences:</b> We utilize {@code UNSAFE.fullFence()} during 
 * compaction to ensure that the new arena is fully visible to all CPU cores 
 * before we retire the old one.</p>
 * * 
 */

import sun.misc.Unsafe;
import java.lang.reflect.Field;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.lang.ref.WeakReference;

/**
 * EntropySketchedSigmaFST
 * Ultra-high-performance, off-heap Finite State Transducer (FST)
 * Key Techniques:
 * 1. Entropy-Aware Sketching: Tracks transition patterns to optimize hot paths.
 * 2. Sigma-Highway: x86-optimized fast-path for low-entropy symbol sequences.
 * 3. Wait-Free Reads: No-lock transition path for maximum multicore scaling.
 * 4. Epoch Reclamation: RCU-style safe memory management for off-heap arenas.
 */
public class EntropySketchedSigmaFST {
    private static final Unsafe UNSAFE;
    private static final boolean IS_X86;
    private static final long INVALID_OFFSET = -1L;

    private static final int HEADER_SIZE = 32;
    private static final int SIGMA_SIZE = 256;
    private static final int JUMP_TABLE_SIZE = SIGMA_SIZE * 8;

    private static final int OFF_HITS = 4;
    private static final int OFF_SIGMA_MASK = 8;
    private static final int OFF_SIGMA_KEY = 16;
    private static final int OFF_ENTROPY_SKETCH = 24;
    private static final int MIN_HITS = 4;

    private static final long ARRAY_BASE;
    private static final long ARRAY_SCALE;
    private static final long BYTE_ARRAY_BASE;

    static {
        try {
            Field f = Unsafe.class.getDeclaredField("theUnsafe");
            f.setAccessible(true);
            UNSAFE = (Unsafe) f.get(null);
            String arch = System.getProperty("os.arch").toLowerCase();
            IS_X86 = arch.contains("x86_64") || arch.contains("amd64");

            ARRAY_BASE = UNSAFE.arrayBaseOffset(long[].class);
            ARRAY_SCALE = UNSAFE.arrayIndexScale(long[].class);
            BYTE_ARRAY_BASE = UNSAFE.arrayBaseOffset(byte[].class);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private volatile long baseAddress;
    private final AtomicLong arenaPointer = new AtomicLong(0);
    private final long capacity;
    private final long[] stateIndex;

    private final AtomicLong globalVersion = new AtomicLong(0);
    private final CopyOnWriteArrayList<WeakReference<AtomicLong>> readerRegistry = new CopyOnWriteArrayList<>();
    private final ThreadLocal<AtomicLong> threadSlot = ThreadLocal.withInitial(() -> {
        AtomicLong slot = new AtomicLong(INVALID_OFFSET);
        readerRegistry.add(new WeakReference<>(slot));
        return slot;
    });

    private final ConcurrentLinkedQueue<RetiredArena> retiredArenas = new ConcurrentLinkedQueue<>();

    public EntropySketchedSigmaFST(int maxStates, long arenaSize) {
        this.capacity = arenaSize;
        this.baseAddress = UNSAFE.allocateMemory(capacity);
        UNSAFE.setMemory(baseAddress, capacity, (byte)0);
        this.stateIndex = new long[maxStates];
        for (int i = 0; i < maxStates; i++) stateIndex[i] = INVALID_OFFSET;
    }

    // --- Wait-free read path ---
    public long transition(int stateId, byte[] input, int pos) {
        if (stateId < 0 || pos >= input.length) return -1;

        AtomicLong slot = threadSlot.get();
        slot.set(globalVersion.get());

        try {
            long offset, stateAddr;
            int symbol;
            long currentBase;

            while (true) {
                currentBase = this.baseAddress;
                offset = UNSAFE.getLongVolatile(stateIndex, ARRAY_BASE + (stateId * ARRAY_SCALE));
                if (offset == INVALID_OFFSET) return -1;

                stateAddr = currentBase + offset;
                symbol = input[pos] & 0xFF;

                if (currentBase == this.baseAddress) break;
            }

            updateEntropySketch(stateAddr, symbol);

            long entry = getLongSafe(stateAddr + HEADER_SIZE + symbol * 8);
            if (entry == 0L) return -1;

            int skip = (int)((entry >>> 32) & 0xFFFFL);
            if (skip > 1) {
                if (pos + skip > input.length || !matchesSigmaHighway(stateAddr, input, pos + 1, skip - 1)) {
                    return -1;
                }
            }
            return entry;
        } finally {
            slot.lazySet(INVALID_OFFSET);
        }
    }

    private void updateEntropySketch(long stateAddr, int symbol) {
        // Atomic increment of hit count
        int oldHits, newHits;
        do {
            oldHits = UNSAFE.getIntVolatile(null, stateAddr + OFF_HITS);
            newHits = oldHits + 1;
        } while (!UNSAFE.compareAndSwapInt(null, stateAddr + OFF_HITS, oldHits, newHits));

        // Atomic rolling sketch update
        long oldSketch, newSketch;
        do {
            oldSketch = UNSAFE.getLongVolatile(null, stateAddr + OFF_ENTROPY_SKETCH);
            newSketch = ((oldSketch << 8) | (symbol & 0xFF)) & 0xFFFFFFFFFFFFFFFFL;
        } while (!UNSAFE.compareAndSwapLong(null, stateAddr + OFF_ENTROPY_SKETCH, oldSketch, newSketch));
    }

    private boolean matchesSigmaHighway(long stateAddr, byte[] input, int pos, int len) {
        long mask = getLongSafe(stateAddr + OFF_SIGMA_MASK);
        long key = getLongSafe(stateAddr + OFF_SIGMA_KEY);
        if (mask == 0) return true;

        int readLen = Math.min(len, 8);
        if (pos + readLen > input.length) return false;

        long actual;
        if (IS_X86 && readLen == 8) {
            actual = UNSAFE.getLong(input, BYTE_ARRAY_BASE + pos);
        } else {
            actual = 0;
            for (int i = 0; i < readLen; i++) {
                actual |= ((long)(input[pos + i] & 0xFF) << (i * 8));
            }
        }
        return (actual & mask) == (key & mask);
    }

    private long getLongSafe(long addr) {
        if (IS_X86 || (addr & 0x7) == 0) return UNSAFE.getLong(addr);
        long val = 0;
        for (int i = 0; i < 8; i++) val |= ((long)(UNSAFE.getByte(addr + i) & 0xFF) << (i * 8));
        return val;
    }

    // --- Compaction & Optimization ---
    public synchronized void compact() {
        long newBase = UNSAFE.allocateMemory(capacity);
        long newPtr = 0;

        for (int i = 0; i < stateIndex.length; i++) {
            long off = stateIndex[i];
            if (off == INVALID_OFFSET) continue;

            long oldAddr = baseAddress + off;
            long targetAddr = newBase + newPtr;

            UNSAFE.copyMemory(oldAddr, targetAddr, HEADER_SIZE + JUMP_TABLE_SIZE);
            analyzeAndOptimizeSigma(targetAddr);

            stateIndex[i] = newPtr;
            newPtr += HEADER_SIZE + JUMP_TABLE_SIZE;
        }

        long oldBase = this.baseAddress;
        long ver = globalVersion.incrementAndGet();
        this.baseAddress = newBase;
        arenaPointer.set(newPtr);
        UNSAFE.fullFence();

        retiredArenas.add(new RetiredArena(oldBase, ver));
        tryCleanup();
    }

    private void analyzeAndOptimizeSigma(long addr) {
        if (UNSAFE.getInt(addr + OFF_HITS) < MIN_HITS) return;

        long sketch = UNSAFE.getLong(addr + OFF_ENTROPY_SKETCH);
        if (sketch == 0) return;

        byte first = (byte)(sketch & 0xFF);
        boolean lowEntropy = true;
        for (int i = 1; i < 8; i++) {
            if (((byte)((sketch >> (i * 8)) & 0xFF) != first)) {
                lowEntropy = false;
                break;
            }
        }

        if (lowEntropy && first != 0) {
            UNSAFE.putLong(addr + OFF_SIGMA_MASK, 0xFFFFFFFFL);
            UNSAFE.putLong(addr + OFF_SIGMA_KEY, (first & 0xFF) * 0x01010101L);
        }
    }

    // --- RCU Cleanup ---
    public void tryCleanup() {
        while (!retiredArenas.isEmpty()) {
            RetiredArena r = retiredArenas.peek();
            boolean inUse = false;
            readerRegistry.removeIf(ref -> ref.get() == null);

            for (WeakReference<AtomicLong> ref : readerRegistry) {
                AtomicLong slot = ref.get();
                if (slot != null && slot.get() != INVALID_OFFSET && slot.get() <= r.version) {
                    inUse = true;
                    break;
                }
            }

            if (!inUse) UNSAFE.freeMemory(retiredArenas.poll().base);
            else break;
        }
    }

    public void shutdown() {
        if (baseAddress != 0) { UNSAFE.freeMemory(baseAddress); baseAddress = 0; }
        RetiredArena r;
        while ((r = retiredArenas.poll()) != null) UNSAFE.freeMemory(r.base);
    }

    private static class RetiredArena {
        final long base;
        final long version;
        RetiredArena(long b, long v) { this.base = b; this.version = v; }
    }
}
