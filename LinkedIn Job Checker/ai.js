import { EphemeralCryptoEngine } from './crypto.js';

export const AI_CONFIG = {
  detectProvider(endpoint) {
    const url = endpoint.toLowerCase();
    if (url.includes('x.ai')) return 'grok';
    if (url.includes('anthropic.com')) return 'claude';
    if (url.includes('openai.com')) return 'openai';
    if (url.includes('localhost') || url.includes('127.0.0.1')) return 'local-server';
    return 'generic-openai-compatible';
  },

  async extractKeySkills(jobDescription) {
    if (!jobDescription || jobDescription.length < 50) {
      return ["Could not extract skills: Job description too short or missing."];
    }

    const systemPrompt = "You are a specialized technical recruiter extraction engine. Analyze the following job description and return ONLY a clean comma-separated list of the top 8 essential hard skills, frameworks, or certifications required. Do not include introductory text or markdown formatting.";
    const userPrompt = `Job Description:\n${jobDescription.substring(0, 3500)}`;

    try {
      const chromeAIEngine = window.ai || (typeof chrome !== 'undefined' && chrome.aiOriginTrial?.languageModel);
      if (chromeAIEngine) {
        const capabilities = await chromeAIEngine.capabilities();
        if (capabilities && capabilities.available !== 'no') {
          const session = await chromeAIEngine.create({ systemPrompt: systemPrompt });
          const localResult = await session.prompt(userPrompt);
          session.destroy();
          return this.cleanSkillsArray(localResult);
        }
      }
    } catch (localEngineErr) {
      console.warn("[AI Orchestrator Stage 1] Native Browser AI error, falling back to cloud...", localEngineErr);
    }

    const endpoint = document.getElementById('aiUrlInput').value.trim() || 'https://api.x.ai/v1/chat/completions';
    const modelName = document.getElementById('aiModelInput').value.trim() || 'grok-4.1-fast';
    const runtimePassword = document.getElementById('runtimeMasterPasswordInput').value; 
    
    const provider = this.detectProvider(endpoint);
    let apiKey = "";

    if (provider !== 'local-server') {
      const storage = await chrome.storage.local.get(['encryptedAiPayload']);
      if (storage.encryptedAiPayload) {
        if (!runtimePassword) {
          return ["🔑 Access Denied: Please enter your Master Password in the validation field to run verification scans."];
        }
        try {
          apiKey = await EphemeralCryptoEngine.decryptKey(storage.encryptedAiPayload, runtimePassword);
        } catch (decryptErr) {
          return ["❌ Authentication Failure: Master Password is incorrect or storage state integrity was lost."];
        }
      } else {
        return ["🔑 Setup Required: No encrypted API Key payload found. Please configure the extension options panel above."];
      }
    }

    try {
      let headers = { 'Content-Type': 'application/json' };
      let bodyPayload = {};

      switch (provider) {
        case 'claude':
          headers['x-api-key'] = apiKey;
          headers['anthropic-version'] = '2023-06-01';
          bodyPayload = {
            model: modelName,
            max_tokens: 200,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }]
          };
          break;
        case 'grok':
        case 'openai':
        case 'local-server':
        case 'generic-openai-compatible':
        default:
          if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
          bodyPayload = {
            model: modelName,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.1
          };
          break;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(bodyPayload)
      });

      if (!response.ok) {
        const errMsg = await response.json().catch(() => ({}));
        throw new Error(errMsg?.error?.message || `HTTP Server Status ${response.status}`);
      }

      const data = await response.json();
      let rawResult = provider === 'claude' ? data?.content?.[0]?.text : data?.choices?.[0]?.message?.content;

      return this.cleanSkillsArray(rawResult || "");

    } catch (networkAIErr) {
      return [`❌ AI Extraction Error: ${networkAIErr.message}.`];
    } finally {
      apiKey = "";
      document.getElementById('runtimeMasterPasswordInput').value = "";
    }
  },

  cleanSkillsArray(rawText) {
    return rawText
      .replace(/[\n\*#\-–—•]/g, ' ')
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 1);
  }
};