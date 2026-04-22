document.addEventListener('DOMContentLoaded', function() {
  const activateBtn = document.getElementById('activate');
  const resetBtn = document.getElementById('reset');

  activateBtn.addEventListener('click', async () => {
    try {
      // 1. Set the core blocking rule
      await browser.declarativeNetRequest.updateDynamicRules({
        addRules: [{
          "id": 1,
          "priority": 1,
          "action": { "type": "block" },
          "condition": { 
            "domainType": "thirdParty", 
            "resourceTypes": ["script", "xmlhttprequest", "sub_frame"] 
          }
        }],
        removeRuleIds: [1]
      });
      
      // 2. Sync the Master Toggle state
      await browser.storage.local.set({ gatekeeperEnabled: true });
      
      alert("Gatekeeper Active! Open the Side Panel to manage traffic.");
    } catch (e) {
      console.error("Activation Error:", e);
    }
  });

  resetBtn.addEventListener('click', async () => {
    if (confirm("This will delete all custom 'Allow' and 'Reject' rules. Continue?")) {
      // 1. Clear DNR rules
      const existingRules = await browser.declarativeNetRequest.getDynamicRules();
      const ids = existingRules.map(rule => rule.id);
      await browser.declarativeNetRequest.updateDynamicRules({ removeRuleIds: ids });
      
      // 2. Reset stored stats
      await browser.storage.local.set({ 
        trafficStats: { internal: 0, external: 0 },
        gatekeeperEnabled: false // Optional: default to off after a full wipe
      });

      // 3. NEW: Tell background to clear the Unique Domain Set
      browser.runtime.sendMessage({ type: "RESET_SESSION" }).catch(() => {});
      
      alert("All rules cleared. Back to default settings.");
    }
  });
});