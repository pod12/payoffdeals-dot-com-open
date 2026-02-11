public class PayOffFPHash {
    /**
     * Strictly Java 8 compatible.
     * Replicates JS (Math.floor(v * 1e6) | 0) logic.
     */
    public static int toJsInt(float value) {
        return (int) Math.floor(value * 1_000_000.0);
    }

    /**
     * Replicates the JS Murmur3-style final result.
     */
    public static String calculate(String str, long seed) {
        long h1 = seed ^ 0xdeadbeefL;
        long h2 = seed ^ 0x41c6ce57L;

        for (int i = 0; i < str.length(); i++) {
            int ch = str.charAt(i);
            h1 = (int)((h1 ^ ch) * 2654435761L);
            h2 = (int)((h2 ^ ch) * 1597334677L);
        }

        h1 = (int)((h1 ^ (h1 >>> 16)) * 2246822507L) ^ (int)((h2 ^ (h2 >>> 13)) * 3266489909L);
        h2 = (int)((h2 ^ (h2 >>> 16)) * 2246822507L) ^ (int)((h1 ^ (h1 >>> 13)) * 3266489909L);

        // Result calculation that matches JS 53-bit float precision for the final string
        long result = (4294967296L * (2097151 & h2) + (h1 & 0xFFFFFFFFL));
        return Long.toHexString(result);
    }
}
