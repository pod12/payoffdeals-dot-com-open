# ARCHANGEL-V8 Simulator

**Safe Reference Implementation of an Immune-Bound Autonomous Agent**

---

## Overview

ARCHANGEL-V8 is a **training and simulation module** demonstrating the design of an autonomous software agent. It is **100% safe for open-source release**.

Key Features:

- **DNA Verification (Mandatory Heartbeat):** Ensures integrity; without it, the agent terminates.
- **Host Challenge / Symmetric Interrogation:** Simulated verification of live agent identity; prevents replay attacks.
- **Simulated Replication:** Conceptual demonstration only; no real replication occurs.
- **Resource Throttle / CPU Tax:** Prevents misuse in automated or high-frequency attacks.

> **Important:** This simulator is in **Training Mode** by default. No private keys, network, file, or destructive operations are included.

---

## Architecture

1. **DNA Verification (Heartbeat)**
   - Each generation validates its DNA signature (simulated in this module).  
   - Mandatory for survival — acts as the agent's heartbeat.  

2. **Host Challenge**
   - The host can issue a nonce to verify the agent is live.  
   - Fully simulated for educational purposes.  

3. **Behaviors**
   - `identityResponse`: mandatory heartbeat behavior; agent responds to host queries.  
   - `scan`: simulates scanning a target, e.g., memory anomalies.  
   - Additional behaviors can be added safely in Training Mode.  

4. **Replication Concept**
   - Conceptual only; demonstrates passing DNA, signature, and state to next generation.  
   - Controlled via `hostContext.canReplicate`.  

5. **Resource Throttle**
   - CPU-intensive loop in each generation simulates mandatory “tax.”  
   - Ensures the agent cannot be weaponized for automated attacks.

---

## Getting Started

```bash
# Run the simulator (Node.js >= 16)
node ARCHANGEL-V8-simulator.js
