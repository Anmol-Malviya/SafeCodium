# Safe Vibe AI — Architectural Specification

> **Project:** Safe Vibe AI  
> **Problem Statement:** PS15 — Automated Code Vulnerability Repair and Secure Software Synthesizer for IoT Firmware  
> **Host Environment:** Windows 11 Home, 16 GB RAM, NVIDIA RTX 3050 Laptop GPU (6 GB VRAM)

---

## 1. System Overview

Safe Vibe AI is an IoT-aware autonomous vulnerability detection, repair, and verification platform designed for embedded C/C++ firmware projects. It operates on a strict **8-Step Lifecycle**:

```
+--------------------------------------------------------------------------------------------------------------------+
|                                              8-STEP AUTONOMOUS LIFECYCLE                                           |
|                                                                                                                    |
|   [01. UPLOAD]       ->  Secure Zip-Slip resistant extraction into original and shadow workspaces                  |
|   [02. ANALYZE]      ->  IoT context intelligence & hardware peripheral taint analysis (UART, ADC, WiFi, BLE)      |
|   [03. DETECT]       ->  Composite AST & static security detector (CWE-120, CWE-787, CWE-476, CWE-416)            |
|   [04. REASON]       ->  Multi-provider AI root-cause analysis (Google Gemini API / OpenAI / Ollama)               |
|   [05. REPAIR]       ->  Defensive unified diff patch synthesis enforcing bounded embedded idioms                  |
|   [06. REVIEW]       ->  Monaco Diff Editor side-by-side inspection and controlled shadow workspace application    |
|   [07. VERIFY]       ->  Deterministic verification: Dual Compiler (0), ASan/UBSan (0 crashes), Regression (100%)  |
|   [08. PASSPORT]     ->  Tamper-evident verification passport signed with SHA-256 chain of custody                 |
+--------------------------------------------------------------------------------------------------------------------+
```

---

## 2. Core Modules Architecture

```
                 +-------------------------------------------------------------+
                 |            MODULE A: INGESTION & IOT CONTEXT                |
                 |  - Strict Zip-Slip Path Traversal Protection (.. rejection) |
                 |  - Read-Only Original & Shadow Workspace Cloner             |
                 |  - Peripheral Taint Analyzer (UART, ADC, SPI, I2C, BLE)     |
                 |  - AST & Regex Composite Security Scanner                   |
                 +------------------------------+------------------------------+
                                                | Normalized Findings & Context
                                                v
                 +-------------------------------------------------------------+
                 |            MODULE B: MULTI-PROVIDER AI ENGINE               |
                 |  - Common Provider Abstraction Protocol                     |
                 |  - Google Gemini API (Primary Engine, google-genai v2.29.0) |
                 |  - OpenAI API (Alternative / Critic)                        |
                 |  - Ollama Gemma 3 4B (Local Offline Fallback)               |
                 |  - Unified Diff Defensive Patch Synthesizer                 |
                 +------------------------------+------------------------------+
                                                | Unified Diffs (--- a/ +++ b/)
                                                v
                 +-------------------------------------------------------------+
                 |            MODULE C: GROUND-TRUTH VERIFICATION              |
                 |  - Stage 1: Dual Compiler Harness (Exit Code 0)             |
                 |  - Stage 2: AddressSanitizer & UBSan Memory Crash Trap      |
                 |  - Stage 3: 4-Tier Regression Matrix (Benign/Boundary/Fault)|
                 |  - Stage 4: Firmware Resource Profiler (Flash/RAM deltas)   |
                 |  - Promotion Oracle: Status -> VERIFIED                     |
                 +------------------------------+------------------------------+
                                                | Verified Artifact Telemetry
                                                v
                 +-------------------------------------------------------------+
                 |            MODULE D: CRYPTOGRAPHIC ASSURANCE                |
                 |  - SHA-256 Hashes of Original, Repaired, Diff & Sanitizer   |
                 |  - Composite Root-of-Trust Passport Signature               |
                 |  - CVSS Risk Reduction Delta Calculation (e.g. 9.8 -> 0.0)  |
                 |  - Industry Compliance Mappings (MISRA, NIST SP 800-160)    |
                 +-------------------------------------------------------------+
```

---

## 3. Persistent Engineering & Security Guardrails

As codified in [AGENTS.md](file:///e:/Safevibe%20Ai%20-%20AI%20manthan/AGENTS.md):
1. **Rule 6 — Ground-Truth Verification Authority:** LLM generation or approval is NEVER verification authority. A patch can ONLY receive `VERIFIED` status if verified by deterministic compiler exit codes (0), runtime sanitizers (ASan/UBSan exit 0), regression test suites (100% pass), and resource limits (<256B Flash overhead, 0 heap expansion).
2. **Path Traversal Defense:** Strict Zip-Slip detection rejects archive entries with `..`, absolute drives, or exceeding 100MB / 1,000 files.
3. **Workspace Isolation:** All repairs and compiler runs execute strictly within shadow workspaces (`data/workspaces/{id}/shadow`), leaving original source files (`data/uploads/{id}/original`) read-only and immutable.
4. **Credential Redaction:** API credentials and secret tokens are redacted in log output and never exposed to client bundles.
