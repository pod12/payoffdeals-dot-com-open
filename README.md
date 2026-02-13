# payoffdeals ⚡
**Deterministic Systems Toolkit** — Practical, deterministic anti-abuse stack for platforms that want control without surveillance.

---

## 📌 Overview

**PayOffDeals** is a next-generation Cashback & Benefits Platform developed by **Data Motifs**, with a strong emphasis on **User Privacy and Security**. Beyond innovating in the platform itself, we have also expanded our work into **modular software components** that power it.  

Through this initiative, we share the **Deterministic, Auditable, and Privacy-First** solutions we have built, making them available to fellow developers and researchers.

---

## 🧱 Modules

| Module | File | Layer | Purpose |
|--------|------|-------|---------|
| **PayOffGuardian** | `pod-guardian.js` | Client | **Intelligence Layer:** Ultra-hardened client-side DOM & resource security. |
| **PayOffGuardianSW** | `pod-guardian-sw.js` | Service Worker | **Execution Layer:** Network-level domain revocation. |
| **PayOffFP** | `payoff-fp.js` | Client | Deterministic browser/device fingerprinting. |
| **PayOffFPBridge** | `payoff-fp-bridge.js` | Client | Connects PayOffFP telemetry to SecurityGateway. |
| **PayOffPoW** | `payoff-pow.js` | Client | Memory-hard Proof-of-Work engine. |
| **PayoffAutomaton** | `PayoffAutomaton.java` | Server | Lock-free, density-aware finite state transducer. |
| **FileSocialGraph** | `FileSocialGraph.java` | Server | Persistent file-backed graph engine with REST API. |
| **PayOffFPSecurityGateway** | `PayOffFPSecurityGateway.java` | Server | Server-side verification & anti-abuse engine. |

---

## 🛡 PayOffGuardian — Zero-Trust DOM Security

**Version:** v1.0.0 Production Ready  
**Architecture:** Intelligence (Main Thread) + Execution (Service Worker)

PayOffGuardian creates a hardened shell around your application. It treats the DOM as a potentially hostile environment, monitoring for unauthorized mutations and resource injections in real-time using a deterministic "Known-Good" model.

### Key Features
- **Shadow-Piercer:** Recursively monitors both Light DOM and Shadow DOM roots for malicious injections.  
- **Tiered Inspection:** Immediately scans high-risk nodes (`<script>`, `<iframe>`, `<form>`, `<embed>`, `<object>`) while offloading structural nodes to background idle time via `requestIdleCallback`.  
- **Critical Violation Alerts:** Notifies the user immediately on the first high-risk threat to prevent potential data corruption.  
- **Protocol Hardening:** Blocks suspicious URI schemes (e.g., `data:`, `blob:`, `javascript:`) used in XSS payloads.  
- **Network Revocation:** Communicates with `pod-guardian-sw.js` to perform hardware-level blocking of unauthorized outbound requests.  
- **Learning Mode:** Logs security violations without blocking traffic, allowing safe tuning of the whitelist during initial deployment.  
- **Runtime Dashboard & Toast Alerts:** Provides real-time counts of scanned nodes, blocked violations, and current protection state.

### **Novel Approaches / Innovations**
- **Hybrid Threading:** Splits logic between the Main Thread and Service Worker to ensure protection even under heavy UI load.  
- **Zero-Latency Activation:** Optimized Service Worker lifecycle using `skipWaiting` and `clients.claim()` ensures network control from the first page load.  
- **Deterministic & Auditable:** All detection and enforcement decisions are rule-based and fully reproducible.

---

## 🛠 PayOffFP — Deterministic Fingerprinting

Generates a **deterministic fusedId** using Canvas, GPU, Audio, and Native API without collecting personal behavioral data.

### Key Features
- **Deterministic Fusion:** Fuses multiple entropy sources into a single reproducible ID.  
- **Privacy-First:** No AI/ML or behavioral tracking; fully auditable.  
- **Nonce-Bound Caching:** Prevents replay attacks while maintaining fingerprint reproducibility.

---

## 📊 Security Ecosystem Comparison

| Feature | **PayOffGuardian** | **PayOffFP** | FPJS OSS | ThreatMetrix |
|---------|-----------------|-----------|----------|--------------|
| **Core Goal** | **DOM Integrity** | Identity | Identity | Identity |
| **Deterministic** | ✔️ | ✔️ | ❌ | ❌ |
| **Shadow DOM Support** | ✔️ | N/A | ❌ | Partial |
| **Network-Level Block** | ✔️ (via SW) | ❌ | ❌ | ❌ |
| **Critical Violation Alerts** | ✔️ | N/A | ❌ | ❌ |
| **Privacy-First** | ✔️ | ✔️ | ❌ | ❌ |

---

## 🎯 Principles

- **Deterministic & Auditable:** Outputs and blocks are based on explicit rules, not opaque scores.  
- **Privacy-First:** No behavioral data collection; uses structural validation and opaque inputs.  
- **High Performance:** Optimized for 60fps UI performance via asynchronous scanning and idle-time processing.  
- **Standalone or Pipelined:** Use modules individually or chain them for a full verification stack.

---

## 🚀 Intended Use

- **Infrastructure Protection:** Hardening dashboards and financial platforms against XSS.  
- **Anti-Abuse Flows:** Verifying device integrity and preventing automated bot interactions.  
- **Deterministic Verification:** Systems requiring reproducible security audits.

---

## ⚖️ License

Apache 2.0 — See `LICENSE` file.
