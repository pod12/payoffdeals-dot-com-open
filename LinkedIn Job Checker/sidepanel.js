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

//--- Main Operational Click Event Trigger ---
document.getElementById('verifyBtn').addEventListener('click', async () => {
  const resultDiv = document.getElementById('result');
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

    // Fixed execution order sequence to await network trace variables before matching infrastructure
    const domainMappingPromise = (async () => {
      await JobVerificationWorkflow.runResolveDomainStage();
      await JobVerificationWorkflow.runRegistryCheckStage();
      JobVerificationWorkflow.runInfrastructureStage();
    })();

    const aiExtractionPromise = (async () => {
        // 1. Run the existing legacy key skill extraction
        JobVerificationWorkflow.state.aiSkills = await AI_CONFIG.extractKeySkills(JobVerificationWorkflow.state.jobDescription);
        
        // 2. Execute the new AI Content Analysis Sub-Workflow concurrently
        const companyName = JobVerificationWorkflow.state.companyName || "Unknown Entity";
        const aiSecurityState = await AIAnalysisSubWorkflow.runAll(
          JobVerificationWorkflow.state.jobDescription, 
          companyName
        );
        
        // Attach the resulting UI payload straight to our primary workflow state
        JobVerificationWorkflow.state.aiSecurityHtml = AIAnalysisSubWorkflow.renderAiReportHtml();
    })();

    await Promise.all([domainMappingPromise, aiExtractionPromise]);
    UI.renderFinalReport(resultDiv, JobVerificationWorkflow.state);

    if (!JobVerificationWorkflow.state.isEasyApply && JobVerificationWorkflow.state.applyUrl) {
      chrome.tabs.create({ url: JobVerificationWorkflow.state.applyUrl, active: true });
    }

  } catch (outerErr) {
    resultDiv.innerHTML = `<div class="status-msg" style="color:#d9534f;">Runtime Error: ${outerErr.message}</div>`;
  }
});