(function() {
    "use strict";
    if (window !== window.top) return;

    class SiteGuardian {
        constructor(config = {}) {
            // --- Config & Whitelist Normalization ---
            const rawWhitelist = [
                window.location.hostname,
                'cdnjs.cloudflare.com', 'cdn.jsdelivr.net'
            ].concat(config.whitelist || []);

            this.config = Object.freeze({
                learningMode: config.learningMode ?? true,
                whitelist: new Set(rawWhitelist.map(d => d.toLowerCase())),
                storageKey: "site_guardian_status",
                reportEndpoint: config.reportEndpoint || "/api/security-logs"
            });

            // --- State ---
            this.state = {
                isEnabled: localStorage.getItem(this.config.storageKey) === "enabled",
                scannedCount: 0,
                uniqueViolations: new Set(),
                observedShadowRoots: new WeakSet(),
                pendingNodes: [],
                firstCriticalAlertShown: false
            };

            this.init();
        }

        init() {
            if (this.state.isEnabled) {
                this.startObserving();
                this.processQueue();
            }
            if (document.readyState === "loading") {
                document.addEventListener("DOMContentLoaded", () => this.setupUI());
            } else {
                this.setupUI();
            }
        }

        // --- Core Monitoring ---
        startObserving() {
            this.mainObserver = new MutationObserver(muts => {
                for (const m of muts) {
                    if (m.addedNodes.length) {
                        for (const node of m.addedNodes) {
                            if (this.isCriticalNode(node)) this.inspectNode(node);
                            else this.state.pendingNodes.push(node);
                        }
                    }
                    if (m.type === "attributes") this.inspectNode(m.target);
                }
            });

            this.mainObserver.observe(document.documentElement, {
                childList: true, 
                subtree: true, 
                attributes: true,
                attributeFilter: ['src', 'href', 'onclick', 'onerror', 'onload']
            });
        }

        isCriticalNode(node) {
            if (!node || node.nodeType !== 1) return false;
            return ['script', 'iframe', 'embed', 'object', 'form'].includes(node.tagName.toLowerCase());
        }

        // --- Refined Asynchronous Queue (Stack-Safe) ---
        processQueue() {
            const work = (deadline) => {
                // Process while there is idle time or using the fallback (no deadline)
                while (((deadline && deadline.timeRemaining() > 0) || !deadline) && this.state.pendingNodes.length) {
                    this.inspectNode(this.state.pendingNodes.shift());
                }
                
                // Schedule next tick
                if (window.requestIdleCallback) {
                    requestIdleCallback(work);
                } else {
                    setTimeout(() => work(), 50);
                }
            };
            
            // Kick off the initial loop
            if (window.requestIdleCallback) {
                requestIdleCallback(work);
            } else {
                setTimeout(() => work(), 50);
            }
        }

        inspectNode(node) {
            if (!node || node.nodeType !== 1) return;
            this.state.scannedCount++;

            if (node.shadowRoot) this.observeShadow(node.shadowRoot);

            const src = (node.getAttribute("src") || node.getAttribute("href") || "").trim();
            if (src) this.validateURL(src, node);

            this.analyzeInlineScripts(node);
        }

        observeShadow(shadowRoot) {
            if (this.state.observedShadowRoots.has(shadowRoot)) return;
            this.state.observedShadowRoots.add(shadowRoot);

            Array.from(shadowRoot.children).forEach(c => this.inspectNode(c));

            const shadowObserver = new MutationObserver(muts => {
                for (const m of muts) {
                    if (m.addedNodes) m.addedNodes.forEach(n => this.inspectNode(n));
                    if (m.type === "attributes") this.inspectNode(m.target);
                }
            });

            shadowObserver.observe(shadowRoot, {
                childList: true, 
                subtree: true, 
                attributes: true,
                attributeFilter: ['src', 'href', 'onclick', 'onerror', 'onload']
            });
        }

        validateURL(src, node) {
            if (src.startsWith('/') && !src.startsWith('//')) return;

            try {
                const url = new URL(src, window.location.origin);
                const host = url.hostname.toLowerCase();
                const isSafe = [...this.config.whitelist].some(d => host === d || host.endsWith("." + d));
                
                if (!isSafe) {
                    this.triggerViolation(host, "Unauthorized_Domain", node);
                }
            } catch {
                if (src.length > 0 && !src.startsWith('#')) {
                    this.triggerViolation("Protocol", "Suspicious_URI", node);
                }
            }
        }

        analyzeInlineScripts(node) {
            for (const attr of node.attributes) {
                if (attr.name.startsWith("on")) {
                    const val = attr.value.toLowerCase();
                    const patterns = ["eval", "atob", "cookie", "document.write", "fetch"];
                    if (patterns.some(p => val.includes(p))) {
                        this.triggerViolation(`${node.tagName}:${attr.name}`, "Insecure_Handler", node);
                    }
                }
            }
        }

        triggerViolation(detail, type, node) {
            const id = `${type}:${detail}`;
            if (this.state.uniqueViolations.has(id)) return;
            this.state.uniqueViolations.add(id);

            this.reportToServer(type, detail);

            // User Alert for the first high-risk event
            if (!this.state.firstCriticalAlertShown && this.isCriticalNode(node)) {
                this.state.firstCriticalAlertShown = true;
                alert(`🛡️ PayOffGuardian Alert\nType: ${type}\nSource: ${detail}\nProtection: Active`);
            }

            if (this.config.learningMode) {
                console.warn(`[Guardian] Learning Mode: Block prevented for ${type} (${detail})`);
                return;
            }

            if (node && node.remove) node.remove();
            if (type === "Unauthorized_Domain") this.revokeDomain(detail);
            this.showToast(`Blocked: ${type}`);
        }

        revokeDomain(domain) {
            if (navigator.serviceWorker?.controller) {
                navigator.serviceWorker.controller.postMessage({ action: "REVOKE_DOMAIN", domain });
            }
        }

        reportToServer(type, detail) {
            const payload = JSON.stringify({ type, detail, ts: Date.now(), url: window.location.href });
            if (navigator.sendBeacon) navigator.sendBeacon(this.config.reportEndpoint, payload);
        }

        // --- UI Components ---
        setupUI() {
            if (!localStorage.getItem(this.config.storageKey)) this.showConsentBanner();
        }

        showConsentBanner() {
            const banner = document.createElement("div");
            Object.assign(banner.style, {
                position: "fixed", bottom: "0", left: "0", right: "0", background: "#1a1a1a",
                color: "white", padding: "16px", display: "flex", justifyContent: "space-between", 
                zIndex: "2147483647", fontFamily: "sans-serif", borderTop: "2px solid #2ecc71"
            });
            banner.innerHTML = `<span>🛡️ <b>PayOffGuardian:</b> Hardened security is available. Enable?</span>
                <div><button id="g-ign" style="background:transparent; color:#bbb; border:none; cursor:pointer;">Ignore</button>
                <button id="g-en" style="background:#2ecc71; color:white; border:none; padding:8px 16px; border-radius:4px; margin-left:15px; cursor:pointer; font-weight:bold;">Enable Protection</button></div>`;
            document.body.appendChild(banner);
            banner.querySelector("#g-ign").onclick = () => banner.remove();
            banner.querySelector("#g-en").onclick = () => {
                localStorage.setItem(this.config.storageKey, "enabled");
                location.reload();
            };
        }

        showToast(msg) {
            const t = document.createElement("div");
            t.innerText = `🛡️ ${msg}`;
            Object.assign(t.style, {
                position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)",
                background: "#e74c3c", color: "white", padding: "12px 24px", borderRadius: "8px",
                zIndex: "2147483647", boxShadow: "0 4px 12px rgba(0,0,0,0.3)", fontFamily: "sans-serif"
            });
            document.body.appendChild(t);
            setTimeout(() => t.remove(), 5000);
        }
    }

    window.Guardian = new SiteGuardian();
})();
