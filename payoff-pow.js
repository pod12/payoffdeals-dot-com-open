/**
 * PayOffPoW v7.5.4 - "Omni Titan" (Hardened Production)
 * * Features:
 * - Singleton Guard: Prevents multiple concurrent workers.
 * - Clock-Skew Leeway: 5-minute tolerance for client system clocks.
 * - Deterministic SHA-256 Reset: Zeroes "Ghost State" to prevent collisions.
 * * Implementation: Created & curated with Gemini 3 Flash & ChatGPT guidance.
 * Attribution: Original PoW design adapted & optimized by user + Gemini + ChatGPT.
 */

const PayOffPoW = (function() {
    let activeWorker = null; // The Singleton Guard

    const workerCode = `
        importScripts('https://cdn.jsdelivr.net/npm/tweetnacl@1.0.3/nacl-fast.min.js');

        const Engine = {
            _compress: (block, ref) => {
                for (let i = 0; i < 8; i++) {
                    let a = block[i], b = ref[i], c = block[i + 8], d = ref[i + 8];
                    a = (a + b) >>> 0; a = Math.imul(a, (b | 1)) >>> 0;
                    d ^= a; d = (d << 16) | (d >>> 16);
                    c = (c + d) >>> 0; c = Math.imul(c, (d | 1)) >>> 0;
                    b ^= c; b = (b << 12) | (b >>> 20);
                    a = (a + b) >>> 0; d ^= a; d = (d << 8) | (d >>> 24);
                    c = (c + d) >>> 0; b ^= c; b = (b << 7) | (b >>> 25);
                    block[i] = a; block[i + 8] = c; ref[i] = b; ref[i + 8] = d;
                }
            },

            solve: async function(ticket, pubKey, replayToken, config = {}) {
                const parts = ticket.split('.');
                if(parts.length !== 5) throw new Error("MALFORMED_TICKET");
                const [nonce, dStr, pStr, expStr, sigHex] = parts;
                const d = parseInt(dStr, 10);
                const p = parseInt(pStr, 10);
                const exp = parseInt(expStr, 10);

                // Verification with 5-minute clock leeway
                const msg = new TextEncoder().encode(\`\${nonce}.\${d}.\${p}.\${exp}\`);
                const sig = new Uint8Array(sigHex.match(/.{1,2}/g).map(b => parseInt(b, 16)));
                if(!nacl.sign.detached.verify(msg, sig, pubKey)) throw new Error("AUTH_FAILED");
                if(exp + 300000 < Date.now()) throw new Error("EXPIRED");

                let _p = Math.min(p, 22);
                let memory, memSize;
                while(_p >= 14){
                    try { memSize = 1 << _p; memory = new Uint32Array(memSize * 16); break; }
                    catch(e){ _p--; }
                }
                if(!memory) throw new Error("HARDWARE_LIMIT");

                const mask = memSize - 1;
                let block = new Uint32Array(16);

                const seedData = \`\${nonce}:\${(replayToken || '').slice(0, 64)}\`;
                const seed = new TextEncoder().encode(seedData);
                for(let i=0; i < seed.length && i < 64; i++) block[i >> 2] |= seed[i] << ((i % 4) * 8);

                // Warming
                for(let pass=0; pass < 4; pass++){
                    for(let i=0; i < memSize; i++){
                        const target = (pass % 2 === 0) ? i : (memSize - 1 - i);
                        const refOff = ((i * (pass + 3)) & mask) * 16;
                        this._compress(block, memory.subarray(refOff, refOff + 16));
                        memory.set(block, target * 16);
                    }
                }

                const yieldFreq = config.yieldFreq || 2048;
                for(let i=0; i < d; i++){
                    const idxs = [(block[0] ^ block[15]) & mask, (block[4] ^ block[11]) & mask, (block[8] ^ block[3]) & mask];
                    for(const idx of idxs){
                        const offset = idx * 16;
                        this._compress(block, memory.subarray(offset, offset + 16));
                        const rot = block[0] & 15;
                        const mut = new Uint32Array(16);
                        for(let j=0; j < 16; j++) mut[j] = block[(j + rot) & 15] ^ i;
                        memory.set(mut, offset);
                    }

                    if(i % 128 === 0){
                        const h = await crypto.subtle.digest('SHA-256', block.buffer);
                        const hBytes = new Uint8Array(h);
                        for(let j=0; j < 8; j++) block[j] = hBytes[j*4] | (hBytes[j*4+1]<<8) | (hBytes[j*4+2]<<16) | (hBytes[j*4+3]<<24);
                        for(let j=8; j < 16; j++) block[j] = 0;
                    }

                    if(i % yieldFreq === 0) await new Promise(r => setTimeout(r, 0));
                    if(i % Math.max(1, Math.floor(d/100)) === 0) self.postMessage({type:'PROGRESS', val: i / d});
                }

                const final = await crypto.subtle.digest('SHA-256', block.buffer);
                return { solution: Array.from(new Uint8Array(final)).map(b => b.toString(16).padStart(2,'0')).join(''), pUsed: _p };
            }
        };

        self.onmessage = async (e) => {
            try {
                const res = await Engine.solve(e.data.ticket, e.data.pubKey, e.data.replayToken, e.data.config);
                self.postMessage({ type: 'SUCCESS', ...res });
            } catch(err) {
                self.postMessage({ type: 'ERROR', msg: err.message });
            }
        };
    `;

    return {
        SERVER_PUB_KEY: new Uint8Array([/* YOUR_KEY_HERE */]),

        solve: function(ticket, onProgress, replayToken, config = {}) {
            if (activeWorker) return { promise: Promise.reject(new Error("BUSY")), terminate: () => {} };

            let url = null;
            const promise = new Promise((resolve, reject) => {
                if(typeof nacl === 'undefined') return reject(new Error("nacl missing"));
                const blob = new Blob([workerCode], { type:'application/javascript' });
                url = URL.createObjectURL(blob);
                activeWorker = new Worker(url);

                activeWorker.onmessage = (e) => {
                    if(e.data.type === 'PROGRESS') onProgress?.(e.data.val);
                    else if(e.data.type === 'SUCCESS') { cleanup(); resolve(e.data); }
                    else if(e.data.type === 'ERROR') { cleanup(); reject(new Error(e.data.msg)); }
                };

                const cleanup = () => {
                    if(activeWorker) { activeWorker.terminate(); activeWorker = null; }
                    if(url) { URL.revokeObjectURL(url); url = null; }
                };

                activeWorker.onerror = (err) => { cleanup(); reject(err); };
                activeWorker.postMessage({ ticket, pubKey: this.SERVER_PUB_KEY, replayToken, config });
            });

            return { promise, terminate: () => { if(activeWorker) { activeWorker.terminate(); activeWorker = null; } } };
        }
    };
})();
