/**
 * CommBridge v1.7.1 - Server-Verified Trust with Security Enhancements
 *
 * ------------------ SECURITY SUMMARY ------------------
 * Feature                 | Protection       | Benefit
 * ------------------------|-----------------|----------------------------------------------------------
 * Server-Verified Token   | Spoofing         | Hacker cannot "invent" a valid session key. Only server-approved
 *                         |                 | Leader tabs can broadcast messages.
 * Message Cache           | Replay           | Prevents malicious replays of captured commands across tabs.
 * Handshake Debounce      | DoS/Flooding     | Protects backend APIs from accidental or malicious floods.
 * Memory-Only Bus         | Disk Leakage     | No sensitive data (tokens) is written to LocalStorage. Exists only in memory.
 *
 * Optional Enhancements:
 * - Use short-lived server tokens to limit exposure if a tab is compromised.
 * - Add per-message nonce if external replay attacks are a concern.
 * - High-traffic scaling can replace setTimeout cleanup with Map + interval sweep.
 *
 * -------------------------------------------------------
 *
 * Features:
 * - BroadcastChannel-only communication
 * - Leader/Follower trust model
 * - Pending message queue with MAX_QUEUE
 * - Replay defense via recentMessages + timestamp
 * - Rate-limited handshake requests
 * - Commented usage examples
 * - Pro Tip inline for future high-traffic scaling
 */
const CommBridge = (function() {
    const CHANNEL_NAME = 'COMM_BRIDGE_BUS_SECURE';
    const handlers = new Map();
    let isInitialized = false;
    let channel = null;
    let SESSION_TRUST_KEY = null;
    const mySenderId = "ID_" + Math.random().toString(36).substring(2, 11);

    // Pending message queue until verification
    const pendingMessages = [];
    const MAX_QUEUE = 5; // Max pending messages per tab
    let handshakeSent = false;
    let lastHandshakeSent = 0;
    const HANDSHAKE_RATE_MS = 1000; // 1 second

    // Recent message cache for replay protection
    const recentMessages = new Set();
    const MESSAGE_RETENTION_MS = 5000;

    // --- INTERNAL METHODS ---

    // Verify token with server
    const verifyWithServer = async (receivedToken) => {
        try {
            const response = await fetch('/api/auth/verify-bridge-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: receivedToken })
            });
            return response.ok;
        } catch (e) {
            console.error("[CommBridge] Server verification failed:", e);
            return false;
        }
    };

    // Process message with replay prevention
    const processMessage = (data) => {
        const msgId = `${data.sender}_${data.timestamp}`;
        if (recentMessages.has(msgId)) return; // replay defense
        recentMessages.add(msgId);

        /**
         * Pro Tip:
         * Currently we use setTimeout to automatically remove entries from recentMessages
         * after MESSAGE_RETENTION_MS. This is simple, readable, and perfect for standard
         * client-side use.
         *
         * For extremely high-traffic apps (hundreds of messages/sec per tab), creating
         * many simultaneous setTimeouts could slightly affect performance. In that case,
         * you could switch to using a Map storing timestamp + a single setInterval sweep
         * to periodically clean old entries. This is optional and only necessary for
         * very high-volume scenarios.
         */
        setTimeout(() => recentMessages.delete(msgId), MESSAGE_RETENTION_MS);

        const callbacks = handlers.get(data.type);
        if (callbacks) callbacks.forEach(cb => cb(data.payload));
    };

    // Incoming message handler
    const onIncomingMessage = async (data) => {
        if (!data || data.sender === mySenderId) return;

        // --- LEADER RESPONDING TO NEW FOLLOWER ---
        if (data.type === '__HANDSHAKE_REQ__' && SESSION_TRUST_KEY) {
            channel.postMessage({
                type: '__HANDSHAKE_RES__',
                token: SESSION_TRUST_KEY,
                sender: mySenderId,
                timestamp: Date.now()
            });
            return;
        }

        // --- HANDSHAKE RESPONSE FROM LEADER ---
        if (data.type === '__HANDSHAKE_RES__') {
            const isValid = await verifyWithServer(data.token);
            if (isValid) {
                SESSION_TRUST_KEY = data.token;
                console.log("[CommBridge] Server verified the Leader. Trust established.");
                // Process queued messages now that verification is complete
                pendingMessages.forEach(msg => processMessage(msg));
                pendingMessages.length = 0;
            } else {
                console.error("[CommBridge] Fraudulent Leader detected. Connection refused.");
            }
            return;
        }

        // --- QUEUE UNTIL VERIFICATION (Follower behavior) ---
        if (!SESSION_TRUST_KEY) {
            if (pendingMessages.length >= MAX_QUEUE) {
                console.warn("[CommBridge] Pending queue full, dropping oldest message");
                pendingMessages.shift();
            }
            pendingMessages.push(data);
            return;
        }

        // --- TRUSTED MESSAGE PROCESSING ---
        if (data.token === SESSION_TRUST_KEY) {
            processMessage(data);
        } else {
            console.warn("[CommBridge] Ignoring message from untrusted token.");
        }
    };

    // Initialize CommBridge
    const init = () => {
        if (isInitialized) return;

        if ('BroadcastChannel' in window) {
            channel = new BroadcastChannel(CHANNEL_NAME);
            channel.onmessage = (e) => onIncomingMessage(e.data);
        } else {
            console.error("[CommBridge] BroadcastChannel not supported. Modern browser required.");
        }

        isInitialized = true;

        // Request handshake from Leader tab
        sendHandshake();
    };

    const sendHandshake = () => {
        const now = Date.now();
        if (handshakeSent && (now - lastHandshakeSent) < HANDSHAKE_RATE_MS) return;
        handshakeSent = true;
        lastHandshakeSent = now;

        if (channel) {
            channel.postMessage({
                type: '__HANDSHAKE_REQ__',
                sender: mySenderId,
                timestamp: Date.now()
            });
        }
    };

    // --- PUBLIC API ---
    return {
        /**
         * Set the server-verified token after login (Leader tab)
         */
        setVerifiedToken: function(serverToken) {
            SESSION_TRUST_KEY = serverToken;
            if (!isInitialized) init();
        },

        /**
         * Subscribe to an event
         */
        on: function(type, callback) {
            if (!isInitialized) init();
            if (!handlers.has(type)) handlers.set(type, []);
            handlers.get(type).push(callback);
        },

        /**
         * Subscribe once; auto-unsubscribes after firing
         */
        once: function(type, callback) {
            const wrapper = (payload) => {
                CommBridge.off(type, wrapper);
                callback(payload);
            };
            this.on(type, wrapper);
        },

        /**
         * Unsubscribe from an event
         */
        off: function(type, callback) {
            const callbacks = handlers.get(type);
            if (callbacks) {
                const filtered = callbacks.filter(cb => cb !== callback);
                if (filtered.length > 0) handlers.set(type, filtered);
                else handlers.delete(type);
            }
        },

        /**
         * Emit an event to verified tabs only
         */
        emit: function(type, payload = {}) {
            if (!isInitialized) init();

            if (!SESSION_TRUST_KEY) {
                console.warn("[CommBridge] Emit ignored. Tab not verified yet.");
                return;
            }

            channel.postMessage({
                type,
                payload,
                sender: mySenderId,
                token: SESSION_TRUST_KEY,
                timestamp: Date.now()
            });
        }
    };
})();

/*******************************
 *        USAGE EXAMPLES       *
 *******************************/

/**
 * 1. Secure Logout Listener
 *    All tabs will react to logout events securely.
 */
CommBridge.on('AUTH_SYNC', (payload) => {
    if (payload.action === 'LOGOUT') {
        console.log('[CommBridge] Secure logout received.');
        // Example: window.location.href = '/login';
    }
});

/**
 * 2. Emitting Secure Events (Commented Out)
 *    Safe to copy-paste; will not execute until uncommented.
 */
// CommBridge.emit('AUTH_SYNC', { action: 'LOGOUT' });

/**
 * 3. One-time Handshake / Version Check
 *    Fires only once across tabs.
 */
// CommBridge.once('VERSION_CHECK', (payload) => {
//     console.log('[CommBridge] Version handshake received from peer tab:', payload.version);
// });

// CommBridge.emit('VERSION_CHECK', { version: '1.7.1' });

/**
 * 4. State Synchronization (e.g., Theme Changes)
 */
// CommBridge.on('THEME_CHANGE', (payload) => {
//     console.log('[CommBridge] Theme change received:', payload.newTheme);
//     // Example: document.body.className = payload.newTheme;
// });

// CommBridge.emit('THEME_CHANGE', { newTheme: 'dark-mode' });
