import { AI_CONFIG } from './ai.js';

export const AIAnalysisSubWorkflow = {
  state: {
    scamScore: 0,
    harvestingRisk: 'LOW',
    behavioralFlags: [],
    analysisSummary: '',
    hasFailed: false // Track operational faults
  },

  async runAll(jobDescription, companyName) {
    // Reset structural states on each run execution
    this.state.hasFailed = false;

    try {
      const systemPrompt = "You are an advanced security auditing model trained to spot fraudulent corporate job text, identity theft vectors, and malicious PII harvesting operations. You must respond strictly and exclusively with a valid JSON object matching the requested schema. Do not return introductory text, conversational fluff, or unescaped characters.";
      
      const userPrompt = `
        Analyze this job description listed under the company name "${companyName}".
        Assess it for data harvesting and fraudulent recruitment patterns.
        
        Respond ONLY with a valid JSON object matching this schema:
        {
          "scamScore": (0-100 integer reflecting structural or linguistic fraud risk),
          "harvestingRisk": ("LOW" | "MEDIUM" | "HIGH" based on invasive PII requests),
          "behavioralFlags": [array of warning strings discovered, or empty],
          "summary": "Short 1-2 sentence risk analysis statement"
        }

        Job Description Content:
        ${jobDescription}
      `;

      // Dispatch directly via our unified engine core
      const responseText = await AI_CONFIG.executePrompt(systemPrompt, userPrompt);
      
      // Sanitizer: Handle instances where LLMs return markdown fenced blocks (```json ... ```)
      const sanitizedJson = responseText
        .trim()
        .replace(/^```json\s*/i, '')
        .replace(/```$/, '')
        .trim();

      const data = JSON.parse(sanitizedJson);

      this.state.scamScore = (typeof data.scamScore === 'number') ? data.scamScore : 0;
      this.state.harvestingRisk = data.harvestingRisk || 'LOW';
      this.state.behavioralFlags = data.behavioralFlags || [];
      this.state.analysisSummary = data.summary || 'Content analysis completed.';
      
      return this.state;
    } catch (err) {
      // Hard fallback protection: Set states to an explicit unverified baseline layout
      this.state.scamScore = -1; 
      this.state.harvestingRisk = 'UNKNOWN';
      this.state.behavioralFlags = [];
      this.state.analysisSummary = `Operational Fault: ${err.message || 'AI Content Audit failed or timed out.'}`;
      this.state.hasFailed = true;
      return this.state;
    }
  },

  renderAiReportHtml() {
    // Handle error layout state explicitly
    if (this.state.hasFailed) {
      return `
        <div class="ai-assessment-card" style="border-left: 4px solid #e67e22; padding: 8px; margin-top: 12px; background: rgba(0,0,0,0.02); font-family: sans-serif;">
          <strong>AI Content Integrity Audit:</strong>
          <div style="color:#e67e22; font-weight:bold; font-size: 0.85rem;">⚠ UNVERIFIED CONTENT COMPLIANCE</div>
          <div style="font-size: 0.85rem; margin-top: 4px; color: #666; font-style: italic;">"${this.state.analysisSummary}"</div>
          <div style="font-size: 0.8rem; margin-top: 6px; color: #7f8c8d;">Please parse the job details text manually for harvesting vectors.</div>
        </div>
      `;
    }

    let badgeColor = '#5cb85c'; // Safe Green
    if (this.state.scamScore > 40 || this.state.harvestingRisk === 'HIGH') badgeColor = '#d9534f'; // Alert Red
    else if (this.state.scamScore > 15 || this.state.harvestingRisk === 'MEDIUM') badgeColor = '#e67e22'; // Warning Orange

    const flagsHtml = this.state.behavioralFlags.length 
      ? `<ul style="margin: 4px 0 0 0; padding-left: 18px; list-style-type: none;">${this.state.behavioralFlags.map(f => `<li style="text-indent: -14px;">⚠️ ${f}</li>`).join('')}</ul>`
      : '✓ No anomalous linguistic behavior discovered.';

    return `
      <div class="ai-assessment-card" style="border-left: 4px solid ${badgeColor}; padding: 8px; margin-top: 12px; background: rgba(0,0,0,0.02); font-family: sans-serif;">
        <strong style="display: block; margin-bottom: 2px; font-size: 0.95rem;">AI Content Integrity Audit:</strong>
        <div style="font-size: 0.9rem;">Risk Index: <span style="color:${badgeColor}; font-weight:bold;">${this.state.scamScore}/100</span> | Harvesting Risk: <span style="font-weight: bold;">${this.state.harvestingRisk}</span></div>
        <div style="font-size: 0.85rem; margin-top: 4px; font-style: italic; color: #475569;">"${this.state.analysisSummary}"</div>
        <div style="font-size: 0.85rem; margin-top: 6px; color: #334155;">${flagsHtml}</div>
      </div>
    `;
  }
};