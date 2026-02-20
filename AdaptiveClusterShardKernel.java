
/*
================================================================================
                         Roadmap
================================================================================

CURRENT STATUS:
---------------
- Deterministic core: Trie-based shard routing, WAL-backed local storage.
- Auto-balancer: Entropy + threshold based split/merge.
- Socket API: Local-first GET/PUT with remote forwarding.
- BrainAgent interface: Stubbed, ready for AI-driven tuning.
- Migration & replication: Structural hooks in place (stubbed).
- Tunable policies: Split/merge thresholds, entropy, balance intervals.

FUTURE ROADMAP:
---------------
1. **Replication & Fault Tolerance**
   - Implement full multi-node replication.
   - Ensure WAL-consistency across nodes.
   - Automatic failover for node crashes.

2. **Advanced Migration**
   - Dynamic shard migration between nodes.
   - Load-aware distribution.
   - Brain-guided proactive balancing.

3. **Brain / AI Integration**
   - Implement learning BrainAgent(s) that:
       * Observe cluster metrics in real-time.
       * Dynamically adjust thresholds and policies.
       * Plan migrations intelligently.
   - Plug in ML/AI modules for predictive scaling.

4. **Dynamic Scaling**
   - Add/remove nodes on demand.
   - AI-driven shard placement for load optimization.
   - Support cloud/native elasticity scenarios.

5. **Monitoring & Metrics**
   - Collect node-level CPU/memory/network stats.
   - Shard-level key distribution & entropy metrics.
   - Expose via API or dashboard for Brain/analytics.

6. **Security & Networking**
   - Secure socket communication (TLS).
   - Authentication/authorization for remote operations.
   - Retry, backpressure, and network fault handling.

7. **Performance Enhancements**
   - Optimize shard trie traversal.
   - Batch WAL writes / asynchronous I/O.
   - Memory-efficient storage structures.

8. **Simulation & Testing**
   - Load simulation with dynamic Brain tuning.
   - Stress tests for shard splits, merges, and migration.
   - Benchmark deterministic vs AI-tuned behavior.

================================================================================
*/

import java.io.*;
import java.net.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;
import java.util.concurrent.locks.*;

/**
 * AdaptiveClusterShardKernel is a distributed, trie-based key-value cluster system
 * with WAL-backed storage, deterministic shard routing, and optional AI-driven tuning.
 *
 * Features:
 * - Deterministic shard routing based on key prefixes.
 * - WAL (Write-Ahead Log) for durability.
 * - Auto-balancer: shard split/merge based on thresholds and entropy.
 * - Supports multiple nodes with forwardable GET/PUT.
 * - BrainAgent interface for AI-driven policy tuning and migration planning.
 *
 * @param <V> Type of stored values (must be Serializable)
 * Contributors: Me, ChatGPT (OpenAI)and Gemini (Google).
 */
public class AdaptiveClusterShardKernel<V extends Serializable> {

    // =========================
    // ENUMS & CONFIG
    // =========================
    /** Possible shard states. */
    public enum ShardState { ACTIVE, SPLITTING, MERGING, MIGRATING, INACTIVE }

    /** Migration state of a shard. */
    public enum MigrationState { STABLE, COPYING, SWITCHING, FINALIZING }

    private static final int DEFAULT_SPLIT_THRESHOLD = 5;
    private static final int DEFAULT_MERGE_THRESHOLD = 2;
    private static final int MAX_DEPTH = 63;
    private static final long BALANCE_INTERVAL_MS = 2000;
    private static final int ENTROPY_BITS = 3;

    // =========================
    // WAL (Write-Ahead Log) RECORD
    // =========================
    static class WALRecord<V> implements Serializable {
        enum Type { PUT, DEL }
        final Type type;
        final long key;
        final V value;

        WALRecord(Type type, long key, V value) {
            this.type = type;
            this.key = key;
            this.value = value;
        }
    }

    // =========================
    // DATA NODE INTERFACE
    // =========================
    public interface DataNode<V> {
        String getNodeId();
        void put(long key, V value) throws IOException;
        CompletableFuture<V> get(long key);
        void delete(long key) throws IOException;
        int getPairCount();
        CompletableFuture<Map<Long, V>> getAll();
        void recover() throws IOException;
    }

    // =========================
    // APPENDABLE OBJECT OUTPUT STREAM (for WAL)
    // =========================
    static class AppendableObjectOutputStream extends ObjectOutputStream {
        AppendableObjectOutputStream(OutputStream out) throws IOException { super(out); }
        @Override protected void writeStreamHeader() throws IOException { reset(); }
    }

    // =========================
    // WAL-BACKED DATA NODE
    // =========================
    static class WALDataNode<V extends Serializable> implements DataNode<V> {
        private final String id;
        private final Map<Long, V> store = new ConcurrentHashMap<>();
        private final File walFile;
        private ObjectOutputStream walOut;
        private final Object walLock = new Object();

        WALDataNode(String id) throws IOException {
            this.id = id;
            this.walFile = new File(id + ".wal");
            if (walFile.exists() && walFile.length() > 0) {
                recover();
                walOut = new AppendableObjectOutputStream(new FileOutputStream(walFile, true));
            } else {
                walOut = new ObjectOutputStream(new FileOutputStream(walFile, true));
            }
        }

        @Override public String getNodeId() { return id; }

        @Override
        public void put(long key, V value) throws IOException {
            synchronized (walLock) {
                store.put(key, value);
                walOut.writeObject(new WALRecord<>(WALRecord.Type.PUT, key, value));
                walOut.flush();
            }
        }

        @Override public CompletableFuture<V> get(long key) { return CompletableFuture.completedFuture(store.get(key)); }

        @Override
        public void delete(long key) throws IOException {
            synchronized (walLock) {
                store.remove(key);
                walOut.writeObject(new WALRecord<V>(WALRecord.Type.DEL, key, null));
                walOut.flush();
            }
        }

        @Override public int getPairCount() { return store.size(); }
        @Override public CompletableFuture<Map<Long,V>> getAll() { return CompletableFuture.completedFuture(new HashMap<>(store)); }

        @Override
        public void recover() throws IOException {
            if (!walFile.exists()) return;
            try (ObjectInputStream in = new ObjectInputStream(new FileInputStream(walFile))) {
                while (true) {
                    WALRecord<V> rec = (WALRecord<V>) in.readObject();
                    if (rec.type == WALRecord.Type.PUT) store.put(rec.key, rec.value);
                    else store.remove(rec.key);
                }
            } catch (EOFException e) {
                // normal EOF
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }

    // =========================
    // SHARD DESCRIPTOR
    // =========================
    static class ShardDescriptor<V> {
        final String shardId;
        volatile ShardState state = ShardState.ACTIVE;
        volatile MigrationState migrationState = MigrationState.STABLE;
        volatile String physicalNodeId;
        volatile ShardDescriptor<V> migrationTarget = null;
        volatile int keyCount = 0;
        DataNode<V> dataNode;

        ShardDescriptor(String id, String nodeId, DataNode<V> dn) {
            shardId = id;
            physicalNodeId = nodeId;
            dataNode = dn;
        }
    }

    // =========================
    // TRIE NODE
    // =========================
    static class Node<V> {
        final AtomicReference<Node<V>[]> children = new AtomicReference<>(null);
        volatile ShardDescriptor<V> shard;
        final int level;
        final long prefix;
        final Node<V> parent;

        Node(ShardDescriptor<V> shard, int level, long prefix, Node<V> parent) {
            this.shard = shard;
            this.level = level;
            this.prefix = prefix;
            this.parent = parent;
        }

        boolean isLeaf() { return children.get() == null; }
    }

    // =========================
    // CLUSTER METRICS & POLICY
    // =========================
    class ClusterMetrics {
        final long totalKeys;
        final long totalShards;
        final Map<String, Integer> shardSizes;

        ClusterMetrics(Map<String, ShardDescriptor<V>> shardMap) {
            shardSizes = new HashMap<>();
            long keys = 0;
            for (var s : shardMap.values()) {
                shardSizes.put(s.shardId, s.keyCount);
                keys += s.keyCount;
            }
            totalKeys = keys;
            totalShards = shardMap.size();
        }
    }

    class ClusterPolicy {
        double splitEntropyThreshold = 0.7;
        int splitThreshold = DEFAULT_SPLIT_THRESHOLD;
        int mergeThreshold = DEFAULT_MERGE_THRESHOLD;
        int maxShardDepth = MAX_DEPTH;
    }

    // =========================
    // BRAIN AGENT INTERFACE
    // =========================
    interface BrainAgent<V> {
        void observe(Map<String, ShardDescriptor<V>> shardMap, ClusterMetrics nodeMetrics);
        void adjustPolicy(ClusterPolicy policy, Map<String, ShardDescriptor<V>> shardMap);
        void planMigration(List<ShardDescriptor<V>> shards, Map<String, InetSocketAddress> clusterNodes);
    }

    // =========================
    // KERNEL STATE
    // =========================
    private final String localNodeId;
    private final int port;
    private final AtomicReference<Node<V>> rootRef;
    private final ConcurrentMap<String, ShardDescriptor<V>> shardMap = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, ReentrantLock> shardLocks = new ConcurrentHashMap<>();
    private final ExecutorService executor = Executors.newCachedThreadPool();
    private final Map<String, InetSocketAddress> clusterNodes = new ConcurrentHashMap<>();

    private BrainAgent<V> brainAgent;
    private final ClusterPolicy clusterPolicy = new ClusterPolicy();

    /**
     * Constructor initializes the root shard, starts server and auto-balancer.
     */
    public AdaptiveClusterShardKernel(String nodeId, int port) throws IOException {
        this.localNodeId = nodeId;
        this.port = port;
        ShardDescriptor<V> root = new ShardDescriptor<>(nodeId + "_root", nodeId, new WALDataNode<>(nodeId + "_root"));
        shardMap.put(root.shardId, root);
        rootRef = new AtomicReference<>(new Node<>(root, 0, 0, null));

        new Thread(this::runServer).start();
        startAutoBalancer();
    }

    /** Registers a remote cluster node. */
    public void registerNode(String nodeId, String host, int port) {
        clusterNodes.put(nodeId, new InetSocketAddress(host, port));
    }

    /** Sets the AI BrainAgent for dynamic tuning. */
    public void setBrainAgent(BrainAgent<V> agent) { this.brainAgent = agent; }

    /** Starts the scheduled BrainAgent loop. */
    public void startBrainLoop() {
        Executors.newSingleThreadScheduledExecutor().scheduleAtFixedRate(() -> {
            if (brainAgent != null) {
                try {
                    ClusterMetrics metrics = new ClusterMetrics(shardMap);
                    brainAgent.observe(shardMap, metrics);
                    brainAgent.adjustPolicy(clusterPolicy, shardMap);
                    brainAgent.planMigration(new ArrayList<>(shardMap.values()), clusterNodes);
                } catch (Exception e) { e.printStackTrace(); }
            }
        }, 1, 2, TimeUnit.SECONDS);
    }

    // =========================
    // ROUTING, GET/PUT, FORWARDING, LOCKS
    // =========================
    private ShardDescriptor<V> route(long key) {
        Node<V> curr = rootRef.get();
        while (curr.level < MAX_DEPTH) {
            Node<V>[] kids = curr.children.get();
            if (kids == null) break;
            int bit = (int) ((key >>> (63 - curr.level)) & 1);
            Node<V> next = kids[bit];
            if (next == null) break;
            curr = next;
        }
        return curr.shard;
    }

    public void put(long key, V value) throws Exception {
        ShardDescriptor<V> shard = route(key);
        if (!shard.physicalNodeId.equals(localNodeId)) { forwardPut(shard.physicalNodeId, key, value); return; }
        withShardLock(shard, () -> {
            try { shard.dataNode.put(key, value); shard.keyCount = shard.dataNode.getPairCount(); }
            catch (Exception e) { e.printStackTrace(); }
            if (shard.migrationTarget != null) {
                try { shard.migrationTarget.dataNode.put(key, value); } catch (Exception e) { e.printStackTrace(); }
            }
        });
    }

    public V get(long key) throws Exception {
        ShardDescriptor<V> shard = route(key);
        if (!shard.physicalNodeId.equals(localNodeId)) return forwardGet(shard.physicalNodeId, key);
        return shard.dataNode.get(key).get();
    }

    private void forwardPut(String nodeId, long key, V value) throws Exception {
        InetSocketAddress addr = clusterNodes.get(nodeId);
        try (Socket s = new Socket(addr.getHostName(), addr.getPort());
             ObjectOutputStream out = new ObjectOutputStream(s.getOutputStream());
             ObjectInputStream in = new ObjectInputStream(s.getInputStream())) {
            out.writeObject("PUT"); out.writeLong(key); out.writeObject(value); out.flush();
            in.readBoolean();
        }
    }

    private V forwardGet(String nodeId, long key) throws Exception {
        InetSocketAddress addr = clusterNodes.get(nodeId);
        try (Socket s = new Socket(addr.getHostName(), addr.getPort());
             ObjectOutputStream out = new ObjectOutputStream(s.getOutputStream());
             ObjectInputStream in = new ObjectInputStream(s.getInputStream())) {
            out.writeObject("GET"); out.writeLong(key); out.flush();
            return (V) in.readObject();
        }
    }

    private void withShardLock(ShardDescriptor<V> shard, Runnable action) {
        ReentrantLock lock = shardLocks.computeIfAbsent(shard.shardId, k -> new ReentrantLock());
        lock.lock();
        try { action.run(); } finally { lock.unlock(); }
    }

    // =========================
    // AUTO-BALANCER
    // =========================
    private void startAutoBalancer() {
        Executors.newSingleThreadScheduledExecutor().scheduleAtFixedRate(this::autoBalance, 500, BALANCE_INTERVAL_MS, TimeUnit.MILLISECONDS);
    }

    private void autoBalance() {
        try {
            for (ShardDescriptor<V> shard : shardMap.values()) {
                if (shard.state != ShardState.ACTIVE || shard.migrationTarget != null) continue;
                int count = shard.dataNode.getPairCount();
                double entropy = computeEntropy(shard);
                if (count > clusterPolicy.splitThreshold && entropy > clusterPolicy.splitEntropyThreshold)
                    executor.submit(() -> splitAndMigrate(shard));
            }

            List<ShardDescriptor<V>> shards = new ArrayList<>(shardMap.values());
            for (int i = 0; i < shards.size() - 1; i++) {
                ShardDescriptor<V> s0 = shards.get(i), s1 = shards.get(i + 1);
                if (s0.state == ShardState.ACTIVE && s1.state == ShardState.ACTIVE && s0.physicalNodeId.equals(s1.physicalNodeId)) {
                    double e0 = computeEntropy(s0), e1 = computeEntropy(s1);
                    if (e0 < 0.3 && e1 < 0.3 && s0.keyCount + s1.keyCount <= clusterPolicy.mergeThreshold)
                        mergeShards(s0.shardId, s1.shardId);
                }
            }
        } catch (Exception e) { e.printStackTrace(); }
    }

    private double computeEntropy(ShardDescriptor<V> shard) {
        try {
            Map<Long, V> data = shard.dataNode.getAll().get();
            if (data.isEmpty()) return 0.0;
            int bins = 1 << ENTROPY_BITS;
            int[] counts = new int[bins];
            for (long k : data.keySet()) counts[(int) ((k >>> (MAX_DEPTH - ENTROPY_BITS)) & (bins - 1))]++;
            double entropy = 0.0;
            int total = data.size();
            for (int c : counts) if (c > 0) { double p = (double) c / total; entropy -= p * Math.log(p) / Math.log(2); }
            return entropy;
        } catch (Exception e) { return 0.0; }
    }

    // =========================
    // SPLIT / MERGE LOGIC
    // =========================
    private void splitAndMigrate(ShardDescriptor<V> shard) {
        withShardLock(shard, () -> {
            try {
                Map<Long, V> data = shard.dataNode.getAll().get();
                if (data.size() <= clusterPolicy.splitThreshold) return;
                shard.state = ShardState.SPLITTING;

                Node<V> parentNode = findNode(shard.shardId);
                Node<V>[] children = new Node[2];
                Map<Long, V> leftData = new HashMap<>();
                Map<Long, V> rightData = new HashMap<>();
                for (Map.Entry<Long, V> e : data.entrySet())
                    if (((e.getKey() >>> (MAX_DEPTH - (parentNode.level + 1))) & 1) == 0) leftData.put(e.getKey(), e.getValue());
                    else rightData.put(e.getKey(), e.getValue());

                String targetNode = clusterNodes.keySet().stream().filter(n -> !n.equals(localNodeId)).findFirst().orElse(localNodeId);

                WALDataNode<V> leftNode = new WALDataNode<>(shard.shardId + "_0");
                WALDataNode<V> rightNode = new WALDataNode<>(shard.shardId + "_1");
                for (Map.Entry<Long, V> e : leftData.entrySet()) leftNode.put(e.getKey(), e.getValue());
                for (Map.Entry<Long, V> e : rightData.entrySet()) rightNode.put(e.getKey(), e.getValue());

                ShardDescriptor<V> leftShard = new ShardDescriptor<>(shard.shardId + "_0", localNodeId, leftNode);
                ShardDescriptor<V> rightShard = new ShardDescriptor<>(shard.shardId + "_1", targetNode, rightNode);

                shardMap.put(leftShard.shardId, leftShard);
                shardMap.put(rightShard.shardId, rightShard);

                children[0] = new Node<>(leftShard, parentNode.level + 1, (parentNode.prefix << 1), parentNode);
                children[1] = new Node<>(rightShard, parentNode.level + 1, (parentNode.prefix << 1) | 1, parentNode);
                parentNode.children.set(children);

                // Stub migration
                if (!rightShard.physicalNodeId.equals(localNodeId)) executor.submit(() -> { try { migrateShard(rightShard); } catch (Exception e) { e.printStackTrace(); } });

                shard.state = ShardState.INACTIVE;
                shardMap.remove(shard.shardId);
            } catch (Exception e) { e.printStackTrace(); }
        });
    }

    private void migrateShard(ShardDescriptor<V> shard) throws Exception {
        shard.state = ShardState.ACTIVE; // Stub
    }

    private void mergeShards(String shardId0, String shardId1) {
        ShardDescriptor<V> s0 = shardMap.get(shardId0);
        ShardDescriptor<V> s1 = shardMap.get(shardId1);
        if (s0 == null || s1 == null) return;
        withShardLock(s0, () -> withShardLock(s1, () -> {
            try {
                Map<Long, V> data0 = s0.dataNode.getAll().get();
                Map<Long, V> data1 = s1.dataNode.getAll().get();
                WALDataNode<V> mergedNode = new WALDataNode<>(s0.shardId + "_merged");
                for (Map.Entry<Long, V> e : data0.entrySet()) mergedNode.put(e.getKey(), e.getValue());
                for (Map.Entry<Long, V> e : data1.entrySet()) mergedNode.put(e.getKey(), e.getValue());
                ShardDescriptor<V> mergedShard = new ShardDescriptor<>(s0.shardId + "_merged", localNodeId, mergedNode);
                shardMap.put(mergedShard.shardId, mergedShard);
                s0.state = s1.state = ShardState.INACTIVE;
                shardMap.remove(s0.shardId);
                shardMap.remove(s1.shardId);
            } catch (Exception e) { e.printStackTrace(); }
        }));
    }

    private Node<V> findNode(String shardId) {
        Queue<Node<V>> q = new LinkedList<>();
        q.add(rootRef.get());
        while (!q.isEmpty()) {
            Node<V> n = q.poll();
            if (n.shard.shardId.equals(shardId)) return n;
            Node<V>[] kids = n.children.get();
            if (kids != null) for (Node<V> c : kids) if (c != null) q.add(c);
        }
        return null;
    }

    // =========================
    // SERVER
    // =========================
    private void runServer() {
        try (ServerSocket server = new ServerSocket(port)) {
            while (true) executor.submit(() -> {
                try {
                    Socket client = server.accept();
                    handleClient(client);
                } catch (IOException e) { e.printStackTrace(); }
            });
        } catch (Exception e) { e.printStackTrace(); }
    }

    private void handleClient(Socket s) {
        try (ObjectInputStream in = new ObjectInputStream(s.getInputStream());
             ObjectOutputStream out = new ObjectOutputStream(s.getOutputStream())) {
            String cmd = (String) in.readObject();
            if ("PUT".equals(cmd)) {
                long key = in.readLong();
                V value = (V) in.readObject();
                put(key, value);
                out.writeBoolean(true); out.flush();
            } else if ("GET".equals(cmd)) {
                long key = in.readLong();
                V val = get(key);
                out.writeObject(val); out.flush();
            }
        } catch (Exception e) { e.printStackTrace(); }
        finally { try { s.close(); } catch (Exception e) {} }
    }

    /** Prints the cluster shard topology for debugging. */
    public void printTopology() {
        shardMap.values().forEach(s ->
                System.out.println(s.shardId + " -> Node:" + s.physicalNodeId + " Keys:" + s.keyCount + " State:" + s.state));
    }
}

