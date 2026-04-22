importScripts('browser-polyfill.min.js'); 

let stats = { internal: 0, external: 0 };
let countedHostnames = new Set(); 

let gatekeeperHistory = [];
const MAX_HISTORY = 50;

// 1. Sync from storage on startup so we don't start at 0
browser.storage.local.get(["trafficStats", "seenHostnames"]).then(data => {
    if (data.trafficStats) stats = data.trafficStats;
    if (data.seenHostnames) countedHostnames = new Set(data.seenHostnames);
});

browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

browser.webRequest.onBeforeRequest.addListener(
    (details) => {
        // Essential: Don't skip if initiator is missing (e.g. direct typing in URL bar)
        const sourceHost = details.initiator ? new URL(details.initiator).hostname : "direct-entry";
        
        try {
            const url = new URL(details.url);
            const destHost = url.hostname;
            const isThirdParty = sourceHost !== "direct-entry" && sourceHost !== destHost;

            // --- A. STATISTICS LOGIC (Once per session per domain) ---
            if (!countedHostnames.has(destHost)) {
                countedHostnames.add(destHost);
                if (isThirdParty) { stats.external++; } 
                else { stats.internal++; }

                // Save both so they stay in sync after a service worker restart
                browser.storage.local.set({ 
                    trafficStats: stats,
                    seenHostnames: Array.from(countedHostnames) 
                });
                
                browser.runtime.sendMessage({ type: "UPDATE_STATS", payload: stats }).catch(() => {});
            }

            // --- B. UI REPORTING (Always fire these!) ---
            // We move these OUT of the 'countedHostnames' check so the panel stays "Live"
            
            // 1. Send to Trace View
            browser.runtime.sendMessage({
                type: "RENDER_TRACE",
                payload: {
                    method: details.method,
                    destination: destHost,
                    resourceType: details.type
                }
            }).catch(() => {});

            // 2. Send to Gatekeeper View (If 3rd party)
            if (isThirdParty) {
                const payload = { source: sourceHost, destination: destHost, id: Date.now() };
                
                // 1. Save to history buffer
                gatekeeperHistory.unshift(payload); 
                if (gatekeeperHistory.length > MAX_HISTORY) gatekeeperHistory.pop();

                // 2. Try to send live (will fail silently if panel is closed)
                browser.runtime.sendMessage({
                    type: "RENDER_GATEKEEPER",
                    payload: payload
                }).catch(() => {});
            }

        } catch (e) {
            // URL parsing might fail on chrome:// or data: urls
        }
    },
    { urls: ["<all_urls>"] }
);

// --- 2. MESSAGE LISTENERS ---
browser.runtime.onMessage.addListener((msg) => {
    if (msg.type === "ADJUST_STATS") {
        if (msg.action === "ALLOW" && stats.external > 0) {
            stats.external--;
            stats.internal++;
        }
        browser.storage.local.set({ trafficStats: stats });
        browser.runtime.sendMessage({ type: "UPDATE_STATS", payload: stats }).catch(() => {});
    }
    
    if (msg.type === "GET_GATEKEEPER_HISTORY") {
        return Promise.resolve(gatekeeperHistory);
    }
    
    if (msg.type === "RESET_SESSION") {
        stats = { internal: 0, external: 0 };
        countedHostnames.clear();
        browser.storage.local.set({ trafficStats: stats });
    }
});















