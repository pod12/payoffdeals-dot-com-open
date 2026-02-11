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

> **Core Philosophy:**  
> Each module is **deterministic, auditable, and performance-conscious**. Innovations are highlighted to attract developers and researchers, while remaining fully reproducible and transparent.

---

## 🧱 Modules

| Module | File | Purpose |
|--------|------|---------|
| **PayOffFP** | `payoff-fp.js` | Deterministic browser/device fingerprinting |
| **PayOffPoW** | `payoff-pow.js` | Memory-hard Proof-of-Work engine |
| **PayoffAutomaton** | `PayoffAutomaton.java` | Lock-free, density-aware finite state transducer |
| **FileSocialGraph** | `FileSocialGraph.java` | Persistent file-backed graph engine with REST API |

> Modules are independent; integrate only what you need, or compose full verification pipelines.

---

# 🛠 PayOffFP — Deterministic Fingerprinting

**Version:** v2.8.6 Extended  

### Core Functionality
- Generates deterministic `fusedId` using **Canvas, GPU, Audio, Native API**  
- Optional **progressive telemetry**: fast partial fingerprint first, full fusedId later  
- Server-verifiable, lightweight, and auditable  

### **Novel Approaches / Innovations**
- **Progressive telemetry**: first sends partial identifiers for low-latency verification, then full fusedId asynchronously.  
- **Cross-signal fusion**: combines multiple entropy sources (canvas, GPU, audio, device APIs) for a deterministic yet robust identifier.  
- **Nonce-bound caching**: prevents replay attacks while keeping fingerprints reproducible.  

---

# 🛡 PayOffPoW — Memory-Hard Proof-of-Work

**Version:** v7.5.4 “Omni Titan”  

### Core Functionality
- Runs in a **Web Worker** to avoid blocking UI  
- **Singleton guard:** prevents multiple concurrent PoW processes  
- **Clock-skew tolerance:** 5-minute leeway for client clocks  
- Deterministic SHA-256 resets prevent ghost collisions  
- Client-side Ed25519 ticket verification  

### **Novel Approaches / Innovations**
- **Adaptive memory-hard computation**: dynamically adjusts memory usage based on device capabilities.  
- **Replay-token binding**: ensures PoW solutions are single-use and context-specific.  
- **Progressive SHA-256 hashing with yields**: balances CPU load while allowing UI responsiveness.  

---

# 🤖 PayoffAutomaton — Adaptive Lock-Free FST

### Core Functionality
- **Lock-free concurrency**: supports safe multi-threaded reads/writes with tombstones + volatile buffers  
- **Cache-friendly**: flag-based arcs and optimized node layouts  
- **Snapshot-on-read**: enables consistent reads without locks  

### **Novel Approaches / Innovations**
- **Structural gravity for hubs**: automatically identifies dense nodes and optimizes jump tables — a rare design in FSTs.  
- **Adaptive topology switching**: linear vs jump-table lookups are chosen dynamically per hub.  
- **Payoff accumulation along paths**: allows deterministic scoring / weighting of transitions without locks.  

> **Research-ready:** These features make it suitable for experimental or high-performance state machine designs.

---

# 📁 FileSocialGraph — Persistent Graph Engine

### Core Functionality
- File-backed append-only graph  
- Atomic sidecar index for fast lookups  
- REST API: `/health`, `/backup`, `/path?start=A&end=B`  
- Self-healing index rebuild  
- Segmented mmap for datasets >1GB  

### **Novel Approaches / Innovations**
- **Hybrid storage + index**: enables persistent graph access with fast queries.  
- **Segmented memory mapping**: efficiently handles very large datasets with minimal RAM footprint.  
- **Self-healing index**: automatic recovery of corrupted or incomplete data structures.  

---

# 📊 Ecosystem Comparison

| Feature | PayOffFP | FPJS OSS | FPJS Enterprise | ThreatMetrix |
|---------|-----------|----------|----------------|--------------|
| Deterministic ID | ✔️ | ❌ | ❌ Config | ❌ |
| Server Verification | ✔️ | ❌ | ❌ | ❌ |
| Canvas/WebGL/Audio | ✔️ | ✔️ | ✔️ | Partial |
| Native API Checks | ✔️ | ❌ | ✔️ | ✔️ |
| Nonce-Bound / Anti-Replay | ✔️ | ❌ | ❌ | ❌ |
| Progressive Telemetry | ✔️ | ❌ | ❌ | ❌ |
| Lock-Free FST / Cluster Hubs | ❌ | ❌ | ❌ | ❌ |
| Open Source | ✔️ | ✔️ | ❌ | ❌ |

---

# 🎯 Principles

- Deterministic & auditable outputs  
- Modular & standalone  
- Lightweight & high-performance  
- Extensible for telemetry, PoW, scoring, or automation pipelines  

---

# ⚖️ License

Apache 2.0 — See `LICENSE` file.

---

# ⚠️ Limitations

- Not a full behavioral / ML scoring platform  
- No bundled backend services  
- Fingerprint entropy varies by environment  

---

# 🚀 Intended Use

- Infrastructure protection  
- Deterministic verification  
- Performance testing  
- Anti-abuse flows  

> **Important:** Not intended for unlawful surveillance or misuse.  

