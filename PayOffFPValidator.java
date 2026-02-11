import java.util.*;

/**
 * PayOffValidator - v2.8.6 Gold Standard
 * Strictly Java 8 compatible. 
 */
public class PayOffFPValidator {
    
    private static final long SEED = 0x41c6ce57L;

    public boolean verify(Map<String, Object> payload, String activeNonce) {
        try {
            String receivedFusedId = (String) payload.get("fusedId");
            @SuppressWarnings("unchecked")
			Map<String, Object> components = (Map<String, Object>) payload.get("components");

            // Order must be: c | a | r | e | nonce
            String raw = String.join("|", 
                String.valueOf(components.get("c")),
                String.valueOf(components.get("a")),
                String.valueOf(components.get("r")),
                String.valueOf(components.get("e")),
                activeNonce
            );

            return calculateMurmur3(raw).equalsIgnoreCase(receivedFusedId);
        } catch (Exception e) {
            return false;
        }
    }

    private String calculateMurmur3(String input) {
        long h1 = SEED ^ 0xdeadbeefL;
        long h2 = SEED ^ 0x41c6ce57L;
        for (int i = 0; i < input.length(); i++) {
            int ch = input.charAt(i);
            h1 = (int)((h1 ^ ch) * 2654435761L);
            h2 = (int)((h2 ^ ch) * 1597334677L);
        }
        h1 = (int)((h1 ^ (h1 >>> 16)) * 2246822507L) ^ (int)((h2 ^ (h2 >>> 13)) * 3266489909L);
        h2 = (int)((h2 ^ (h2 >>> 16)) * 2246822507L) ^ (int)((h1 ^ (h1 >>> 13)) * 3266489909L);
        long res = (4294967296L * (2097151 & h2) + (h1 & 0xFFFFFFFFL));
        return Long.toHexString(res);
    }
}
