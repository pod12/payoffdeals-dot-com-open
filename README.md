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

| Module | File | Version | Purpose |
|--------|------|---------|---------|
| **PayOffFP** | `payoff-fp.js` | v2.8.6 Extended | Deterministic browser/device fingerprinting |
| **PayOffFPBridge** | `PayOffFPBridge.java` | v1.0.0 | Integration layer linking deterministic fingerprints to server validation |
| **PayOffPoW** | `payoff-pow.js` | v7.5.4 “Omni Titan” | Memory-hard Proof-of-Work engine |
| **PayoffAutomaton** | `PayoffAutomaton.java` | v1.3.2 | Lock-free, density-aware finite state transducer |
| **FileSocialGraph** | `FileSocialGraph.java` | v2.1.0 | Persistent file-backed graph engine with REST API |
| **PayOffFPSecurityGateway** | `PayOffFPSecurityGateway.java` | v4.2.8 “Gold Standard” | Server-side anti-abuse and device registry with privacy-first design |

> Modules are independent; use what you need or integrate them into pipelines.

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

## 🛡 PayOffFPBridge — Deterministic Fingerprint Integration Layer

**Version:** v1.0.0  

Acts as a **bridge between client-side fingerprinting (PayOffFP) and server-side validation**, allowing modular pipelines to **consume deterministic fused IDs** safely.  

### Key Features

- Bridges **browser/device fingerprinting** to backend validation  
- **Session-aware**: helps server track legitimate sessions without storing raw identifiers  
- **Non-intrusive**: operates with minimal footprint and deterministic outputs  

### **Novel Approaches / Innovations**

- **Incremental modular design**: standalone, can be plugged into existing pipelines without modifying core logic  
- **Privacy-first computation**: identifiers are **opaque**, irreversible, and cannot reveal device-specific PII  
- **Server-verifiable**: enables backend systems to verify fingerprints **without storing sensitive info**  
- **Deterministic fusion**: preserves reproducibility across sessions and devices  

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

## 📁 FileSocialGraph — Persistent Graph Engine

- File-backed append-only graph with **atomic sidecar index**  
- REST API endpoints: `/health`, `/backup`, `/path?start=A&end=B`  
- Self-healing index rebuild for integrity  
- Segmented mmap for large datasets (1GB+)  

### **Novel Approaches / Innovations**

- **Persistent append-only graph** for auditability and reproducibility  
- **Segmented mmap storage** for extremely large datasets  
- **Self-healing index** reduces corruption risk  
- **REST API exposure** allows lightweight integration with other systems  

---

## 🛡 PayOffFPSecurityGateway — Anti-Abuse & Device Registry

**Version:** v4.2.8 “Gold Standard”  

Provides a **high-integrity, server-side anti-abuse layer** leveraging deterministic fingerprints, session heuristics, and adaptive device registries.  

### Key Features

- Automated session pruning and HMAC-SHA256 anchoring  
- Bloom filter-based device registry for **fast, memory-efficient tracking**  
- Multi-user density checks and network velocity validation  
- Bot detection heuristics via renderer and hardware signals  

### **Novel Approaches / Innovations**

- **Privacy-first design**: device identifiers are cryptographically obfuscated and non-reversible  
- **Adaptive anti-abuse logic**: detects impossible travel, excessive user density, and virtual renderers  
- **Incremental session management**: lock-free, cache-friendly, high-performance pruning  
- **Server-side auditability**: metrics and registry updates are fully auditable without exposing raw device data  
- **Hardened cryptography**: HMAC-SHA256 ensures fused IDs remain secure even if system internals are exposed  

### **Privacy-First Philosophy**

Even though this module uses fingerprinting for anti-abuse:  

- All computations rely on **opaque, fused identifiers**  
- No raw device/browser information is ever persisted in a recoverable form  
- Identifiers are **irreversible**, ensuring **user privacy is preserved**  
- Fully auditable design allows verification of behavior **without exposing personal data**  

---

## 📊 Finger Printing Ecosystem Comparison

FPJS - FingerprintJS

| Feature | PayOffFP | FPJS OSS | FPJS Enterprise | ThreatMetrix |
|---------|-----------|----------|----------------|--------------|
| Deterministic ID | ✔️ | ❌ | ❌ Config | ❌ |
| Server Verification | ✔️ | ❌ | ❌ | ❌ |
| Canvas/WebGL/Audio | ✔️ | ✔️ | ✔️ | Partial |
| Native API Checks | ✔️ | ❌ | ✔️ | ✔️ |
| Behavioral / ML | ❌ | ✔️ | ✔️ | ✔️ |
| Privacy-First | ✔️ | ❌ | ❌ | ❌ |
| Open Source | ✔️ | ✔️ | ❌ | ❌ |

---

## 🎯 Principles

- Deterministic & auditable outputs  
- Modular & standalone  
- Privacy-first (no behavioral data collection)  
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
