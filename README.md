# payoffdeals ⚡
**Deterministic Systems Toolkit**  
Auditable. Deterministic. Performance-conscious.

---

## 📌 Overview

`payoffdeals` is a **modular, high-integrity toolkit** for:

- Browser/device fingerprinting  
- Memory-hard Proof-of-Work  
- High-performance adaptive data structures  
- Persistent graph storage  

Each module is **standalone**, but modules can be **combined into pipelines** for verification, scoring, or anti-abuse flows.  

**Core Philosophy:**  
We highlight **novel approaches and innovations** so developers, researchers, and engineers can **learn, showcase, and monetize their work**, while contributing to a **shared, evolving ecosystem**.  

---

## 🧱 Modules & Novel Approaches

| Module | File | Purpose | Novel Approaches / Innovations |
|--------|------|---------|-------------------------------|
| **PayOffFP** | `payoff-fp.js` | Deterministic browser/device fingerprinting | Multi-channel fusion (Canvas, GPU, Audio, native API), progressive telemetry, nonce-bound deterministic IDs, auditable & server-verifiable fused identity |
| **PayOffPoW** | `payoff-pow.js` | Memory-hard Proof-of-Work engine | Singleton WebWorker guard, deterministic SHA-256 ghost-state reset, adaptive memory-hard computation, client-side ticket signature verification |
| **PayoffAutomaton** | `PayoffAutomaton.java` | Lock-free, density-aware finite state transducer | Structural gravity for dense hub states, adaptive topology (linear ↔ jump-table), snapshot-on-read lock-free consistency, cache-optimized arcs |
| **FileSocialGraph** | `FileSocialGraph.java` | Persistent file-backed graph engine with REST API | Atomic sidecar index, segmented memory-mapped storage, self-healing index rebuilds, high-performance path lookup |

> Each module can be **showcased independently**, demonstrating its novel design and deterministic behavior — appealing for both **practical use and research citation**.

---

## 🛠 PayOffFP — Deterministic Fingerprinting

**Version:** v2.8.6 Extended  

### Highlights & Innovations

- Deterministic `fusedId` using **Canvas, GPU, Audio, and Native API**  
- **Progressive telemetry**: fast initial fingerprint → full fusedId later  
- Server-verifiable and auditable  
- Nonce-bound identity prevents replay  
- Portable & lightweight for web and multi-language servers  

> **Why it stands out:** Combines multiple fingerprinting channels deterministically and exposes a **transparent, auditable ID**, not commonly found in standard FP libraries.

---

## 🛡 PayOffPoW — Proof-of-Work Engine

**Version:** v7.5.4 “Omni Titan”  

### Highlights & Innovations

- Runs in a **Web Worker** with singleton guard  
- **Clock-skew tolerance**: 5 minutes for client-side clocks  
- Deterministic SHA-256 reset to zero “Ghost State” → avoids collisions  
- Adaptive memory-hard computation based on device capacity  
- Client-side Ed25519 ticket verification  
- Optional progress callbacks for non-blocking UI  

> **Why it stands out:** Combines **deterministic PoW, client verification, and memory adaptivity** in a single auditable design — rare in browser-side PoW engines.

---

## 🤖 PayoffAutomaton — Adaptive FST

### Highlights & Innovations

- **Structural Gravity**: prioritizes dense hub states for efficient path lookups  
- **Adaptive Topology**: automatically switches linear ↔ jump-table lookup  
- **Lock-Free Concurrency**: supports snapshot reads & concurrent updates  
- **Cache-Optimized Arcs** for L1/L2 performance  
- Supports **payoff accumulation** along paths  

> **Why it stands out:** Self-optimizing, lock-free, and memory-cache conscious FST — ideal for **real-time scoring or verification pipelines**.

---

## 📁 FileSocialGraph — Persistent Graph Engine

### Highlights & Innovations

- File-backed append-only graph with **atomic sidecar index**  
- **Segmented memory-mapped storage** for datasets >1GB  
- Self-healing index rebuilds for consistency & integrity  
- REST API endpoints: `/health`, `/backup`, `/path?start=A&end=B`  

> **Why it stands out:** High-performance, persistent, file-backed graph with robust **integrity guarantees** — suitable for offline or large-scale environments.

---

## 📊 Ecosystem Comparison

| Feature | PayOffFP | FPJS OSS | FPJS Enterprise | ThreatMetrix |
|---------|----------|----------|----------------|--------------|
| Deterministic ID | ✔️ | ❌ | ❌ Config | ❌ |
| Server Verification | ✔️ | ❌ | ❌ | ❌ |
| Canvas/WebGL/Audio | ✔️ | ✔️ | ✔️ | Partial |
| Native API Checks | ✔️ | ❌ | ✔️ | ✔️ |
| Behavioral / ML | ❌ | ✔️ | ✔️ | ✔️ |
| Open Source | ✔️ | ✔️ | ❌ | ❌ |
| Novelty / Auditable Design | ✔️ | ❌ | ❌ | ❌ |

> **Mobile tip:** Tables scroll horizontally if too wide.

---

## 🎯 Principles

- Deterministic & auditable outputs  
- Modular & standalone  
- Lightweight & high-performance  
- Extensible for telemetry, PoW, or scoring pipelines  

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

---

## ⚖️ License

Apache 2.0 — See `LICENSE` file.

---

