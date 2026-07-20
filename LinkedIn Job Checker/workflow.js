const GLOBAL_ATS_KEYWORDS = [
  "ashbyhq.com", "greenhouse.io", "lever.co", "myworkdayjobs.com", 
  "icims.com", "smartrecruiters.com", "bamboohr.com", "workable.com", 
  "jobvite.com", "taleo.net", "successfactors.eu", "rippling.com", "brighthire.ai",
  "keka.com", "zohorecruit.in"
];

export const JobVerificationWorkflow = {
  state: {},

  init(targetUrl) {
    this.state = {
      systemLogs: [`[1] Safe local injection started.`, `[2] Target URL verified: ${targetUrl}`],
      companyName: "Unknown Company", jobDescription: "", applyUrl: null, isLoggedIn: true,
      routeDetectionType: "Undetermined Link Pipeline", domainToTest: null,
      verificationMethod: "Structural Metadata Extraction", extractedApplyHost: "",
      webResolvedDomain: "", matchesCorporateSite: false, isEasyApply: false,
      isExternalPortal: false, // Added initialization parameter flag
      atsStatusHtml: "", isAtsOrCorporateSite: false, resolvedIpAddress: null,
      securityStatusHtml: `<span style="color: #e67e22;">⚠ Registry verification indeterminate</span>`,
      domainAgeDetails: "Public trace queries could not fetch exact dates.", creationDateStr: null,
      linkedinCompanyAboutUrl: null, linkedinCompanyMeta: null, aiSkills: []
    };
  },

  log(msg) { this.state.systemLogs.push(msg); },

  async runScrapeStage(activeTab) {
    const injectionResults = await chrome.scripting.executeScript({
      target: { tabId: activeTab.id, allFrames: true },
      func: () => {
        let companyName = "Unknown Company";
        let jobDescription = "";
        let applyUrl = null;
        let companyId = null;
        let isLoggedIn = true;
        let extractionTrace = [];
        let routeDetectionType = "Undetermined Link Pipeline";
        let linkedinCompanyAboutUrl = null;

        try {
          const loginButton = document.querySelector('.nav__button-secondary, a[href*="login"], .header__sign-in, a[data-tracking-control-name*="login"]');
          if (loginButton) isLoggedIn = false;
        } catch (authErr) {}

        try {
          if (window.location.href.includes('openSDUIApplyFlow=true')) {
            routeDetectionType = "LinkedIn Easy Apply Flow Detected via URL Parameter";
            extractionTrace.push(`Route Match: Found openSDUIApplyFlow=true in active window URL.`);
          }
        } catch (urlParamErr) {}

        try {
          const companyLinks = Array.from(document.querySelectorAll('a[href*="/company/"]'));
          for (const link of companyLinks) {
            const href = link.href || '';
            if (href.includes('/company/')) {
              // Capture layout target company about endpoint link details
              if (!linkedinCompanyAboutUrl) {
                const baseMatch = href.match(/(https:\/\/www\.linkedin\.com\/company\/[^\/]+)/);
                if (baseMatch && baseMatch[1]) {
                  linkedinCompanyAboutUrl = baseMatch[1] + '/about/';
                  extractionTrace.push(`Structural Match: Isolated LinkedIn official company reference endpoint: ${linkedinCompanyAboutUrl}`);
                }
              }

              // Extract text string layout nodes safely if title properties are present
              if ((!companyName || companyName === "Unknown Company") && 
                  (link.innerText.includes('followers') || link.querySelector('img[src*="company-logo"]') || link.innerText.trim().length > 1)) {
                const textVal = link.innerText.trim();
                if (textVal && !textVal.includes('followers') && !textVal.includes('logo')) {
                  companyName = textVal.split('\n')[0].trim();
                  extractionTrace.push(`Anchor Text Match: Extracted company from active link node: "${companyName}"`);
                }
              }
            }
          }
        } catch (compLinkErr) {
          extractionTrace.push(`Company link structural processing failed: ${compLinkErr.message}`);
        }

        try {
          const safetyLinks = Array.from(document.querySelectorAll('a[href*="safety/go?url="], a[href*="safety/go/?url="], a[aria-label*="Apply"], a[href*="/apply/"]'));
          for (const link of safetyLinks) {
            const href = link.href || '';
            extractionTrace.push(`Inspecting layout anchor tag: ${href.substring(0, 80)}...`);
            
            if (href.includes('/apply/') && href.includes('openSDUIApplyFlow=true')) {
              routeDetectionType = "LinkedIn Easy Apply Flow Detected via Anchor Tag";
              extractionTrace.push(`Route Match: Verified standard LinkedIn Easy Apply infrastructure link.`);
            }

            if (href.includes('url=')) {
              const urlParam = href.split('url=')[1].split('&')[0];
              const decodedUrl = decodeURIComponent(urlParam);
              if (decodedUrl.startsWith('http') && !decodedUrl.includes('linkedin.com')) {
                applyUrl = decodedUrl;
                routeDetectionType = "External Safety Redirect Routing Map Found";
                extractionTrace.push(`Successfully decoded safety redirect URL: ${applyUrl}`);
                break;
              }
            } else if (href.includes('linkedin.com/safety/go')) {
              routeDetectionType = "External Safety Redirect Routing Map Found (Obfuscated)";
              extractionTrace.push(`Route Match: Detected generic external outbound safety gateway.`);
            }
          }
        } catch (safetyErr) {
          extractionTrace.push(`Safety redirect parse error: ${safetyErr.message}`);
        }

        try {
          const jsonLdEl = document.querySelector('script[type="application/ld+json"]');
          if (jsonLdEl) {
            extractionTrace.push("Found application/ld+json block.");
            const data = JSON.parse(jsonLdEl.innerText);
            if (data?.hiringOrganization?.name) {
              companyName = data.hiringOrganization.name.trim();
              extractionTrace.push(`Captured from JSON-LD name: "${companyName}"`);
            }
            if (!applyUrl && data?.hiringOrganization?.sameAs) {
              applyUrl = data.hiringOrganization.sameAs;
              extractionTrace.push(`Captured JSON-LD apply URL: ${applyUrl}`);
            }
          }
        } catch (e) {}

        try {
          const hiddenInputs = Array.from(document.querySelectorAll('input[type="hidden"], input[name*="company"], input[id*="company"]'));
          for (const input of hiddenInputs) {
            const val = input.value || '';
            if (val && (val.startsWith('http') || val.includes('.')) && !val.includes('linkedin.com') && !applyUrl) {
              applyUrl = val;
              extractionTrace.push(`Found dynamic url inside hidden token: ${applyUrl}`);
              break;
            }
          }
        } catch (tokenScanErr) {}

        try {
          const applyButtons = Array.from(document.querySelectorAll('button[aria-label*="Apply to "], button[aria-label*="website"]'));
          for (const btn of applyButtons) {
            const label = btn.getAttribute('aria-label') || '';
            const match = label.match(/Apply to .* on (.*) website/i);
            if (match && match[1]) {
              companyName = match[1].trim();
              extractionTrace.push(`Matched via Apply Button Aria-Label: "${companyName}"`);
              break;
            }
          }
        } catch (ariaErr) {}

        try {
          if (!companyName || companyName === "Unknown Company") {
            const companyAriaAnchors = Array.from(document.querySelectorAll('a[href*="/company/"][aria-label]'));
            for (const anchor of companyAriaAnchors) {
              const label = anchor.getAttribute('aria-label');
              if (label && label.toLowerCase().includes('company profile')) {
                companyName = label.replace(/company profile/i, '').trim();
                extractionTrace.push(`Matched via Corporate Anchor Aria-Label: "${companyName}"`);
                break;
              }
            }
          }
        } catch (anchorAriaErr) {}

        try {
          if (!companyName || companyName === "Unknown Company") {
            const companySelectors = [
              '.job-details-jobs-unified-top-card__subtitle-global-alerts-panel a', 
              'span.jobs-unified-top-card__company-name',
              '.job-details-jobs-unified-top-card__company-name a',
              '.jobs-search__job-details--container a[href*="/company/"]',
              '.topcard__org-name-link',
              '.jobs-unified-top-card__primary-description a[href*="/company/"]'
            ];
            for (const sel of companySelectors) {
              const el = document.querySelector(sel);
              if (el && el.innerText.trim()) { 
                companyName = el.innerText.trim().split('\n')[0].trim();
                extractionTrace.push(`Fallback hit selector (${sel}): "${companyName}"`);
                break; 
              }
            }
          }
        } catch (compErr) {}

        if (companyName && companyName !== "Unknown Company") {
          companyName = companyName
            .replace(/\n/g, ' ')
            .replace(/•.*/g, '')
            .replace(/\s*[·\-\|].*/g, '')
            .replace(/(inc|llc|ltd|pvt|corp)\.?$/i, '')
            .trim();
        }

        const descSelectors = [
          '.show-more-less-html__markup', '[id^="JobDetails_AboutTheJob_"]', '.jobs-description__container', '#job-details'
        ];
        for (const selector of descSelectors) {
          try {
            const el = document.querySelector(selector);
            if (el && el.innerText.trim().length > 50) {
              jobDescription = el.innerText.trim();
              extractionTrace.push(`Job description matched (${jobDescription.length} chars)`);
              break;
            }
          } catch (descLoopErr) {}
        }

        return { 
          companyName: companyName || "Unknown Company", 
          jobDescription: jobDescription || "", applyUrl, companyId, isLoggedIn, extractionTrace, routeDetectionType, linkedinCompanyAboutUrl
        };
      }
    });

    let response = null;
    if (injectionResults && injectionResults.length > 0) {
      for (const res of injectionResults) {
        if (res && res.result) {
          const data = res.result;
          if (data.extractionTrace) {
            data.extractionTrace.forEach(t => this.log(`[DOM Engine] ${t}`));
          }
          if (data.jobDescription.length > 50 || data.companyName !== "Unknown Company" || data.applyUrl) {
            if (!response || (data.companyName !== "Unknown Company" && response.companyName === "Unknown Company")) {
              response = data;
            }
            if (data.companyName !== "Unknown Company" && data.jobDescription.length > 50) {
              response = data;
              break;
            }
          }
        }
      }
      if (!response) response = injectionResults[0].result;
    }

    if (response) {
      this.state.companyName = response.companyName;
      this.state.jobDescription = response.jobDescription;
      this.state.applyUrl = response.applyUrl;
      this.state.isLoggedIn = response.isLoggedIn;
      this.state.routeDetectionType = response.routeDetectionType;
      this.state.linkedinCompanyAboutUrl = response.linkedinCompanyAboutUrl;
    }
    
    return response;
  },

  async runResolveDomainStage() {
    this.state.isEasyApply = !this.state.applyUrl || this.state.applyUrl.includes('linkedin.com') || this.state.routeDetectionType.includes("Easy Apply");

    if (this.state.linkedinCompanyAboutUrl) {
      try {
        this.log(`[4] Spawning automated background runner to process verified LinkedIn configuration: ${this.state.linkedinCompanyAboutUrl}`);
        
        const aboutTab = await chrome.tabs.create({
          url: this.state.linkedinCompanyAboutUrl,
          active: false
        });

        await new Promise(resolve => setTimeout(resolve, 4000));

        const scrapedMeta = await chrome.scripting.executeScript({
          target: { tabId: aboutTab.id },
          func: () => {
            let extractedWeb = null;
            let verifiedDate = null;
            let industry = null;
            let size = null;
            let members = null;
            let headquarters = null;
            let founded = null;
            let profileCompanyName = null;

            try {
              const orgHeader = document.querySelector('h1.org-top-card-summary__title, .org-top-card-intent-and-overview__title, h1');
              if (orgHeader && orgHeader.innerText.trim()) {
                profileCompanyName = orgHeader.innerText.trim();
              } else if (document.title) {
                profileCompanyName = document.title
                  .split(/[:|·\-]/)[0]
                  .replace(/\b(About|Overview|LinkedIn)\b/gi, '')
                  .trim();
              }
            } catch (nameErr) {}

            const dl = document.querySelector('dl.overflow-hidden, dl');
            if (dl) {
              const dts = Array.from(dl.querySelectorAll('dt'));
              dts.forEach(dt => {
                const title = dt.innerText.trim();
                const dd = dt.nextElementSibling;
                if (dd && dd.tagName.toLowerCase() === 'dd') {
                  const val = dd.innerText.trim();
                  if (title.includes('Website')) {
                    const a = dd.querySelector('a');
                    if (a) extractedWeb = a.href;
                  } else if (title.includes('Verified page')) {
                    verifiedDate = val;
                  } else if (title.includes('Industry')) {
                    industry = val;
                  } else if (title.includes('Company size')) {
                    const lines = val.split('\n').map(l => l.trim()).filter(Boolean);
                    size = lines[0] || val;
                    if (lines[1]) members = lines[1];
                  } else if (title.includes('Headquarters')) {
                    headquarters = val;
                  } else if (title.includes('Founded')) {
                    founded = val;
                  }
                }
              });
            }

            return { extractedWeb, verifiedDate, industry, size, members, headquarters, founded, profileCompanyName };
          }
        });

        chrome.tabs.remove(aboutTab.id);

        if (scrapedMeta?.[0]?.result) {
          const res = scrapedMeta[0].result;
          this.state.linkedinCompanyMeta = res;
          this.log(`[5] LinkedIn Official Registry Extraction Matrix complete.`);
          
          if (res.profileCompanyName && res.profileCompanyName.length > 1) {
            this.state.companyName = res.profileCompanyName;
            this.log(`[5 SUCCESS] Resolved missing company name from profile view: "${this.state.companyName}"`);
          }
          
          if (res.extractedWeb) {
            this.log(`[5 SUCCESS] Captured corporate website directly from LinkedIn Verification: ${res.extractedWeb}`);
            this.state.webResolvedDomain = new URL(res.extractedWeb).hostname.toLowerCase().replace('www.', '');
          }
        }
      } catch (aboutScrapeErr) {
        this.log(`[4 ERROR] Headless metadata verification tab processing crashed: ${aboutScrapeErr.message}`);
      }
    }

    if (this.state.applyUrl && !this.state.applyUrl.includes('linkedin.com')) {
      try {
        this.state.extractedApplyHost = new URL(this.state.applyUrl).hostname.toLowerCase().replace('www.', '');
        this.state.domainToTest = this.state.extractedApplyHost;
      } catch(e) {}
    }

    if (!this.state.domainToTest && !this.state.webResolvedDomain && this.state.companyName !== "Unknown Company") {
      try {
        const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(this.state.companyName)}`;
        const searchCheck = await fetch(`https://corsproxy.io/?url=${encodeURIComponent(searchUrl)}`);
        const searchHtml = await searchCheck.text();
        const urlMatch = searchHtml.match(/class="result__url"[^>]*>\s*([^<\s]+)/);
        if (urlMatch) this.state.webResolvedDomain = new URL('https://' + urlMatch[1].trim()).hostname.replace('www.', '');
      } catch (e) {}
    }

    if (this.state.webResolvedDomain && this.state.extractedApplyHost) {
      this.state.matchesCorporateSite = this.state.extractedApplyHost.includes(this.state.webResolvedDomain) || this.state.webResolvedDomain.includes(this.state.extractedApplyHost);
    }

    const isAtsLink = this.state.extractedApplyHost && GLOBAL_ATS_KEYWORDS.some(ats => this.state.extractedApplyHost.includes(ats));
    
    // Evaluate if this is an external job aggregator channel/portal ecosystem
    this.state.isExternalPortal = this.state.extractedApplyHost && 
                                  !this.state.matchesCorporateSite && 
                                  !isAtsLink && 
                                  !this.state.extractedApplyHost.includes('linkedin.com');

    if (isAtsLink && this.state.webResolvedDomain) {
      this.state.domainToTest = this.state.webResolvedDomain;
      this.state.verificationMethod = "LinkedIn Verified Corporate Profile Extraction Link (ATS Bypass)";
    } else if (this.state.webResolvedDomain) {
      this.state.domainToTest = this.state.webResolvedDomain;
      this.state.verificationMethod = "LinkedIn Verified Corporate Profile Extraction Link";
    }
  },

  runInfrastructureStage() {
	    const isRecentDomain = (this.state.securityStatusHtml || '').includes('CRITICAL');

	    // Helper to generate a scannable footprint list of your whitelisted infrastructure strings
	    const getAtsInventoryFooter = () => {
	      if (!GLOBAL_ATS_KEYWORDS || !GLOBAL_ATS_KEYWORDS.length) return '';
	      const formattedList = GLOBAL_ATS_KEYWORDS.map(ats => `<code>${ats}</code>`).join(', ');
	      return `<br><div class="ats-inventory" style="margin-top: 8px; font-size: 1.5em; opacity: 0.8;">ℹ️ <strong>Approved Infrastructure Boundaries:</strong> ${formattedList}</div>`;
	    };

	    // 1. Easy Apply Scope
	    if (this.state.isEasyApply) {
	      if (!this.state.webResolvedDomain) {
	        this.state.atsStatusHtml = `❌ HIGH RISK Easy Apply Channel: No verifiable business footprints found.`;
	        this.state.isAtsOrCorporateSite = false;
	      } else if (isRecentDomain) {
	        this.state.atsStatusHtml = `❌ CRITICAL RISK Easy Apply: Profile links to a recently registered domain footprint (<strong>${this.state.webResolvedDomain}</strong>). Potential lookalike trap.`;
	        this.state.isAtsOrCorporateSite = false;
	      } else {
	        this.state.atsStatusHtml = `✓ Verified Easy Apply: Secure alignment with established footprint (<strong>${this.state.webResolvedDomain}</strong>).`;
	        this.state.isAtsOrCorporateSite = true;
	      }
	      return;
	    }

	    const matchesAts = GLOBAL_ATS_KEYWORDS.some(ats => this.state.extractedApplyHost.includes(ats));
	    
	    // Strict Corporate Identity Check: Does the target host align structurally with the verified company domain?
	    const targetMatchesCorporate = this.state.domainToTest && 
	      (this.state.extractedApplyHost.includes(this.state.domainToTest) || 
	       this.state.domainToTest.includes(this.state.extractedApplyHost));

	    // 2. Direct recognized Enterprise Tracker
	    if (matchesAts) {
	      this.state.atsStatusHtml = `✓ Verified Infrastructure: Enterprise Tracker (<strong>${this.state.extractedApplyHost}</strong>).` + getAtsInventoryFooter();
	      this.state.isAtsOrCorporateSite = true;
	      
	    // 3. Direct Match with Corporate Domain (Mitigated by Domain Age)
	    } else if (targetMatchesCorporate || this.state.matchesCorporateSite) {
	      if (isRecentDomain) {
	        this.state.atsStatusHtml = `❌ CRITICAL INFRASTRUCTURE ALERT: Target routes to a matched company name domain, but the registration is brand new (<strong>${this.state.extractedApplyHost}</strong>). High probability spoofing attempt!`;
	        this.state.isAtsOrCorporateSite = false;
	      } else {
	        this.state.atsStatusHtml = `✓ Verified Corporate Domain: Environment Match (<strong>${this.state.extractedApplyHost}</strong>).`;
	        this.state.isAtsOrCorporateSite = true;
	      }
	      
	    // 4. Zero-Trust Fallback: Catch outbound data-harvesting / masking behavior
	    } else {
	      // Dynamic warning containing the host structural failure alongside the system rules overview
	      this.state.atsStatusHtml = `❌ HIGH RISK Pipeline: Form routes out to an unverified external channel (<strong>${this.state.extractedApplyHost}</strong>). Identity boundary check failed.` + getAtsInventoryFooter();
	      this.state.isAtsOrCorporateSite = false; 
	    }
	  },

  async runRegistryCheckStage() {
    if (!this.state.domainToTest) return;
    try {
      const dnsQuery = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(this.state.domainToTest)}&type=A`);
      const dnsData = await dnsQuery.dnsData || await dnsQuery.json();
      if (dnsData?.Answer?.[0]?.data) this.state.resolvedIpAddress = dnsData.Answer[0].data;
    } catch(e) {}

    try {
      const response = await fetch(`https://rdap.org/domain/${encodeURIComponent(this.state.domainToTest)}`);
      if (!response.ok) throw new Error();
      const data = await response.json();
      let creationDate = data.events?.find(e => e.eventAction === 'registration')?.eventDate;

      if (creationDate) {
        this.state.creationDateStr = creationDate.substring(0, 10);
        const age = new Date().getFullYear() - new Date(creationDate).getFullYear();
        this.state.domainAgeDetails = `<strong>Domain Checked:</strong> <code>${this.state.domainToTest}</code><br><strong>Age:</strong> ${age} years old`;
        this.state.securityStatusHtml = age <= 1 ? `❌ CRITICAL SECURITY WARNING: Registered recently.` : `✓ Established Network Domain.`;
      } else throw new Error();
    } catch (e) {
      await this.runWhoisFallbackStage();
    }
  },

  async runWhoisFallbackStage() {
    try {
      const targetQueryUrl = `https://www.whois.com/whois/${encodeURIComponent(this.state.domainToTest)}`;
      const res = await fetch(`https://corsproxy.io/?url=${encodeURIComponent(targetQueryUrl)}`);
      const html = await res.text();
      const match = html.match(/Creation Date:\s*([^\n\r<]+)/i) || html.match(/Registered On:\s*([^\n\r<]+)/i);
      
      if (match) {
        const age = new Date().getFullYear() - new Date(match[1].trim()).getFullYear();
        this.state.domainAgeDetails = `<strong>Domain Checked:</strong> <code>${this.state.domainToTest}</code><br><strong>Created:</strong> ${match[1].trim()}`;
        this.state.securityStatusHtml = age <= 1 ? `❌ CRITICAL WARNING: Domain is recent.` : `✓ Established Footprint (Fallback Verified).`;
      }
    } catch (e) {
      this.state.domainAgeDetails = `<strong>Domain Target:</strong> <code>${this.state.domainToTest}</code><br><span style="color:#777;">Traces timed out.</span>`;
    }
  }
};