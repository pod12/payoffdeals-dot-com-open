/**
 * PayOffFP - v2.8.6 - Extended
 * Fully hardened baseline with progressive telemetry support
 */
(function(root) {
    const PayOffFP = {
        _s: 0x41c6ce57, // Build-time seed
        _cache: {},      // nonce-aware cache

        /**
         * Hardened Murmur3-style hash
         * Handles strings and numeric TypedArrays
         */
        h: function(str, seed = this._s) {
            let h1 = seed ^ 0xdeadbeef, h2 = seed ^ 0x41c6ce57;
            for (let i = 0, ch; i < str.length; i++) {
                ch = typeof str[i] === "number"
                     ? (Math.floor(str[i] * 1e6) | 0) // signed 32-bit parity
                     : str.charCodeAt(i);
                h1 = Math.imul(h1 ^ ch, 2654435761);
                h2 = Math.imul(h2 ^ ch, 1597334677);
            }
            h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
            h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
            return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
        },

        /**
         * Integrity checks for native APIs
         */
        gI: function() {
            const check = (proto, method) => {
                try {
                    const desc = Object.getOwnPropertyDescriptor(proto, method);
                    return desc && !desc.get && !desc.set &&
                           /\{\s+\[native code\]\s+\}/.test(Function.prototype.toString.call(proto[method]));
                } catch (e) { return false; }
            };
            return {
                c2d: check(CanvasRenderingContext2D.prototype, 'getImageData'),
                wgl: check(WebGLRenderingContext.prototype, 'getParameter'),
                actx: window.AudioContext ? check(window, 'AudioContext') : true,
                anod: window.AudioBufferSourceNode ? check(AudioBufferSourceNode.prototype, 'start') : true
            };
        },

        /**
         * Canvas fingerprinting
         */
        gC: function() {
            try {
                const c = document.createElement('canvas');
                const x = c.getContext('2d');
                const dpr = window.devicePixelRatio || 1;
                c.width = 150 * dpr; c.height = 50 * dpr;
                x.scale(dpr, dpr);
                x.font = "14pt 'Arial'";
                x.textBaseline = "top";
                const a = 0.05, s = 1.1;
                const cos = Math.cos(a), sin = Math.sin(a);
                x.setTransform(s * cos, s * sin, -s * sin, s * cos, 2, 2);
                x.fillText("PayOff_v2.8.6", 5, 5);
                const data = x.getImageData(0, 0, 150 * dpr, 50 * dpr).data;
                return { h: this.h(data), d: dpr };
            } catch (e) { return { h: 'c_err', d: 1 }; }
        },

        /**
         * Audio fingerprinting
         */
        gA: async function() {
            if (!(window.OfflineAudioContext || window.webkitOfflineAudioContext)) return 'no_audio';
            try {
                const x = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, 44100, 44100);
                const o = x.createOscillator();
                const c = x.createDynamicsCompressor();
                o.type = 'sawtooth';
                c.threshold.value = -40;
                o.connect(c); c.connect(x.destination);
                o.start(0);
                const b = await x.startRendering();
                const d = b.getChannelData(0);

                // Merge slices safely
                const s1 = d.slice(0, 50);
                const s2 = d.slice(Math.floor(d.length/2), Math.floor(d.length/2)+50);
                const s3 = d.slice(-50);
                let offset = 0;
                const combined = new Float32Array(s1.length + s2.length + s3.length);
                combined.set(s1, offset); offset += s1.length;
                combined.set(s2, offset); offset += s2.length;
                combined.set(s3, offset);

                return this.h(combined);
            } catch (e) { return 'a_err'; }
        },

        /**
         * GPU fingerprinting
         */
        gG: function() {
            try {
                const c = document.createElement('canvas');
                const g = c.getContext('webgl') || c.getContext('experimental-webgl');
                if (!g) return { r: 'gpu_unavailable', ex: 'gpu_unavailable' };
                const d = g.getExtension('WEBGL_debug_renderer_info');
                const e = g.getSupportedExtensions() || [];
                const renderer = d ? g.getParameter(d.UNMASKED_RENDERER_ID).toString().toLowerCase().trim().replace(/\s+/g,' ') : 'n/a';
                return { r: renderer, ex: this.h(e.sort().join(',')) };
            } catch (e) { return { r: 'err', ex: 'err' }; }
        },

        /**
         * Main identity generator
         */
        getIdentity: async function(nonce = "") {
            // Use cache if available for this nonce
            if (nonce && this._cache[nonce]) return this._cache[nonce];

            const [canvasObj, audio, integrity] = await Promise.all([this.gC(), this.gA(), this.gI()]);
            const gpu = this.gG();
            const n = navigator;
            const anomalies = [];

            if (Object.values(integrity).includes(false)) anomalies.push('api_tamper');
            if (gpu.r.includes('err') || canvasObj.h.includes('err') || audio.includes('err')) anomalies.push('subsystem_err');

            const fusedId = this.h([canvasObj.h, audio, gpu.r, gpu.ex, nonce].join('|'));

            const identity = {
                fusedId,
                integrity,
                anomalies,
                components: {
                    c: canvasObj.h,
                    a: audio,
                    r: gpu.r,
                    e: gpu.ex,
                    dpr: canvasObj.d,
                    cores: n.hardwareConcurrency || 0,
                    mem: n.deviceMemory || 0
                },
                ts: Date.now()
            };

            if (nonce) this._cache[nonce] = identity; // cache for nonce

            return identity;
        },

        /**
         * Multi-stage telemetry sender
         */
        sendTelemetry: async function(nonce, endpoint) {
            const gpuPromise = Promise.resolve(this.gG());
            const canvasPromise = Promise.resolve(this.gC());
            const audioPromise = this.gA();

            // Fast path: send GPU + Canvas immediately
            Promise.all([canvasPromise, gpuPromise]).then(([canvas, gpu]) => {
                fetch(endpoint + '/partial', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ c: canvas.h, r: gpu.r, ts: Date.now() })
                }).catch(() => {});
            });

            // Final path: full fusedId after Audio completes
            const result = await this.getIdentity(nonce);
            return fetch(endpoint + '/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(result)
            });
        }
    };

    root.PayOffFP = PayOffFP;
})(window);

/*
async function sendFingerprint() {
    const serverNonce = "session_abc123"; // From server
    const endpoint = "/api/v1";

    // Recommened: Use the built-in telemetry flow
    // This fires /partial (fast) AND returns the promise for /verify (final)
    try {
        const response = await PayOffFP.sendTelemetry(serverNonce, endpoint);
        const data = await response.json();
        
        if (data.status === "VERIFIED") {
            console.log("Identity Locked:", data.fusedId);
        } else {
            console.warn("Anomalies detected:", data.anomalies);
        }
    } catch (err) {
        console.error("Telemetry failed:", err);
    }
}
*/

