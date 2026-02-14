# payoffdeals ⚡
**Deterministic Systems Toolkit** — Practical, deterministic anti-abuse stack for platforms that want control without surveillance.

---

## 📌 Overview

**PayOffDeals** is a next-generation Cashback & Benefits Platform developed by **Data Motifs**, emphasizing **User Privacy and Security**. Beyond the platform itself, we’ve developed **modular software components** that implement **deterministic, auditable, privacy-first designs**, making them available for developers, security engineers, and researchers.  

> Each component stands alone, but they can also be combined into pipelines for verification, scoring, or anti-abuse flows.

---

## 💡 Why this repo exists (A Reference Implementation)

High-level client-side security is often hidden behind enterprise paywalls. We believe that **Deterministic Security** should be accessible to every developer building for the web.

This repository serves as a **Reference Architecture** for a multi-layered defense-in-depth pipeline. Whether you use the components directly or simply use the logic as a blueprint for your own "build from scratch" journey, this repo aims to provide the community with a high-integrity alternative to traditional, "black-box" solutions.

---

## 🧱 Components

| Component | File | Layer | Purpose |
|-----------|------|-------|---------|
| **PayOffGuardian** | `pod-guardian.js` | Client | Intelligence Layer: Ultra-hardened client-side DOM & resource security |
| **PayOffGuardianSW** | `pod-guardian-sw.js` | Service Worker | Execution Layer: Network-level domain revocation |
| **PayOffFP** | `payoff-fp.js` | Client | Deterministic browser/device fingerprinting |
| **PayOffFPBridge** | `payoff-fp-bridge.js` | Client | Telemetry bridge to `PayOffFPSecurityGateway` |
| **PayOffPoW** | `payoff-pow.js` | Client | Memory-hard Proof-of-Work engine |
| **PayoffAutomaton** | `PayoffAutomaton.java` | Server | Lock-free, density-aware finite state transducer |
| **FileSocialGraph** | `FileSocialGraph.java` | Server | Persistent file-backed graph engine with REST API |
| **PayOffFPSecurityGateway** | `PayOffFPSecurityGateway.java` | Server | Server-side verification & anti-abuse engine |
| **CommBridge** | `payoff-comm-bridge.js` | Client | Secure, server-verified multi-tab communication and replay-safe event bus |

---

## 🔗 Reference Architecture

The payoffdeals Toolkit follows a **deterministic, multi-layer pipeline** to protect applications end-to-end:

```text
[ Browser DOM ]
        ↓
[ PayOffGuardian (Main Thread) ]
        ↓
[ PayOffGuardianSW (Service Worker) ]
        ↓
[ PayOffFP + PayOffPoW ]
        ↓
[ CommBridge (Multi-Tab Bus) ]
        ↓
[ PayOffFPSecurityGateway ]
        ↓
[ Deterministic Enforcement Engine ]
```

**Sample Flow**

1. **Browser DOM** – The primary interface and potentially hostile environment we are protecting against unauthorized manipulation.
2. **PayOffGuardian (Main Thread)** – The front-line observer. It monitors DOM mutations, scrutinizes inline scripts, and audits the **Shadow DOM** for anomalies.
3. **PayOffGuardianSW (Service Worker)** – Operates at the network level to enforce revocation policies and intercept/block unauthorized outgoing requests before they leave the browser.
4. **PayOffFP + PayOffPoW** – A dual-purpose validation layer that generates deterministic device fingerprints and requires memory-hard **Proof-of-Work (PoW)** to authenticate high-value requests.
5. **PayOffFPSecurityGateway** – Server-side verification and anti-abuse processing.
6. **Deterministic Enforcement Engine** – The "brain" of the system. It makes final, rule-based decisions to ensure all security actions are reproducible, auditable, and consistent.


**Key Security Benefits**

| Layer | Primary Defense | Mechanism |
| :--- | :--- | :--- |
| **Client** | Integrity Monitoring | MutationObserver & Shadow DOM Auditing |
| **Network** | Request Validation | Service Worker Interception & PoW |
| **Server** | Abuse Prevention | Deterministic Fingerprinting & Gateway Verification |

---

## 🛡 CommBridge — Secure, Multi-Tab Client Bus

**Version:** v1.7.1 
**File:** `payoff-comm-bridge.js`  

**Purpose:** High-integrity inter-tab communication with server-verified trust, preventing spoofing, replay attacks, and unauthorized tab operations.

**Key Features:**  
- Hybrid Transport: BroadcastChannel only (memory-only, no localStorage)
- Leader/Follower Model: Only server-verified "Leader" tabs authorize messages 
- Session Trust Token: Server-issued key ensures authenticity 
- Replay Prevention: Timestamp and recent-message cache 
- Rate Limiting / Handshake Debounce: Prevents accidental or malicious flooding 
- Once-only Subscriptions: Automatic cleanup after first invocation

**Novel Approaches / Innovations:**  
- Transparent handshake protocol for establishing trust between tabs
- Demonstrates secure inter-tab coordination without hidden logic 
- ully modular and standalone; compatible with PayOffFP / PayOffGuardian pipelines

**Security Benefits**

| Layer | Protection | Mechanism |
|-------|-----------|-----------|
| Transport | High-speed, memory-only communication | SOP-isolated BroadcastChannel |
| Trust | Server-verified tab identity | `verifyWithServer()` endpoint ensures only valid leaders broadcast messages |
| Integrity | Replay prevention | Recent-message cache with timestamps |
| Stability | DoS / flooding protection | Handshake rate-limiting and per-tab message rate cap |
| Client Safety | Minimal attack surface | Memory-only bus, no persistent storage of sensitive tokens |

**Pro Tips for Adoption**
- Session Token Placement: Generate or receive the server token early in the app lifecycle to avoid race conditions.  
- Rate Limits: Default limits (5–10 messages per tab per second) protect legitimate traffic from accidental flooding.  
- Extensibility: Can be extended to additional transport layers (e.g., ServiceWorker) if needed.  
- Open Source Philosophy: Fully transparent; endpoints are placeholders for developer implementation.

**Usage Examples**
All examples are commented out to ensure safe copy-paste adoption.

```javascript
// 1. Listening for secure logout
// CommBridge.on('AUTH_SYNC', (payload) => {
//     if (payload.action === 'LOGOUT') window.location.href = '/login';
// });

// 2. Emitting secure events (from a verified tab)
// // CommBridge.setVerifiedToken(serverToken); // Must be called once server verifies tab
// // CommBridge.emit('AUTH_SYNC', { action: 'LOGOUT' });

// 3. One-time handshake
// CommBridge.once('VERSION_CHECK', (data) => {
//     console.log('App version received from peer tab:', data.version);
// });
```
---

## 🛡 PayOffGuardian — Zero-Trust DOM Security (Client)

**Version:** v1.0.0 Production Ready  
**File:** `pod-guardian.js`  

**Purpose:** Ultra-hardened client-side DOM & resource security.  

**Key Features:**  
- Shadow-Piercer: Monitors Light and Shadow DOM roots recursively  
- Tiered Inspection: Immediate scan for high-risk nodes; idle-time scan for structural nodes  
- Critical Violation Alerts: Notifies on high-risk threats  
- Protocol Hardening: Blocks suspicious URI schemes (`data:`, `blob:`, `javascript:`)  
- Network Revocation: Works with `PayOffGuardianSW`  
- Learning Mode: Logs violations without blocking traffic  
- Runtime Dashboard & Toast Alerts  

**Novel Approaches / Innovations:**  
- Hybrid Threading (Main Thread + SW)  
- Zero-Latency Activation (`skipWaiting` + `clients.claim()`)  
- Deterministic & Auditable enforcement  
- Critical Node Prioritization  

**Quick Start**

To initialize the main thread guardian:

```javascript
const guardian = new PayOffGuardian({
  mode: 'deterministic',
  enforceShadowDOM: true
});

guardian.observe();
```
---

### PayOffGuardianSW — Network Enforcement Layer

**File:** `pod-guardian-sw.js`  

**Purpose:** Network-level domain revocation.  

**Novel Approaches / Innovations:**  
- Low-latency execution outside main thread  
- Complements DOM monitoring with network enforcement  

---

### PayOffFP — Deterministic Fingerprinting (Client)

**File:** `payoff-fp.js` | **Version:** v2.8.6 Extended  

**Key Features:**  
- Canvas/WebGL fingerprint  
- Audio context fingerprint  
- Native API integrity checks  
- Deterministic fusedId  
- Nonce-bound caching prevents replay attacks  

**Novel Approaches / Innovations:**  
- Progressive telemetry: partial IDs first, fusedId later  
- Cross-language compatibility (JS ↔ Java)  
- Fully auditable and server-verifiable  

---

### PayOffFPBridge — Client-Side Telemetry Bridge

**File:** `payoff-fp-bridge.js` | **Version:** v1.5.4  

**Purpose:** Connects `PayOffFP` telemetry to `PayOffFPSecurityGateway`.  

**Key Features:**  
- Jittered exponential backoff for resilience  
- Hardware DNA anchor cookie for server verification  
- Device trust tiering: HIGH / STANDARD / LOW  
- Cached device tier for repeated calls  

**Novel Approaches / Innovations:**  
- Composable module design for incremental pipelines  
- Privacy-first: attributes opaque to bridge & gateway  
- Avoids redundant computation while maintaining determinism  

---

### PayOffPoW — Memory-Hard Proof-of-Work Engine

**File:** `payoff-pow.js` | **Version:** v7.5.4  

**Key Features:**  
- Runs in Web Worker for non-blocking UI  
- Deterministic SHA-256 state resets  
- Clock-skew tolerant  
- Client-side Ed25519 ticket verification  

**Novel Approaches / Innovations:**  
- Deterministic memory-hard algorithm  
- Replay-token binding ensures security  
- Web Worker isolation + progress callbacks  

---

### PayoffAutomaton — Adaptive FST (Server)

**File:** `PayoffAutomaton.java`  

**Key Features:**  
- Structural gravity for dense hub states  
- Adaptive topology (linear/jump-table)  
- Lock-free concurrency and snapshot-safe reads  
- Cache-friendly encoding  

**Novel Approaches / Innovations:**  
- Built-in clustering for dense states  
- Adaptive state promotion  
- Lock-free snapshot reads  

---

### FileSocialGraph — Persistent Graph Engine (Server)

**File:** `FileSocialGraph.java`  

**Key Features:**  
- File-backed graph storage  
- REST API  
- Optimized for concurrency and density-aware updates  

**Novel Approaches / Innovations:**  
- Persistent, high-integrity graph storage  
- Snapshot-safe concurrent updates  

---

### PayOffFPSecurityGateway — Server-Side Verification

**File:** `PayOffFPSecurityGateway.java` | **Version:** v4.2.8  

**Key Features:**  
- Deterministic anti-abuse engine  
- Operates on opaque fingerprint telemetry  
- Automated session pruning & HMAC-SHA256 anchoring  
- Device density and network velocity detection  

**Novel Approaches / Innovations:**  
- Privacy-first: opaque inputs cannot be reverse-engineered  
- Automated session management  
- Composable with client telemetry pipelines  

---

## 📊 Fingerprinting Ecosystem Comparison

| Feature | PayOffFP | PayOffFPBridge | FPJS OSS | FPJS Enterprise | ThreatMetrix |
|---------|-----------|----------------|-----------|----------------|--------------|
| Deterministic ID | ✔️ | ✔️ | ❌ | ❌ Config | ❌ |
| Server Verification | ✔️ | ✔️ | ❌ | ❌ | ❌ |
| Canvas/WebGL/Audio | ✔️ | ✔️ | ✔️ | ✔️ | Partial |
| Native API Checks | ✔️ | ✔️ | ❌ | ✔️ | ✔️ |
| Behavioral / ML | ❌ | ❌ | ✔️ | ✔️ | ✔️ |
| Privacy-First | ✔️ | ✔️ | ❌ | ❌ | ❌ |
| Open Source | ✔️ | ✔️ | ✔️ | ❌ | ❌ |

---

## 📊 Industry Comparison & Ratings

| Metric | Industry Giants (Akamai, Cloudflare) | payoffdeals Toolkit | Rating |
|--------|------------------------------------|-------------------|--------|
| Detection Speed | High (ML pattern matching) | Instant (Deterministic block) | 🛡️ Superior |
| Privacy Compliance | Low (Collects PII) | Absolute (No PII collected) | 💎 Elite |
| Bypass Resistance | Medium (Bots mimic human jitter) | High (Bots can't mimic physics) | 💪 Strong |
| Transparency | Black Box | Open Source | 📖 Unmatched |
| Ease of Use | Plug-and-play | Modular (Requires engineering) | 🛠️ Dev-Centric |

---

## 💡 Future Modules & Research Directions

- **PayOffProxyDetect:** Deterministic detection of VPN/proxy usage without centralized Geo-IP databases  
- **PayOffIntegrity:** Uses Web Integrity API to verify that the browser/environment hasn’t been tampered with  

> Goal: adoption of deterministic, auditable security principles.  

---

## 🎯 Principles

- Deterministic & auditable outputs  
- Modular & standalone  
- Privacy-first (no behavioral data collection)  
- Lightweight & high-performance  
- Novel approaches highlighted in each component  

---

## 🚀 Intended Use

- Infrastructure protection and DOM/network hardening  
- Anti-abuse flows (bots, automated scripts, fraud)  
- Deterministic verification and reproducible audits  
- Research and educational purposes  

---

## ⚖️ License

Apache 2.0 — See `LICENSE` file.
