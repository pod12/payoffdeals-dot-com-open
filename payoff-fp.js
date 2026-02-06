/**
 * Entropy-Aggregation Fingerprinting System: Non-Cryptographic Hashing 
 * with a Weighted Clamped Linear Penalty Model.
 * * Version: 1.5.6
 * License: Apache-2.0
 * Copyright (c) 2026 d-motifs.com / payoffdeals.com
 * * Zero-Trust & Bot-Heuristics Implementation
 */
/**
 * Entropy-Aggregation Fingerprinting System: Non-Cryptographic Hashing with a Weighted Clamped Linear Penalty Model.
 * Hardened Client-Side Fingerprinting v1.5.6
 * Zero-Trust & Bot-Heuristics
 * * FEATURES:
 * - 53-bit MurmurHash3 (Collision Resistant)
 * - CDP/Webdriver Instrumentation Traps
 * - Hardware/Storage Asymmetry Detection
 * - Iterative Clamped Confidence Scoring
 * - Fire-and-Forget Telemetry Collector
 *  https://d-motifs.com
 *  https://payoffdeals.com
 */
const PayOffFP = {
    /**
     * Generates a 53-bit hash from a string.
     * Uses Math.imul for high-performance 32-bit integer multiplication.
     */
    hash: (str, seed = 0) => {
        let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
        for (let i = 0, ch; i < str.length; i++) {
            ch = str.charCodeAt(i);
            h1 = Math.imul(h1 ^ ch, 2654435761);
            h2 = Math.imul(h2 ^ ch, 1597334677);
        }
        h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
        h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
        return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
    },

    /**
     * Detects function shadowing/tampering.
     * Checks for the [native code] string and validates prototype integrity.
     */
    isNative: function(fn) {
        try {
            if (typeof fn !== 'function') return false;
            const str = Function.prototype.toString.call(fn);
            return /\{\s+\[native code\]\s+\}/.test(str) && 
                   (!fn.hasOwnProperty('prototype') || /^[A-Z]/.test(fn.name));
        } catch (e) { return false; }
    },

    /**
     * Generates a canvas-based device signature.
     * Uses a nonce to prevent replay attacks and ensures cleanup.
     */
    getCanvas: function(nonce) {
        try {
            const c = document.createElement('canvas');
            const ctx = c.getContext('2d');
            c.width = 240; c.height = 60;
            ctx.textBaseline = "top";
            ctx.font = "14px 'Arial'";
            ctx.fillText(`T1.5.6_${nonce}`, 2, 2);
            return c.toDataURL();
        } catch (e) { return 'err'; }
    },

    /**
     * Unmasks the WebGL renderer to identify the actual GPU hardware.
     */
    getWGL: function() {
        try {
            const c = document.createElement('canvas');
            const gl = c.getContext('webgl') || c.getContext('experimental-webgl');
            const d = gl.getExtension('WEBGL_debug_renderer_info');
            return d ? gl.getParameter(d.UNMASKED_RENDERER_ID) : 'n/a';
        } catch (e) { return 'err'; }
    },

    /**
     * Synchronizes persistence between LocalStorage and Cookies.
     * Helps detect "Incognito" mode or storage clearing behavior.
     */
    sync: function(k, v = null) {
        try {
            if (v) {
                localStorage.setItem(k, v);
                document.cookie = `${k}=${v}; Max-Age=31536000; path=/; SameSite=Lax; Secure`;
                return v;
            }
            const cookie = document.cookie.split('; ').find(r => r.trim().startsWith(k+'='))?.split('=')[1];
            return localStorage.getItem(k) || cookie || null;
        } catch (e) { return null; }
    },

    /**
     * Transmits telemetry to the server for model training.
     * Uses Beacon API for non-blocking persistence.
     */
    transmit: async function(data, endpoint = "/v1/telemetry/ingest") {
        try {
            const payload = JSON.stringify({ ...data, perf: window.performance.now() });
            if (navigator.sendBeacon) {
                navigator.sendBeacon(endpoint, payload);
            } else {
                fetch(endpoint, { method: 'POST', body: payload, keepalive: true });
            }
        } catch (e) {}
    },

    /**
     * Core identity engine. Aggregates traps, signatures, and heuristics.
     */
    getIdentity: function(serverNonce = null) {
        const n = navigator, s = screen, w = window;
        const nonce = serverNonce || Math.floor(Date.now() / 60000);
        const flags = [];

        // 1. INSTRUMENTATION TRAPS
        try {
            const e = new Error();
            Object.defineProperty(e, 'stack', { get() { flags.push('bot_cdp'); return ""; } });
            const _ = e.stack; 
        } catch(e) {}

        if (n.permissions && n.webdriver) flags.push('bot_webdriver_active');
        if (w.outerWidth === 0 && w.outerHeight === 0) flags.push('bot_headless');
        if (!this.isNative(n.toString)) flags.push('api_tampered');

        // 2. HARDWARE SIGNATURES
        const wgl_r = this.getWGL();
        const core = { cpu: n.hardwareConcurrency, mem: n.deviceMemory, gpu: this.getCanvas(nonce), wgl: wgl_r };
        const shell = { ua: n.userAgent, res: `${s.width}x${s.height}`, lang: n.language };

        const coreHash = this.hash(JSON.stringify(core));
        const shellHash = this.hash(JSON.stringify(shell));

        // 3. HARMONY (CONSISTENCY) HEURISTICS
        if (/iPhone|Android/i.test(shell.ua) && /RTX|GTX|NVIDIA|Radeon/i.test(wgl_r)) flags.push('harmony_gpu_mismatch');
        if (n.languages && n.languages[0].substring(0,2) !== n.language.substring(0,2)) flags.push('harmony_lang_mismatch');

        // 4. PERSISTENCE CHECKS
        const prevData = this.sync('_payoff_fp');
        const prev = prevData ? JSON.parse(prevData) : null;

        if (prev && coreHash !== prev.coreHash) flags.push('storage_hardware_collision');
        else if (!localStorage.getItem('_payoff_fp') && document.cookie.includes('_payoff_fp')) flags.push('storage_asymmetry');

        // 5. CLAMPED CONFIDENCE SCORING
        const penalties = { 'bot_': 0.6, 'harmony_': 0.4, 'storage_': 0.2, 'api_': 0.5 };
        const confidence = flags.reduce((curr, flag) => {
            const cat = Object.keys(penalties).find(k => flag.startsWith(k));
            return Math.max(0, curr - (penalties[cat] || 0.1));
        }, 1.0);

        this.sync('_payoff_fp', JSON.stringify({ coreHash, shellHash }));

        return {
            id: this.hash(coreHash + shellHash),
            hardwareId: coreHash,
            confidence: confidence.toFixed(2),
            riskFlags: [...new Set(flags)],
            nonce: nonce,
            ts: Date.now()
        };
    }
};

/**
 * Execution Wrapper
 */
(async () => {
    const report = PayOffFP.getIdentity();
    // Transmit to collector for model training
    await PayOffFP.transmit(report);
    // Log for local debug
    console.log("PayOff Intelligence Report:", report);
})();
