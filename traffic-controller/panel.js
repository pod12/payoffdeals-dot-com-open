// Global scope variables
let gatekeeperView, traceView, chartCircle, statPercent, masterToggle, statusText, resetBtn, activeRulesList;
const seenPairs = new Set();
let traceBuffer = [];

// --- 1. INITIALIZATION & ELEMENT MAPPING ---
document.addEventListener('DOMContentLoaded', async () => {
    // UI Element Mapping
    gatekeeperView = document.getElementById('gatekeeper-view');
    traceView = document.getElementById('trace-view');
    chartCircle = document.getElementById('chart-circle');
    statPercent = document.getElementById('stat-percent');
    masterToggle = document.getElementById('master-toggle');
    statusText = document.getElementById('status-text');
    resetBtn = document.getElementById('master-reset');
    activeRulesList = document.getElementById('active-rules-list');

    try {
        const toggleData = await browser.storage.local.get("gatekeeperEnabled");
        const isEnabled = toggleData.gatekeeperEnabled !== false; 
        if (masterToggle) masterToggle.checked = isEnabled;
        updateStatusUI(isEnabled);

        const statData = await browser.storage.local.get("trafficStats");
        if (statData?.trafficStats) refreshVisualization(statData.trafficStats);

        browser.runtime.sendMessage({ type: "GET_GATEKEEPER_HISTORY" })
        .then(history => {
            if (history && history.length > 0) {
                history.forEach(item => {
                    const pairId = `${item.source}_to_${item.destination}`.replace(/\./g, '_');
                    if (!seenPairs.has(pairId)) {
                        seenPairs.add(pairId);
                        createGatekeeperCard(item, pairId);
                    }
                });
            }
        });
        
        // Load existing dynamic rules into the UI
        refreshActiveRulesList();
    } catch (e) {
        console.error("Initial load failed:", e);
    }

    if (masterToggle) masterToggle.addEventListener('change', handleToggle);
    if (resetBtn) resetBtn.addEventListener('click', handleReset);

    // Tab Switching Logic
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab, .view').forEach(el => el.classList.remove('active'));
            tab.classList.add('active');
            const target = document.getElementById(tab.dataset.target);
            if (target) {
                target.classList.add('active');
                
                // Refresh rules list specifically when opening the firewall view
                if (tab.dataset.target === 'firewall-view') {
                    refreshActiveRulesList();
                }
            }
        });
    });

    // Performance: UI Buffer Loop (runs every 500ms)
    setInterval(flushTraceBuffer, 500);
});

// --- 2. LOGIC HANDLERS ---
async function handleToggle() {
    const isEnabled = masterToggle.checked;
    await browser.storage.local.set({ gatekeeperEnabled: isEnabled });
    updateStatusUI(isEnabled);

    if (isEnabled) {
        await browser.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: [1],
            addRules: [{
                "id": 1,
                "priority": 1,
                "action": { "type": "block" },
                "condition": { "domainType": "thirdParty", "resourceTypes": ["script", "xmlhttprequest", "sub_frame"] }
            }]
        });
    } else {
        await browser.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [1] });
    }
}

async function handleReset() {
    if (!confirm("Clear all custom rules and reset stats?")) return;
    try {
        const existingRules = await browser.declarativeNetRequest.getDynamicRules();
        await browser.declarativeNetRequest.updateDynamicRules({ 
            removeRuleIds: existingRules.map(r => r.id)
        });
        await browser.storage.local.set({ 
            trafficStats: { internal: 0, external: 0 },
            seenHostnames: [] 
        });
        browser.runtime.sendMessage({ type: "RESET_SESSION" }).catch(() => {});
        
        await refreshActiveRulesList();
        
        location.reload(); 
    } catch (e) { console.error("Reset failed:", e); }
}

// --- 3. MESSAGE LISTENER ---
browser.runtime.onMessage.addListener((msg) => {
    if (msg.type === "UPDATE_STATS") refreshVisualization(msg.payload);
    
    if (msg.type === "RENDER_GATEKEEPER") {
        const src = String(msg.payload.source || "Unknown").trim();
        const dest = String(msg.payload.destination || "Unknown").trim();
        const pairId = `${src}_to_${dest}`.replace(/\./g, '_'); 

        if (!seenPairs.has(pairId)) {
            seenPairs.add(pairId);
            createGatekeeperCard(msg.payload, pairId);
        }
    }
    
    if (msg.type === "RENDER_TRACE") {
        traceBuffer.push(msg.payload);
    }
});

// --- 4. UI GENERATORS ---
function flushTraceBuffer() {
    if (traceBuffer.length === 0 || !traceView) return;
    const fragment = document.createDocumentFragment();
    traceBuffer.forEach(data => {
        const line = document.createElement('div');
        line.className = 'trace-line';
        line.innerHTML = `<span style="color:#28a745; font-weight:bold;">[${data.resourceType}]</span> ${data.destination}`;
        fragment.prepend(line);
    });
    traceView.prepend(fragment);
    traceBuffer = [];
    while (traceView.childElementCount > 50) traceView.lastChild.remove();
}

async function refreshActiveRulesList() {
    if (!activeRulesList) return;
    
    const rules = await browser.declarativeNetRequest.getDynamicRules();
    activeRulesList.innerHTML = '';
    
    // Filter out the Master Toggle (ID 1)
    const customRules = rules.filter(r => r.id !== 1);

    if (customRules.length === 0) {
        activeRulesList.innerHTML = `
            <div style="padding: 40px 20px; text-align: center; color: #888; line-height: 1.5; font-style: italic;">
                Rules are empty. Allow or Deny any source to destination domain request from Gatekeeper
            </div>`;
        return;
    }

    customRules.forEach(rule => {
        const item = document.createElement('div');
        item.className = 'rule-item';
        
        // Determine label based on action
        const isBlock = rule.action.type === 'block';
        const label = isBlock ? '🚫 Block' : '✅ Allow';
        const color = isBlock ? '#dc3545' : '#28a745';

        item.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:2px;">
                <span style="font-weight:bold; color:${color}">${label}</span>
                <span style="color:#333;">${rule.condition.urlFilter}</span>
                <span style="font-size:9px; color:#999;">From: ${rule.condition.initiatorDomains?.[0] || 'Any'}</span>
            </div>
            <button class="del-rule" style="border:none; background:none; cursor:pointer; font-size:16px;">🗑️</button>
        `;

        item.querySelector('.del-rule').addEventListener('click', async () => {
            await browser.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [rule.id] });
            refreshActiveRulesList(); // Re-render
        });
        activeRulesList.appendChild(item);
    });
}

function createGatekeeperCard(data, pairId) {
    if (!gatekeeperView) return;
    const card = document.createElement('div');
    card.className = 'card';
    card.setAttribute('data-id', pairId); 
    card.innerHTML = `
        <div style="color:#666; font-size:12px; line-height: 1.2;">Source: ${data.source}</div>
        <div style="font-weight:bold; color:#333; margin-bottom: 8px; line-height: 1.2;">Target: ${data.destination}</div>
        <div class="actions" style="display:flex; gap:5px;">
            <button class="allow" style="background:#28a745; color:white; border:none; padding:4px 8px; border-radius:3px; cursor:pointer;">Allow</button>
            <button class="reject" style="background:#dc3545; color:white; border:none; padding:4px 8px; border-radius:3px; cursor:pointer;">Reject</button>
        </div>
    `;

    const handleAction = async (type) => {
        const ruleId = Math.floor(Math.random() * 100000) + 2;
        await browser.declarativeNetRequest.updateDynamicRules({
            addRules: [{
                "id": ruleId,
                "priority": 2,
                "action": { "type": type },
                "condition": { 
                    "urlFilter": data.destination, 
                    "initiatorDomains": [data.source],
                    "resourceTypes": ["script", "xmlhttprequest", "sub_frame"]
                }
            }]
        });
        if (type === 'allow') browser.runtime.sendMessage({ type: "ADJUST_STATS", action: "ALLOW" }).catch(() => {});
        card.innerHTML = `<div style="color:${type === 'allow' ? '#28a745' : '#d9534f'}; font-size:11px; padding: 5px;">${type === 'allow' ? '✅ Allowed' : '🚫 Rejected'}</div>`;
        setTimeout(() => {
            card.remove();
            refreshActiveRulesList();
        }, 1500);
    };

    card.querySelector('.allow').addEventListener('click', () => handleAction('allow'));
    card.querySelector('.reject').addEventListener('click', () => handleAction('block'));
    gatekeeperView.prepend(card);
}

function refreshVisualization(stats) {
    if (!chartCircle || !statPercent) return;
    const total = (stats.internal || 0) + (stats.external || 0);
    if (total === 0) {
        statPercent.innerText = "0%";
        chartCircle.style.background = "#eee";
        return;
    }
    const externalRatio = Math.round((stats.external / total) * 100);
    chartCircle.style.background = `conic-gradient(#dc3545 0% ${externalRatio}%, #28a745 ${externalRatio}% 100%)`;
    statPercent.innerText = `${externalRatio}%`;
}

function updateStatusUI(isEnabled) {
    if (!statusText) return;
    
    // 1. Update the Toggle Label (Active/Disabled)
    statusText.innerText = isEnabled ? "Active" : "Disabled";
    statusText.style.color = isEnabled ? "#2196F3" : "#666";

    // 2. Update the Traffic Label (Blocked/Allowed)
    const trafficLabel = document.getElementById('traffic-label-text'); // Ensure this ID is in your HTML
    if (trafficLabel) {
        if (isEnabled) {
            trafficLabel.innerHTML = 'Third-Party Traffic: <span style="color:#dc3545; font-weight:bold;">Blocked</span>';
        } else {
            trafficLabel.innerHTML = 'Third-Party Traffic: <span style="color:#28a745; font-weight:bold;">Allowed</span>';
        }
    }
    
    
    if (chartCircle) chartCircle.style.opacity = isEnabled ? "1" : "0.3";
}




















