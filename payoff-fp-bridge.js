/**
 * PayOffFPBridge - v1.5.4 (Production Ready + Observability + Cached Device Tier)
 * ------------------------------------------------------------------------------
 * Bridge connecting PayOffFP client telemetry to PayOffSecurityGateway
 * Features:
 *  - Jittered exponential backoff for resilient telemetry
 *  - Hardware DNA anchor cookie for gateway verification
 *  - Device Trust Tiering (HIGH/STANDARD/LOW)
 *  - Async-safe device classification (GPU, cores, touch points, battery)
 *  - Cached device tier for repeated calls
 *  - Optional observability via attemptsUsed
 *  - Full inline documentation
 */

const PayOffFPBridge = {
    // --- Configuration ---
    _config: {
        endpoint: "/api/v1/security/fp-verify", // Server API endpoint
        nonce: null                              // Nonce issued by the server
    },

    // --- Retry / Backoff Config ---
    _maxRetries: 2,      // Maximum retry attempts
    _baseDelayMs: 300,   // Initial exponential backoff (ms)
    _maxBackoffMs: 5000, // Maximum backoff cap (ms)
    _maxJitterMs: 100,   // Maximum jitter (ms) to prevent synchronized retries

    // --- Cached Device Tier ---
    _cachedDeviceTier: null, // Stores result of device classification for session reuse

    /**
     * Initialize the bridge with server endpoint and nonce
     * @param {string} endpoint - Server API endpoint (must be valid URL)
     * @param {string} serverNonce - Nonce issued by the server
     * @throws Will throw an error if either argument is missing or endpoint is invalid
     */
    init(endpoint, serverNonce) {
        if (!endpoint || !serverNonce) {
            throw new Error("PayOffFPBridge.init requires both endpoint and serverNonce.");
        }

        try {
            new URL(endpoint); // Validate endpoint is a proper URL
        } catch (e) {
            throw new Error("PayOffFPBridge.init: Invalid endpoint URL");
        }

        this._config.endpoint = endpoint;
        this._config.nonce = serverNonce;
    },

    /**
     * Execute telemetry flow and determine device trust tier
     * Uses jittered exponential backoff to prevent server overload
     * @returns {Promise<Object>} Telemetry result including:
     *   - success {boolean}: telemetry passed
     *   - reason {string}: failure reason if any
     *   - trustLevel {string}: gateway-assigned trust (HIGH/STANDARD/LOW)
     *   - localTier {string}: local device trust tier
     *   - attemptsUsed {number}: number of telemetry attempts made
     */
    async sync() {
        // Helper for untrusted responses
        const untrusted = (reason, localTier = "LOW", attemptsUsed = 0) => ({
            success: false,
            reason,
            trustLevel: "UNTRUSTED",
            localTier,
            attemptsUsed
        });

        if (!window.PayOffFP || typeof window.PayOffFP.sendTelemetry !== "function") {
            console.error("PayOffFP baseline not found.");
            return untrusted("PAYOFF_FP_MISSING");
        }

        const { endpoint, nonce } = this._config;
        const localTier = this._cachedDeviceTier || await this._classifyDevice();
        if (!this._cachedDeviceTier) this._cachedDeviceTier = localTier; // Cache result

        // --- Retry loop with jittered exponential backoff ---
        // Timeline:
        // Attempt 0: 300ms + jitter
        // Attempt 1: 600ms + jitter
        // Attempt 2: 1200ms + jitter
        for (let attempt = 0; attempt <= this._maxRetries; attempt++) {
            try {
                // Fire telemetry to server
                const response = await window.PayOffFP.sendTelemetry(nonce, endpoint);
                const result = await response.json();

                if (!result || typeof result !== "object") throw new Error("INVALID_RESPONSE");

                if (result.success && result.fusedId) {
                    // Store secure anchor cookie for gateway verification
                    this._setAnchorCookie(result.fusedId);

                    // Determine gateway trust level
                    const allowed = ["STANDARD", "HIGH", "LOW"];
                    const trustLevel = allowed.includes(result.trustLevel) ? result.trustLevel : "STANDARD";

                    return { ...result, trustLevel, localTier, attemptsUsed: attempt + 1 };
                }

                // Telemetry failed, return untrusted
                console.warn("Security Alert:", result.reason || "UNKNOWN_REASON");
                return untrusted(result.reason || "UNKNOWN_REASON", localTier, attempt + 1);

            } catch (err) {
                if (attempt < this._maxRetries) {
                    // Compute exponential backoff + jitter
                    const expDelay = Math.min(this._baseDelayMs * Math.pow(2, attempt), this._maxBackoffMs);
                    const jitter = Math.random() * this._maxJitterMs;
                    const finalDelay = expDelay + jitter;

                    console.warn(`Telemetry attempt ${attempt + 1} failed. Retrying in ${Math.round(finalDelay)}ms...`, err);
                    await new Promise(res => setTimeout(res, finalDelay));
                } else {
                    console.error("PayOffFPBridge telemetry final failure:", err);
                    return untrusted("BRIDGE_ERROR", localTier, attempt + 1);
                }
            }
        }
    },

    /**
     * Sets a secure anchor cookie for 30 days.
     * Cookie is used by the gateway for hardware DNA verification
     * @param {string} fusedId - Hardware DNA identifier
     */
    _setAnchorCookie(fusedId) {
        if (!fusedId) return;

        const maxAgeSec = 30 * 24 * 60 * 60; // 30 days
        const date = new Date(Date.now() + maxAgeSec * 1000);

        document.cookie = [
            `payoff_anchor=${encodeURIComponent(fusedId)}`,
            `Max-Age=${maxAgeSec}`,
            `expires=${date.toUTCString()}`,
            "path=/",
            "Secure",
            "SameSite=Strict"
            // Uncomment HttpOnly if server-only access is sufficient
            // "HttpOnly"
        ].join("; ");
    },

    /**
     * Classifies the local device into a trust tier:
     *  - HIGH: multi-core, touch-capable, good GPU
     *  - STANDARD: typical desktop/laptop
     *  - LOW: virtual renderer, zero cores, very low battery, or suspicious configuration
     * @returns {Promise<string>} Device tier: "HIGH", "STANDARD", or "LOW"
     */
    async _classifyDevice() {
        try {
            // --- GPU / WebGL Renderer Check ---
            const canvas = document.createElement("canvas");
            const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
            let renderer = "";
            if (gl) {
                const debug = gl.getExtension("WEBGL_debug_renderer_info");
                if (debug) renderer = gl.getParameter(debug.UNMASKED_RENDERER_WEBGL).toLowerCase();
            }

            // --- CPU Core Count ---
            const cores = navigator.hardwareConcurrency || 0;

            // --- Touch Support ---
            const touchPoints = navigator.maxTouchPoints || 0;

            // --- Battery Level ---
            let batteryLevel = 1;
            if (navigator.getBattery) {
                try {
                    const battery = await navigator.getBattery();
                    batteryLevel = battery.level; // 0.0 - 1.0
                } catch (e) {
                    batteryLevel = 1; // default full if API fails
                }
            }

            // --- Classification Logic ---
            if (
                renderer.includes("swiftshader") ||
                renderer.includes("llvmpipe") ||
                cores === 0 ||
                batteryLevel < 0.15
            ) return "LOW";

            if (cores >= 4 && touchPoints > 0 && !renderer.includes("software")) return "HIGH";

            return "STANDARD";

        } catch (e) {
            // Fail-safe
            return "LOW";
        }
    }
};

/* --- Usage Example --- */
(async () => {
    PayOffFPBridge.init("/api/v1/security/fp-verify", "server_nonce_XYZ789");
    const result = await PayOffFPBridge.sync();
    console.log("Telemetry result:", result);
})();
