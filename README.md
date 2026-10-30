# Safe Vibe AI

> **IoT-Aware Autonomous Vulnerability Detection, Repair and Verification Platform**  
> Problem Statement PS15 — AI Manthan 2.0

---

## Overview

Safe Vibe AI is an automated cybersecurity platform specifically engineered for embedded C/C++ IoT firmware. It autonomously detects vulnerabilities (such as buffer overflows, out-of-bounds memory writes, NULL pointer dereferences, and use-after-free bugs), understands their physical and firmware contexts, synthesizes defensive patches, and independently verifies those patches with compilers and runtime sanitizers (ASan/UBSan) before issuing tamper-proof verification passports.

```
UPLOAD -> ANALYZE -> DETECT -> UNDERSTAND -> REPAIR -> REVIEW -> VERIFY -> REPORT
```

## Core Modules

1. **IoT Context Intelligence**: Analyzes embedded C/C++ code, recognizes ESP-IDF / Arduino SDK constructs, hardware peripheral registers, and untrusted inputs (UART, WiFi, BLE).
2. **Secure Patch Engine**: Provider-agnostic AI synthesis (Google Gemini API, OpenAI, Ollama/Gemma 3) generating minimal unified diffs with defensive bounds checks.
3. **Firmware Verification Engine**: Independent dual compilation (original vs. patched), AddressSanitizer and UndefinedBehaviorSanitizer execution, regression fuzzing, and binary footprint delta tracking.

## Getting Started

Refer to `docs/ARCHITECTURE.md` and `docs/PROJECT_STATUS.md` for current system state and engineering milestones.
