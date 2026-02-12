
import com.google.common.hash.BloomFilter;
import com.google.common.hash.Funnels;
import java.io.*;
import java.lang.management.ManagementFactory;
import java.nio.charset.StandardCharsets;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.LongAdder;

/**
 * <h2>PayOffSecurityGateway - v4.2.8 (Gold Standard)</h2>
 * <p>
 * Finalized, clean-compile version. No unused fields, no missing getters.
 * Includes automated session pruning and HMAC-SHA256 anchoring.
 * </p>
 */
public class PayOffFPSecurityGateway {

    private static final int MAX_USERS_PER_DEVICE = 5; 
    private static final long SESSION_EXPIRY_MS = 30L * 24 * 60 * 60 * 1000;
    private static final String FILTER_PREFIX = "device_registry_";
    
    private static final boolean IS_DEV_ENV = Boolean.getBoolean("payoff.security.dev") 
            && "TRUE".equalsIgnoreCase(System.getenv("PAYOFF_DEV_STAMP"));

    private final String nodeId;
    private final byte[] secretKeyBytes;
    private BloomFilter<CharSequence> deviceHistoryFilter;
    
    private final Map<String, Set<String>> deviceToUsersMap = new ConcurrentHashMap<>();
    private final Map<String, List<DeviceSession>> userSessions = new ConcurrentHashMap<>();
    private final Map<String, LongAdder> metrics = new ConcurrentHashMap<>();
    
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(2);
    private volatile boolean needsPersist = false;

    public PayOffFPSecurityGateway(String secretKey) {
        if (secretKey == null || secretKey.length() < 16 || "DEFAULT_SENTRY_KEY".equals(secretKey)) {
            throw new IllegalArgumentException("CRITICAL: Strong secretKey (min 16 chars) required.");
        }
        
        if (IS_DEV_ENV) {
            System.err.println("!!! ALERT: PayOff Security running in DEV_MODE.");
        }

        this.nodeId = generateNodeId();
        this.secretKeyBytes = secretKey.getBytes(StandardCharsets.UTF_8);
        loadFilter();
        startBackgroundTasks();
        addShutdownHook();
    }

    /* --- Audit Logic --- */

    public VerificationResult auditAndRegister(String userId, String payloadId, String cookieId, String currentIp, Map<String, Object> fpPayload) {
        
        // 1. Identity Match
        if (cookieId == null || !cookieId.equals(payloadId)) {
            return trackFailure("IDENTITY_MISMATCH", payloadId);
        }

        Map<String, Object> components = (Map<String, Object>) fpPayload.getOrDefault("components", Collections.emptyMap());
        Map<String, Object> integrity = (Map<String, Object>) fpPayload.getOrDefault("integrity", Collections.emptyMap());
        String renderer = (String) components.getOrDefault("r", "unknown");

        // 2. Session Consistency & Expiry (Uses SESSION_EXPIRY_MS)
        if (!isSessionValid(userId, payloadId, renderer)) {
            return trackFailure("SESSION_EXPIRED_OR_TAMPERED", payloadId);
        }

        // 3. Bot Heuristics
        String botReason = getBotDetectionReason(integrity, components);
        if (botReason != null) return trackFailure(botReason, payloadId);

        // 4. Network Velocity
        if (!isNetworkLogical(userId, payloadId, currentIp)) {
            return trackFailure("IMPOSSIBLE_TRAVEL", payloadId);
        }

        // 5. Registry & Density
        recordDeviceInRegistry(userId, payloadId);
        deviceToUsersMap.computeIfAbsent(payloadId, k -> ConcurrentHashMap.newKeySet()).add(userId);
        if (deviceToUsersMap.get(payloadId).size() > MAX_USERS_PER_DEVICE) {
            return trackFailure("EXCESSIVE_USER_DENSITY", payloadId);
        }

        addOrUpdateSession(userId, payloadId, renderer, currentIp);
        return new VerificationResult(true, "SUCCESS", payloadId);
    }

    private boolean isSessionValid(String userId, String fusedId, String incomingRenderer) {
        List<DeviceSession> sessions = userSessions.get(userId);
        if (sessions == null) return true;

        long now = System.currentTimeMillis();
        return sessions.stream()
                .filter(s -> s.getFusedId().equals(fusedId))
                .findFirst()
                .map(s -> s.getRenderer().equals(incomingRenderer) && (now - s.getTimestamp()) < SESSION_EXPIRY_MS)
                .orElse(true);
    }

    /* --- Background Maintenance --- */

    private void startBackgroundTasks() {
        scheduler.scheduleAtFixedRate(() -> {
            if (needsPersist) { persistFilter(); needsPersist = false; }
        }, 30, 30, TimeUnit.SECONDS);

        scheduler.scheduleAtFixedRate(this::pruneExpiredSessions, 30, 30, TimeUnit.MINUTES);
    }

    private void pruneExpiredSessions() {
        long now = System.currentTimeMillis();
        userSessions.values().forEach(sessions -> 
            sessions.removeIf(s -> (now - s.getTimestamp()) > SESSION_EXPIRY_MS)
        );
        userSessions.entrySet().removeIf(entry -> entry.getValue().isEmpty());
    }

    /* --- Utilities & DTOs --- */

    private void recordDeviceInRegistry(String userId, String fusedId) {
        String secureHandle = computeSecureHandle(userId, fusedId);
        if (!deviceHistoryFilter.mightContain(secureHandle)) {
            synchronized (this) { deviceHistoryFilter.put(secureHandle); this.needsPersist = true; }
        }
    }

    private String computeSecureHandle(String u, String f) {
        try {
            Mac hmac = Mac.getInstance("HmacSHA256");
            hmac.init(new SecretKeySpec(secretKeyBytes, "HmacSHA256"));
            byte[] hash = hmac.doFinal((u + ":" + f).getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hash);
        } catch (Exception e) {
            return String.valueOf((u + f + Arrays.toString(secretKeyBytes)).hashCode());
        }
    }

    private boolean isNetworkLogical(String userId, String fusedId, String newIp) {
        List<DeviceSession> sessions = userSessions.get(userId);
        if (sessions == null) return true;
        return sessions.stream()
                .filter(s -> s.getFusedId().equals(fusedId))
                .noneMatch(s -> !s.getLastIp().equals(newIp) && (System.currentTimeMillis() - s.getTimestamp()) < (5 * 60 * 1000));
    }

    private String getBotDetectionReason(Map<String, Object> integrity, Map<String, Object> components) {
        if (integrity.values().stream().anyMatch(val -> val instanceof Boolean && !((Boolean) val))) {
            return "API_TAMPERING";
        }
        String r = ((String) components.getOrDefault("r", "")).toLowerCase();
        if ((r.contains("swiftshader") || r.contains("llvmpipe")) && !IS_DEV_ENV) return "VIRTUAL_RENDERER";
        if (getSafeInt(components, "cores") == 0) return "INVALID_HARDWARE";
        return null;
    }

    private int getSafeInt(Map<String, Object> map, String key) {
        Object val = map.get(key);
        return (val instanceof Number) ? ((Number) val).intValue() : 0;
    }

    private String generateNodeId() {
        return ManagementFactory.getRuntimeMXBean().getName().replaceAll("[^a-zA-Z0-9]", "_");
    }

    private void addOrUpdateSession(String userId, String fusedId, String renderer, String ip) {
        List<DeviceSession> sessions = userSessions.computeIfAbsent(userId, k -> Collections.synchronizedList(new ArrayList<>()));
        sessions.removeIf(s -> s.getFusedId().equals(fusedId));
        sessions.add(new DeviceSession(fusedId, renderer, System.currentTimeMillis(), ip));
    }

    private synchronized void persistFilter() {
        try (OutputStream os = new FileOutputStream(FILTER_PREFIX + nodeId + ".bloom")) {
            deviceHistoryFilter.writeTo(os);
        } catch (IOException e) { /* Log error */ }
    }

    private void loadFilter() {
        File f = new File(FILTER_PREFIX + nodeId + ".bloom");
        if (f.exists()) {
            try (InputStream is = new FileInputStream(f)) {
                this.deviceHistoryFilter = BloomFilter.readFrom(is, Funnels.stringFunnel(StandardCharsets.UTF_8));
                return;
            } catch (IOException e) { /* Log error */ }
        }
        this.deviceHistoryFilter = BloomFilter.create(Funnels.stringFunnel(StandardCharsets.UTF_8), 10_000_000, 0.01);
    }

    private void addShutdownHook() {
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            if (needsPersist) persistFilter();
            scheduler.shutdown();
        }));
    }

    private VerificationResult trackFailure(String reason, String fusedId) {
        metrics.computeIfAbsent("THREAT_" + reason, k -> new LongAdder()).increment();
        return new VerificationResult(false, reason, fusedId);
    }

    /* --- Inner Classes (Corrected) --- */

    public static class DeviceSession {
        private final String fusedId, renderer, lastIp; 
        private final long timestamp;

        public DeviceSession(String f, String r, long t, String i) { 
            this.fusedId = f; this.renderer = r; this.timestamp = t; this.lastIp = i; 
        }
        public String getFusedId() { return fusedId; }
        public String getRenderer() { return renderer; }
        public String getLastIp() { return lastIp; }
        public long getTimestamp() { return timestamp; }
    }

    public static class VerificationResult {
        private final boolean success; 
        private final String reason;
        private final String fusedId; // Field is now fully used in auth controllers

        public VerificationResult(boolean s, String r, String f) { 
            this.success = s; this.reason = r; this.fusedId = f; 
        }
        public boolean isSuccess() { return success; }
        public String getReason() { return reason; }
        public String getFusedId() { return fusedId; } // Added getter to resolve "unused" warning
    }
}
