import { EphemeralCryptoEngine } from './crypto.js';
import { AI_CONFIG } from './ai.js';
import { UI } from './ui.js';
import { JobVerificationWorkflow } from './workflow.js';
import { AIAnalysisSubWorkflow } from './ai-subworkflow.js';

// --- Initialization Storage Event Bindings ---
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['userAiUrl', 'userAiModel', 'encryptedAiPayload'], (items) => {
    if (items.userAiUrl) document.getElementById('aiUrlInput').value = items.userAiUrl;
    if (items.userAiModel) document.getElementById('aiModelInput').value = items.userAiModel;
    if (items.encryptedAiPayload) {
      document.getElementById('aiKeyInput').placeholder = "🔒 Key encrypted securely. Enter fields to overwrite.";
    }
  });
});

document.getElementById('saveSettingsBtn').addEventListener('click', async () => {
  const userAiUrl = document.getElementById('aiUrlInput').value.trim();
  const userAiKey = document.getElementById('aiKeyInput').value.trim();
  const userAiModel = document.getElementById('aiModelInput').value.trim();
  const setupPassword = document.getElementById('setupMasterPasswordInput').value;

  if (userAiKey && !setupPassword) {
    alert("❌ Security Requirement: Provide a Master Password to encrypt your API token.");
    return;
  }

  try {
    let storageConfig = { userAiUrl, userAiModel };
    if (userAiKey) {
      const encryptedData = await EphemeralCryptoEngine.encryptKey(userAiKey, setupPassword);
      storageConfig.encryptedAiPayload = encryptedData;
    }

    chrome.storage.local.set(storageConfig, () => {
      alert('🔧 Settings Encryption Complete!');
      document.getElementById('aiKeyInput').value = "";
      document.getElementById('setupMasterPasswordInput').value = "";
    });
  } catch (err) {
    alert("Encryption failed: " + err.message);
  }
});

// --- Reset Button Operational Event Trigger ---
document.getElementById('resetBtn').addEventListener('click', () => {
  const resultDiv = document.getElementById('result');
  
  // 1. Flush volatile workflow state object
  JobVerificationWorkflow.state = {};
  
  // 2. Clear out view layout container dynamically
  resultDiv.innerHTML = "";
  resultDiv.style.display = "none";
  
  // 3. Wipe operational runtime credential panel for explicit data protection
  const authInput = document.getElementById('runtimeMasterPasswordInput');
  if (authInput) {
    authInput.value = "";
  }
  
  // 4. Fire baseline view adjustment if available
  if (UI.showInitialState) {
    UI.showInitialState();
  } else {
    console.log("[Workflow System] Workspace view state restored to default.");
  }
});

//--- Main Operational Click Event Trigger ---
document.getElementById('verifyBtn').addEventListener('click', async () => {
  const resultDiv = document.getElementById('result');
  
  resultDiv.style.display = "block";
  UI.showLoading();

  const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  const activeTab = tabs?.[0];
  const targetUrl = activeTab?.url || "";
  
  if (!targetUrl.includes('linkedin.com/jobs')) {
    resultDiv.innerHTML = '<div class="status-msg" style="color:#d9534f;">Navigate to a LinkedIn job page first.</div>';
    return;
  }
  
  try {
    JobVerificationWorkflow.init(targetUrl);
    const scraped = await JobVerificationWorkflow.runScrapeStage(activeTab);
    
    if (scraped && scraped.isLoggedIn === false) {
      UI.renderAuthError(resultDiv);
      return;
    }

    // Isolated Domain Tracking Task Block
    const domainMappingPromise = (async () => {
      try {
        await JobVerificationWorkflow.runResolveDomainStage();
        await JobVerificationWorkflow.runRegistryCheckStage();
        JobVerificationWorkflow.runInfrastructureStage();
      } catch (domainErr) {
        console.error("Domain tracking pipeline encountered an error:", domainErr);
        JobVerificationWorkflow.state.domainError = domainErr.message;
      }
    })();

    // Isolated Concurrent AI Extraction Task Block
    const aiExtractionPromise = (async () => {
      try {
        // 1. Run legacy skill extraction
        JobVerificationWorkflow.state.aiSkills = await AI_CONFIG.extractKeySkills(JobVerificationWorkflow.state.jobDescription);
      } catch (skillErr) {
        JobVerificationWorkflow.state.aiSkills = [`❌ Core Extraction Failed: ${skillErr.message}`];
      }
        
      try {
        // 2. Run independent content scam auditing
        const companyName = JobVerificationWorkflow.state.companyName || "Unknown Entity";
        await AIAnalysisSubWorkflow.runAll(
          JobVerificationWorkflow.state.jobDescription, 
          companyName
        );
        JobVerificationWorkflow.state.aiSecurityHtml = AIAnalysisSubWorkflow.renderAiReportHtml();
      } catch (subWfErr) {
        JobVerificationWorkflow.state.aiSecurityHtml = `
          <div style="border-left: 4px solid #d9534f; padding: 8px; margin-top: 12px; background: rgba(0,0,0,0.02); font-family: sans-serif;">
            <strong style="color:#d9534f;">⚠️ Security Analysis Operational Fault:</strong>
            <div style="font-size: 0.85rem; margin-top: 2px; color: #555;">${subWfErr.message}</div>
          </div>
        `;
      }
    })();

    // Await execution paths concurrently without premature crash cascading
    await Promise.all([domainMappingPromise, aiExtractionPromise]);
    UI.renderFinalReport(resultDiv, JobVerificationWorkflow.state);

    if (!JobVerificationWorkflow.state.isEasyApply && JobVerificationWorkflow.state.applyUrl) {
      chrome.tabs.create({ url: JobVerificationWorkflow.state.applyUrl, active: true });
    }

  } catch (outerErr) {
    resultDiv.innerHTML = `<div class="status-msg" style="color:#d9534f;">Runtime Error: ${outerErr.message}</div>`;
  } finally {
    // Single consolidated decryption password erasure execution point 
    const authInput = document.getElementById('runtimeMasterPasswordInput');
    if (authInput) authInput.value = "";
  }
});