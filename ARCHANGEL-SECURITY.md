# ARCHANGEL-V8 Security Guidelines

## Purpose
Guidance for safe usage of ARCHANGEL-V8 simulator module.

This module demonstrates an **immune-bound autonomous agent** with:

- DNA verification
- Heartbeat / mandatory behaviors
- Host interrogation / challenge-response
- Conceptual replication

**Important:** This is a **simulation only**. It is not intended for production deployment.

---

## Safety Measures

1. **Training Mode**
   - All behaviors are simulated (logging only).  
   - No network, file, or destructive operations.

2. **No God Seed Private Key**
   - The simulator does **not include private signing keys**.  
   - DNA verification is simulated via `simulateVerifySignature`.

3. **Resource Throttle**
   - CPU-intensive loop enforces a mandatory “tax” per generation.  
   - Prevents misuse in high-frequency automated attacks.

4. **Replication Concept Only**
   - Replication is **simulated only**; no actual copies are made.  
   - Controlled via `hostContext.canReplicate`.

5. **Host Challenge**
   - Host identity checks are simulated to prevent replay attacks in theory.  
   - Training Mode ensures no real cryptography is performed.

---

## Ethical Framing

- **Benign Intent:** Demonstrates autonomous agent self-protection and DNA verification.  
- **Malicious Mitigation:** CPU throttle and simulation-only behaviors prevent misuse.  
- **Open-Source Usage:** Safe for study, training, and research. Do **not deploy** as a live autonomous agent.

---

## Reporting Security Issues

If you identify potential security concerns or misuse scenarios, please contact maintainers. The module is safe by design, but forks or modifications may introduce risk.
