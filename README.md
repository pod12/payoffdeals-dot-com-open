# payoffdeals ⚡
**Deterministic Systems Toolkit**  
Auditable. Deterministic. Privacy-first. Performance-conscious.

---

## 📌 Overview

## 🌐 About PayOffDeals

**PayOffDeals** is a next generation Cashback & Benefits Platform developed by **Data Motifs**, with a strong emphasis on **User Privacy and Security**. Beyond innovating in the platform itself, we have also expanded our work into the **modular software components** that power it.  

Through this initiative, we share the **Deterministic, Auditable, and Privacy-First** solutions we have built, making them available to fellow developers and researchers.

- **Toolkit:** a modular ecosystem of high-integrity tools for fingerprinting, PoW, adaptive data structures, and persistent graphs.  
- **Philosophy:** deterministic outputs, reproducible results, no behavioral data collection, privacy-first.  
- **Target Audience:** developers, security engineers, researchers, and infrastructure teams.

**Modular Toolkit** for:

- Browser/device fingerprinting  
- Memory-hard Proof-of-Work  
- High-performance adaptive data structures  
- Persistent graph storage  

Each module is **standalone**, but modules can be **combined into pipelines** for verification, scoring, or anti-abuse flows.  
**Core philosophy:** deterministic outputs, reproducible results, and **no collection of personal behavioral data**.

---

## 🧱 Modules

| Module | File | Purpose |
|--------|------|---------|
| **PayOffFP** | `payoff-fp.js` | Deterministic browser/device fingerprinting |
| **PayOffFPBridge** | `payoff-fp-bridge.js` | Client-side bridge connecting PayOffFP telemetry to PayOffFPSecurityGateway |
| **PayOffPoW** | `payoff-pow.js` | Memory-hard Proof-of-Work engine |
| **PayoffAutomaton** | `PayoffAutomaton.java` | Lock-free, density-aware finite state transducer |
| **FileSocialGraph** | `FileSocialGraph.java` | Persistent file-backed graph engine with REST API |
| **PayOffFPSecurityGateway** | `PayOffFPSecurityGateway.java` | Server-side verification & anti-abuse engine using opaque fingerprint inputs |

> Modules are independent; use what you need or integrate them into pipelines.  
> **PayOffFPBridge** demonstrates how standalone modules can be incrementally composed into new pipelines without changing core logic.

---

## 🛠 PayOffFP — Deterministic Fingerprinting

**Version:** v2.8.6 Extended

Generates a **deterministic fusedId** using Canvas, GPU, Audio, and Native API **without collecting personal behavioral data**.  
Server-verifiable, auditable, lightweight, and reproducible.

### Key Features

- Canvas/WebGL fingerprint  
- Audio context fingerprint  
- Native API integrity checks  
- Nonce-bound fused identity  
- Progressive telemetry flow

### **Novel Approaches / Innovations**

- **Deterministic fusion of multiple entropy sources** (Canvas, GPU, Audio, Native API)  
- **Privacy-first design:** no AI/ML, no behavioral data collection, fully auditable  
- **Progressive telemetry:** partial identifiers first, full fusedId later  
- **Nonce-bound caching:** prevents replay attacks while keeping fingerprints reproducible  
- **Cross-language compatibility:** works in JS ↔ Java environments  

---

## 🔗 PayOffFPBridge — Client-Side Telemetry Bridge

**Version:** v1.5.4 Production Ready

Connects **PayOffFP telemetry** to **PayOffFPSecurityGateway** with resilience, observability, and cached device tier.

### Key Features

- Jittered exponential backoff for resilient telemetry  
- Hardware DNA anchor cookie for server verification  
- Device trust tiering: HIGH / STANDARD / LOW  
- Async-safe device classification (GPU, cores, touch points, battery)  
- Cached device tier for repeated calls  
- Optional observability via `attemptsUsed`  

### **Novel Approaches / Innovations**

- **Composable module design:** demonstrates incremental pipeline integration  
- **Privacy-first:** device attributes are opaque; neither the bridge nor gateway can reconstruct behavioral profiles  
- **Resilient telemetry:** jittered exponential backoff prevents server overload  
- **Device trust tier caching:** avoids redundant computation while maintaining determinism  

---

## 🛡 PayOffPoW — Proof-of-Work Engine

**Version:** v7.5.4 “Omni Titan”

- Runs inside a **Web Worker**  
- **Singleton guard:** prevents multiple concurrent workers  
- **Clock-skew tolerance:** 5 minutes  
- Deterministic SHA-256 state resets prevent ghost collisions  
- Client-side Ed25519 ticket verification  

### Highlights

- Adaptive memory-hard computation  
- Progress callbacks for UI responsiveness  
- Replay-token binding for security  
- Hardware fallback for constrained devices  

### **Novel Approaches / Innovations**

- **Deterministic memory-hard algorithm** optimized for constrained environments  
- **SHA-256 Ghost State reset**: prevents hash collisions across sessions  
- **Web Worker isolation** for non-blocking UI  
- **Client-side cryptographic ticket verification** ensures early detection of invalid requests  

---

## 🤖 PayoffAutomaton — Adaptive FST

- **Structural Gravity:** identifies dense hub states for optimal jumps  
- **Adaptive Topology:** dynamically switches between linear and jump-table lookups  
- **Lock-Free Concurrency:** redirect tombstones + volatile buffers allow concurrent reads/writes  
- **Cache-Friendly:** flag-based arc encoding optimized for L1/L2 cache  

Supports **payoff accumulation** along paths and is snapshot-safe for concurrent reads.

### **Novel Approaches / Innovations**

- **Built-in clustering:** reduces lookup overhead in dense state hubs (rare in FSTs)  
- **Adaptive state promotion:** automatically optimizes based on usage density  
- **Lock-free snapshot reads:** ensures consistency without blocking writers  

---

## 🛡 PayOffFPSecurityGateway — Server-Side Verification

**Version:** v4.2.8 Gold Standard

- Auditable, deterministic anti-abuse engine  
- Operates on opaque fingerprint telemetry from PayOffFP / PayOffFPBridge  
- Automated session pruning and HMAC-SHA256 anchoring  
- Device density and network velocity detection  

### **Novel Approaches / Innovations**

- **Opaque fingerprint operation:** privacy-first; inputs cannot be reverse-engineered  
- **Automated session management:** pruning expired sessions & maintaining concurrency  
- **Device density and bot heuristics:** prevents abuse without behavioral tracking  
- **Composable with client telemetry:** designed to accept modular PayOffFP / PayOffFPBridge flows  

---

## 📊 Finger Printing Ecosystem Comparison

FPJS - FingerprintJS

| Feature | PayOffFP | PayOffFPBridge | FPJS OSS | FPJS Enterprise | ThreatMetrix |
|---------|-----------|----------------|----------|----------------|--------------|
| Deterministic ID | ✔️ | ✔️ | ❌ | ❌ Config | ❌ |
| Server Verification | ✔️ | ✔️ | ❌ | ❌ | ❌ |
| Canvas/WebGL/Audio | ✔️ | ✔️ | ✔️ | ✔️ | Partial |
| Native API Checks | ✔️ | ✔️ | ❌ | ✔️ | ✔️ |
| Behavioral / ML | ❌ | ❌ | ✔️ | ✔️ | ✔️ |
| Privacy-First | ✔️ | ✔️ | ❌ | ❌ | ❌ |
| Open Source | ✔️ | ✔️ | ✔️ | ❌ | ❌ |

---

## 🎯 Principles

- Deterministic & auditable outputs  
- Modular & standalone  
- Privacy-first (no behavioral data collection; opaque inputs)  
- Lightweight & high-performance  
- Extensible for telemetry, PoW, or scoring pipelines  

---

## ⚖️ License

Apache 2.0 — See `LICENSE` file.

---

## ⚠️ Limitations

- No behavioral ML scoring  
- No bundled backend services  
- Fingerprint entropy varies by environment  

---

## 🚀 Intended Use

- Infrastructure protection  
- Deterministic verification  
- Performance testing  
- Anti-abuse flows  

> Not intended for unlawful surveillance or misuse.
