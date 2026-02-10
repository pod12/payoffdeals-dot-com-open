/**
 * PayOffPoW: v1.6.0
 * ---------------------------------
 * A privacy-first, memory-hard Proof of Work engine.
 * v1.6.0: Entropy hardening, Adaptive Progress, and Memory Safeguards.
 */

const PayOffPoW = {
    // REFINED: Maximum deterministic entropy for padding
    _getSafePad: (n, salt = "payoff_v1") => {
        const h = PayOffPoW.hash(n + salt);
        const hex = h.split('').filter(c => /[a-f0-9]/.test(c));
        if (hex.length === 0) return "0";
        
        // Ensure indices exist regardless of future hash length variations
        const head = parseInt(h.substring(0, 4) || "0", 16);
        const mid  = parseInt(h.substring(Math.floor(h.length/2) - 2, Math.floor(h.length/2) + 2) || "0", 16);
        const tail = parseInt(h.substring(h.length - 4) || "0", 16);
        
        const idx = (head ^ mid ^ tail) % hex.length;
        return hex[idx];
    },

    hash: (str, seed = 0) => {
        try {
            let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
            for (let i = 0, ch; i < str.length; i++) {
                ch = str.charCodeAt(i);
                h1 = Math.imul(h1 ^ ch, 2654435761);
                h2 = Math.imul(h2 ^ ch, 1597334677);
            }
            h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
            h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
            const res = (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
            return (!res || res === "h_err") ? "0000000000000000" : res;
        } catch (e) { return "0000000000000000"; }
    },

    solve: function(d, n, p, t, options = {}) {
        const { debug = false, onProgress = null } = options;
        const _d = parseInt(d) || 100000;
        const _p = Math.min(Math.max(parseInt(p) || 16, 8), 22);
        const _t = parseInt(t) || 0;
        const _n = (n && typeof n === 'string') ? n : "default_nonce";

        return new Promise(async (resolve) => {
            const mask = (1 << _p) - 1;
            const padChar = this._getSafePad(_n);
            
            // Environment checks: Browser vs Server
            const isBrowser = typeof window !== 'undefined' && typeof Worker !== 'undefined';
            
            if (isBrowser && typeof Blob !== 'undefined') {
                try {
                    // Worker Code Template
                    const workerCode = `const hash=${this.hash.toString()};self.onmessage=e=>{const{d,n,mask,t,padChar,report}=e.data;let rs=hash(n);const mem=new Uint32Array(mask+1);const step=Math.max(10,d/25|0);for(let i=0;i<d;i++){if(report&&i%step===0)self.postMessage({p:i/d});if(rs.length<16)rs=rs.padEnd(16,padChar);const h=((rs.charCodeAt(0)^rs.charCodeAt(4)^rs.charCodeAt(8)^rs.charCodeAt(12))<<12)|((rs.charCodeAt(1)^rs.charCodeAt(5)^rs.charCodeAt(9)^rs.charCodeAt(13))<<8)|((rs.charCodeAt(2)^rs.charCodeAt(6)^rs.charCodeAt(10)^rs.charCodeAt(14))<<4)|(rs.charCodeAt(3)^rs.charCodeAt(7)^rs.charCodeAt(11)^rs.charCodeAt(15));const m=(i^h)&mask;mem[m]=(i+(h^t))>>>0;rs=hash(rs+mem[m].toString(36))}self.postMessage({s:rs})}`;
                    
                    const blob = new Blob([workerCode], { type: 'application/javascript' });
                    const url = URL.createObjectURL(blob);
                    const worker = new Worker(url);

                    worker.onmessage = (e) => {
                        if (e.data.p !== undefined && onProgress) onProgress(e.data.p);
                        if (e.data.s) {
                            worker.terminate();
                            URL.revokeObjectURL(url);
                            resolve({ solution: e.data.s, worker: true });
                        }
                    };
                    worker.onerror = (err) => {
                        if (debug) console.warn("PayOffPoW: Worker failed, using sync.");
                        this._solveSync({ d: _d, n: _n, mask, t: _t, padChar }, onProgress).then(s => resolve({ solution: s, worker: false }));
                    };
                    worker.postMessage({ d: _d, n: _n, mask, t: _t, padChar, report: !!onProgress });
                    return;
                } catch (e) {
                    if (debug) console.warn("PayOffPoW: Worker init error.");
                }
            }

            // Node.js or older browser fallback
            const sol = await this._solveSync({ d: _d, n: _n, mask, t: _t, padChar }, onProgress);
            resolve({ solution: sol, worker: false });
        });
    },

    _solveSync: async function(c, onProgress) {
        let rs = this.hash(c.n);
        const mem = new Uint32Array(c.mask + 1);
        const yieldFreq = c.d > 500000 ? 250 : 1500; 
        const progressStep = Math.max(10, c.d / 25 | 0);
        
        for (let i = 0; i < c.d; i++) {
            if (i % yieldFreq === 0) {
                if (onProgress && i % progressStep === 0) onProgress(i / c.d);
                await new Promise(r => setTimeout(r, 0));
            }
            if (rs.length < 16) rs = rs.padEnd(16, c.padChar);
            const hInt = ((rs.charCodeAt(0)^rs.charCodeAt(4)^rs.charCodeAt(8)^rs.charCodeAt(12)) << 12) | 
                         ((rs.charCodeAt(1)^rs.charCodeAt(5)^rs.charCodeAt(9)^rs.charCodeAt(13)) << 8)  | 
                         ((rs.charCodeAt(2)^rs.charCodeAt(6)^rs.charCodeAt(10)^rs.charCodeAt(14)) << 4) | 
                          (rs.charCodeAt(3)^rs.charCodeAt(7)^rs.charCodeAt(11)^rs.charCodeAt(15));
            const mIdx = (i ^ hInt) & c.mask;
            mem[mIdx] = (i + (hInt ^ c.t)) >>> 0;
            rs = this.hash(rs + mem[mIdx].toString(36));
        }
        return rs;
    }
};

/*
(function() {
    // 1. Private Configuration (Injected by server)
    const config = {
        d: 120000,
        n: "NONCE_" + btoa(Math.random()).substring(0, 12),
        p: 16,
        t: 42
    };

    // 2. Private DOM Selectors
    const UI = {
        label: document.getElementById('status-label'),
        percent: document.getElementById('status-percent'),
        bar: document.getElementById('progress-bar')
    };

    // 3. The Execution Logic
    const initVerification = async () => {
        try {
            if (UI.label) UI.label.innerText = "Securing connection...";

            // Solve PoW
            const result = await PayOffPoW.solve(config.d, config.n, config.p, config.t, {
                debug: false, // Turn off in production
                onProgress: (p) => {
                    const percent = Math.round(p * 100);
                    if (UI.bar) UI.bar.style.width = percent + "%";
                    if (UI.percent) UI.percent.innerText = percent + "%";
                }
            });

            if (UI.label) UI.label.innerText = "Verifying with server...";

            // 4. Internal Submission Helper
            const response = await fetch('/api/verify-pow', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    solution: result.solution,
                    nonce: config.n,
                    d: config.d,
                    p: config.p
                })
            });

            if (response.ok) {
                window.location.href = "/protected-content";
            } else {
                throw new Error("Validation Failed");
            }

        } catch (err) {
            console.error("PoW Error:", err);
            if (UI.label) UI.label.innerText = "Verification failed. Please refresh.";
            alert("Security check failed. Bots are not allowed.");
        }
    };

    // 5. Trigger on Load
    if (document.readyState === 'complete') {
        initVerification();
    } else {
        window.addEventListener('load', initVerification);
    }

})();
*/
