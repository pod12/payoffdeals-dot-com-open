import org.bouncycastle.crypto.params.Ed25519PublicKeyParameters;
import org.bouncycastle.crypto.signers.Ed25519Signer;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/**
 * PayOffPoW v7.5.4 - "Omni Titan" Server-Side Verifier
 * Matches the JS Client implementation with deterministic SHA-256 resets.
 */
public class PayOffPoWVerifier {

    public static boolean verify(String ticket, String replayToken, String solution, byte[] publicKey) throws Exception {
        String[] parts = ticket.split("\\.");
        if (parts.length != 5) return false;

        String nonce = parts[0];
        int d = Integer.parseInt(parts[1]);
        int p = Integer.parseInt(parts[2]);
        long exp = Long.parseLong(parts[3]);
        String signatureHex = parts[4];

        // 1. Ed25519 Signature Verification
        Ed25519Signer verifier = new Ed25519Signer();
        verifier.init(false, new Ed25519PublicKeyParameters(publicKey, 0));
        byte[] msgBytes = (nonce + "." + d + "." + p + "." + exp).getBytes(StandardCharsets.UTF_8);
        verifier.update(msgBytes, 0, msgBytes.length);
        
        if (!verifier.verifySignature(hexToBytes(signatureHex))) return false;

        // 2. Clock Skew Check (5-minute leeway)
        if (System.currentTimeMillis() > (exp + 300000)) return false;

        // 3. Optimized Memory Allocation (Flat array to avoid GC overhead)
        int memSize = 1 << p;
        int[] memory = new int[memSize * 16]; 
        int[] block = new int[16];

        // 4. Seed initialization (Max 64 bytes)
        String safeToken = (replayToken == null) ? "" : replayToken;
        if (safeToken.length() > 64) safeToken = safeToken.substring(0, 64);
        byte[] seed = (nonce + ":" + safeToken).getBytes(StandardCharsets.UTF_8);
        
        ByteBuffer seedBuf = ByteBuffer.allocate(64).order(ByteOrder.LITTLE_ENDIAN);
        seedBuf.put(seed, 0, Math.min(seed.length, 64));
        seedBuf.rewind();
        for (int i = 0; i < 16; i++) block[i] = seedBuf.getInt();

        // 5. Memory Warming (Friction Passes)
        int mask = memSize - 1;
        for (int pass = 0; pass < 4; pass++) {
            for (int i = 0; i < memSize; i++) {
                int target = (pass % 2 == 0) ? i : (memSize - 1 - i);
                int refIdx = (i * (pass + 3)) & mask;
                compress(block, memory, refIdx * 16);
                System.arraycopy(block, 0, memory, target * 16, 16);
            }
        }

        // 6. Work Loop
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        for (int i = 0; i < d; i++) {
            int[] idxs = { 
                (block[0] ^ block[15]) & mask, 
                (block[4] ^ block[11]) & mask, 
                (block[8] ^ block[3]) & mask 
            };
            
            for (int idx : idxs) {
                int offset = idx * 16;
                compress(block, memory, offset);
                int rot = block[0] & 15;
                for (int j = 0; j < 16; j++) {
                    memory[offset + j] = block[(j + rot) & 15] ^ i;
                }
            }

            // Deterministic SHA-256 Reset (Every 128 steps)
            if (i % 128 == 0) {
                ByteBuffer bBuf = ByteBuffer.allocate(64).order(ByteOrder.LITTLE_ENDIAN);
                for (int val : block) bBuf.putInt(val);
                byte[] hash = md.digest(bBuf.array());
                
                ByteBuffer rBuf = ByteBuffer.wrap(hash).order(ByteOrder.LITTLE_ENDIAN);
                for (int j = 0; j < 8; j++) block[j] = rBuf.getInt();
                for (int j = 8; j < 16; j++) block[j] = 0; // TITAN RESET: Match Client JS
            }
        }

        // 7. Final Solution Hash check
        ByteBuffer finalBuf = ByteBuffer.allocate(64).order(ByteOrder.LITTLE_ENDIAN);
        for (int val : block) finalBuf.putInt(val);
        String calculated = bytesToHex(md.digest(finalBuf.array()));

        return calculated.equalsIgnoreCase(solution);
    }

    private static void compress(int[] block, int[] mem, int offset) {
        for (int i = 0; i < 8; i++) {
            int a = block[i], b = mem[offset + i], c = block[i + 8], d = mem[offset + i + 8];
            a += b; a *= (b | 1);
            d ^= a; d = Integer.rotateLeft(d, 16);
            c += d; c *= (d | 1);
            b ^= c; b = Integer.rotateLeft(b, 12);
            a += b; d ^= a; d = Integer.rotateLeft(d, 8);
            c += d; b ^= c; b = Integer.rotateLeft(b, 7);
            block[i] = a; block[i + 8] = c; mem[offset + i] = b; mem[offset + i + 8] = d;
        }
    }

    private static String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) sb.append(String.format("%02x", b));
        return sb.toString();
    }

    private static byte[] hexToBytes(String s) {
        byte[] data = new byte[s.length() / 2];
        for (int i = 0; i < s.length(); i += 2) {
            data[i / 2] = (byte) ((Character.digit(s.charAt(i), 16) << 4) + Character.digit(s.charAt(i+1), 16));
        }
        return data;
    }
}
