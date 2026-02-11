import java.util.*;

/**
 * PayOffFPValidator - v2.8.6 | Gold Standard
 * Refactored to use centralized PayOffFPHash utility.
 * Strictly Java 8 compatible.
 */
public class PayOffFPValidator {
    
    private static final long SEED = 0x41c6ce57L;

    /**
     * Verifies the fused identity against the server-side nonce.
     * * @param payload The JSON payload from the client (Map)
     * @param activeNonce The nonce associated with the current session/request
     * @return true if the hash matches character-for-character
     */
    public boolean verify(Map<String, Object> payload, String activeNonce) {
        if (payload == null || activeNonce == null) return false;

        try {
            String receivedFusedId = (String) payload.get("fusedId");
            
            @SuppressWarnings("unchecked")
            Map<String, Object> components = (Map<String, Object>) payload.get("components");
            
            if (components == null) return false;

            // Order must strictly match JS v2.8.6: c | a | r | e | nonce
            String raw = String.join("|", 
                String.valueOf(components.get("c")),
                String.valueOf(components.get("a")),
                String.valueOf(components.get("r")),
                String.valueOf(components.get("e")),
                activeNonce
            );

            // Use the centralized hashing utility
            String calculatedId = PayOffFPHash.calculate(raw, SEED);
            
            return calculatedId.equalsIgnoreCase(receivedFusedId);
        } catch (Exception e) {
            // Log exception here if necessary for debugging
            return false;
        }
    }
}
