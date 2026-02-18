# ARCHANGEL-V8 Simulator

**Safe Open-Source Simulator of an Immune-Bound Autonomous Agent**

---

## Overview

ARCHANGEL-V8 is a **reference implementation** demonstrating the design of an autonomous software agent that:

- Self-verifies its **DNA** (immutable behavior blueprint)
- Maintains a **heartbeat** via mandatory behaviors
- Responds to **host interrogation** (challenge-response)
- Demonstrates **replication conceptually** without executing destructive actions

This simulator is **100% safe for open-source release** and is intended for **learning, experimentation, and research purposes only**.

> **Important:** This module is in **Training Mode**. No private keys, real network, file, or replication operations are included.

---

## Architecture

### 1. DNA Verification (Mandatory Heartbeat)
- Every agent generation validates its DNA against a signature (simulated in this module).  
- Ensures the agent’s integrity and prevents tampering.  
- Acts as the “heartbeat” — without it, the agent will terminate.

### 2. Host Challenge / Symmetric Interrogation
- The host can issue a random challenge to verify the agent is a live authorized entity.  
- Prevents replay attacks in theory.  
- Fully simulated here; no private keys are shipped.

### 3. Behaviors
- `identityResponse`: mandatory heartbeat; agent responds to host queries.  
- `scan`: simulates scanning a target (e.g., memory anomalies).  
- Other behaviors can be added **safely in training mode**, always logged instead of executed.

### 4. Replication (Simulation Only)
- Conceptual replication logic included for demonstration.  
- No actual file or network-based replication occurs.  
- Replication is gated by `hostContext.canReplicate` and **Training Mode**.

### 5. Resource Throttle
- CPU-intensive loop in each generation simulates a **mandatory “tax”**, preventing misuse for automated attacks.

---

## Safety Guidelines

- **Training Mode ON:** Safe defaults; logs simulated actions.  
- **Never deploy in production:** This simulator does not contain God Seed private keys.  
- **Immutable DNA:** `deepFreeze` ensures in-memory DNA integrity.  
- **Ethical Framing:** Intended for defensive architecture study only.

---

## Getting Started

```bash
# Run the simulator (Node.js >= 16)
node ARCHANGEL-V8-simulator.js
