# ARCHANGEL-V8 Security Guidelines

## Purpose
This document provides guidance for safe use of the ARCHANGEL-V8 simulator module. 

ARCHANGEL-V8 demonstrates the architecture of an **immune-bound autonomous agent**, including:

- DNA verification
- Heartbeat (mandatory behaviors)
- Host interrogation / challenge-response

**Important:** This is a reference **simulation only**. It is not intended for production deployment.

---

## Safety Measures

1. **Training Mode**
   - All behaviors that could modify the system, perform network requests, or replicate are **simulated only**.
   - Default behavior logs actions instead of executing them.

2. **No God Seed Private Key**
   - The simulator does **not include any private signing keys**.
   - DNA verification is simulated via `simulateVerifySignature`.

3. **Resource Throttle**
   - Every generation enforces a CPU “tax” to prevent misuse in automated attack scenarios.

4. **Replication Concept Only**
   - Replication is shown as a concept. No actual agent replication occurs.

5. **Host Challenge**
   - Host identity checks are simulated.
   - Prevents replay attacks in theory, but this module does not include real cryptography for challenge responses.

---

## Ethical Framing

- **Benign Intent:** Demonstrates agent self-protection and integrity verification.
- **Malicious Mitigation:** CPU throttle and simulated behaviors prevent misuse.
- **Open-Source Usage:** Safe for study, training, and testing only. Do not deploy this module as a live autonomous agent.

---

## Contact / Reporting

If you discover any potential security issues or misuse scenarios, please contact the maintainers to report your findings.
