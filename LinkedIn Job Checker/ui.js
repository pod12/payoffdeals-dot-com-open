export const UI = {
  reset() {
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = '';
    resultDiv.style.display = 'none';
  },
  showLoading() {
    const resultDiv = document.getElementById('result');
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '<div class="status-msg">Analyzing current page elements and scraping company profile...</div>';
  },
  renderAuthError(resultDiv) {
    resultDiv.innerHTML = `
      <div class="status-msg" style="color:#d9534f; font-weight:bold; margin-bottom:10px;">🔒 Verification Paused</div>
      <div style="background:#fff3cd; color:#856404; padding:12px; border-radius:4px; font-size:0.9rem; border:1px solid #ffeeba; text-align:center;">
        Please log into your <strong>LinkedIn account</strong> first.
      </div>`;
  },
  renderFinalReport(resultDiv, state) {
    const logHtml = state.systemLogs.map(log => `<div style="margin-bottom:4px; font-family:monospace; color:#444; white-space:pre-wrap; word-break:break-all;">${log}</div>`).join('');
    
    // --- UPDATED: Multi-vector Risk Accent Color Determination ---
    let accentColor = '#5cb85c'; // Default: Verified Ecosystem (Green)
    
    // Check both infrastructure indicators and AI analysis indicators for risk states
    const hasInfrastructureRisk = state.atsStatusHtml.includes('❌') || state.atsStatusHtml.includes('HIGH RISK');
    const hasAiContentRisk = state.aiSecurityHtml && (state.aiSecurityHtml.includes('❌') || state.aiSecurityHtml.includes('CRITICAL') || state.aiSecurityHtml.includes('HIGH'));
    const hasAiFailed = state.aiSecurityHtml && state.aiSecurityHtml.includes('UNVERIFIED'); // <-- Captures AI dropouts
    
    if (hasInfrastructureRisk || hasAiContentRisk) {
      accentColor = '#d9534f'; // Critical / High Risk Threat (Red)
    } else if (state.isExternalPortal || state.atsStatusHtml.includes('⚠') || hasAiFailed || (state.aiSecurityHtml && state.aiSecurityHtml.includes('MEDIUM'))) {
      accentColor = '#e67e22'; // Warning / Unverified State (Orange)
    }

    resultDiv.innerHTML = `
      <div class="meta-card" style="border-left-color: ${accentColor}">
        <h3>${state.companyName || "Unknown Company"}</h3>
        
        ${state.linkedinCompanyMeta ? `
        <div style="background: #f8f9fa; padding: 10px; border-radius: 4px; margin: 8px 0; font-size: 0.85rem; border: 1px solid #e9ecef;">
          <strong style="color: #2c3e50;">📋 LinkedIn Profile Data:</strong><br>
          ${state.linkedinCompanyMeta.verifiedDate ? `✅ <strong>Verified Since:</strong> ${state.linkedinCompanyMeta.verifiedDate}<br>` : ''}
          ${state.linkedinCompanyMeta.size ? `👥 <strong>Size:</strong> ${state.linkedinCompanyMeta.size}<br>` : ''}
          ${state.linkedinCompanyMeta.members ? `🔗 <strong>Members:</strong> ${state.linkedinCompanyMeta.members}<br>` : ''}
          ${state.linkedinCompanyMeta.founded ? `📅 <strong>Founded:</strong> ${state.linkedinCompanyMeta.founded}<br>` : ''}
          ${state.linkedinCompanyMeta.industry ? `🏢 <strong>Industry:</strong> ${state.linkedinCompanyMeta.industry}<br>` : ''}
          ${state.linkedinCompanyMeta.headquarters ? `📍 <strong>HQ:</strong> ${state.linkedinCompanyMeta.headquarters}` : ''}
        </div>
        ` : ''}

        <p style="margin-bottom: 4px; margin-top: 8px;"><strong>Application Infrastructure:</strong></p>
        <p style="font-size: 0.9rem; line-height: 1.3;">${state.atsStatusHtml}</p>
        <hr style="margin: 10px 0; border: none; border-top: 1px solid #eee;">
        <p style="margin-bottom: 4px;"><strong>Domain Registration Assessment:</strong></p>
        <p>${state.securityStatusHtml}</p>
      </div>
      
      <div class="meta-card" style="border-left-color: #2c3e50; font-size: 0.85rem;">
        <strong>Registry Trace:</strong> (Auditing Domain: <code>${state.domainToTest}</code>)<br>${state.domainAgeDetails}
      </div>
      
      <div class="meta-card" style="border-left-color: #9b59b6;">
        <h4 style="margin: 0 0 8px 0; color: #8e44ad; display: flex; align-items: center; gap: 6px;">
          ✨ AI-Extracted Key Target Skills
        </h4>
        <div style="display: flex; flex-wrap: wrap; gap: 6px;" id="aiSkillsContainer">
          ${state.aiSkills && state.aiSkills.length > 0 
            ? state.aiSkills.map(skill => `<span style="background: #f3e5f5; color: #6a1b9a; border: 1px solid #d1c4e9; padding: 4px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: bold;">${skill}</span>`).join('')
            : `<span style="color:#777; font-size:0.8rem; font-style:italic;">Processing requirements trace via active AI layer...</span>`
          }
        </div>
        
        <!-- --- ADDED: Unified AI Content Sub-Workflow Security Presentation --- -->
        ${state.aiSecurityHtml ? `<div style="margin-top: 12px; border-top: 1px dashed #ddd; padding-top: 8px;">${state.aiSecurityHtml}</div>` : ''}
      </div>

      ${state.applyUrl ? `
      <div class="meta-card" style="border-left-color: #7f8c8d; background: #fdfdfd; font-size: 0.8rem; word-break: break-all;">
        <strong>Application Destination Link:</strong><br>
        <a href="${state.applyUrl}" target="_blank" style="color: #2980b9; text-decoration: none;">${state.applyUrl}</a>
      </div>` : ''}

      ${state.resolvedIpAddress ? `
      <div style="margin-bottom: 12px; text-align: center;">
        <button id="openIpWhoisBtn" style="background: #2c3e50; color: white; border: none; padding: 8px 12px; border-radius: 4px; font-size: 0.8rem; cursor: pointer; width: 100%;">
          🔍 Open Full Manual IP Report
        </button>
      </div>` : ''}

      <div class="desc-header">Execution Trace Log:</div>
      <div class="desc-box" style="max-height: 120px; background: #efe; border-color: #bcd; margin-bottom: 16px; overflow-y: auto;">${logHtml}</div>
      <div class="desc-header">Job Description:</div>
      <div class="desc-box" style="max-height: 180px; overflow-y: auto;">${state.jobDescription || "No text description captured."}</div>
    `;

    if (state.resolvedIpAddress) {
      document.getElementById('openIpWhoisBtn').addEventListener('click', () => {
        chrome.tabs.create({ url: `https://ipwhoisinfo.com/ip/${state.resolvedIpAddress}` });
      });
    }
  }
};