# Safe Vibe AI — Autonomous IoT Firmware Vulnerability Detection, Repair & Verification Platform

> **Hackathon:** AI Manthan 2.0  
> **Problem Statement:** PS15 — Automated Code Vulnerability Repair and Secure Software Synthesizer for IoT Firmware  
> **Product Identity:** Safe Vibe AI  
> **Verification Authority:** Deterministic Compilers, ASan/UBSan, and Regression Harnesses (Strict AGENTS.md Rule 6)

---

## 1. Executive Summary

**Safe Vibe AI** is a cyber-resilience platform engineered specifically for resource-constrained embedded C/C++ IoT firmware (ESP-IDF, FreeRTOS, Bare-Metal, Arduino). It detects critical memory safety vulnerabilities (CWE-120, CWE-787, CWE-476, CWE-416), extracts hardware peripheral taint vectors (UART, ADC, WiFi, BLE, MMIO), synthesizes minimal defensive C patches via the Google Gemini API, and strictly verifies fixes using an independent ground-truth verification pipeline (Dual-Compiler, AddressSanitizer, UndefinedBehaviorSanitizer, 4-tier regression matrix, and resource profiler). Verified artifacts receive a cryptographically signed SHA-256 Verification Passport.

```
+-------------------------------------------------------------------------------------------------------+
|                                     AUTONOMOUS 8-STEP LIFECYCLE                                       |
|  UPLOAD  ->  ANALYZE  ->  DETECT  ->  REASON  ->  REPAIR  ->  REVIEW  ->  VERIFY  ->  PASSPORT        |
+-------------------------------------------------------------------------------------------------------+
```

---

## 2. Architecture & Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Monaco Editor (`@monaco-editor/react`), Lucide React, Axios, React Router.
- **Backend:** Python 3.14, FastAPI, Pydantic v2, SQLite / aiosqlite, SQLAlchemy Async.
- **AI Engine:** Multi-Provider Router with availability probes:
  - **Google Gemini API (`google-genai` SDK v2.29.0):** Primary reasoning & patch synthesis (`gemini-2.5-flash`).
  - **OpenAI API:** Secondary critique provider.
  - **Ollama / Gemma 3 4B:** Local offline inference.
- **Verification Authority:**
  - Dual Clang/GCC compiler exit code checker (Exit Code 0).
  - AddressSanitizer (ASan) & UndefinedBehaviorSanitizer (UBSan) memory corruption crash trap.
  - 4-Tier Regression Test Matrix (Benign, Boundary, Exploit, Fault Injection).
  - Firmware Resource Profiler (Flash delta < 256 bytes, zero dynamic heap expansion).
  - Cryptographic SHA-256 Verification Passport Generator.

---

## 3. Key Vulnerabilities Handled

| CWE | Vulnerability Title | Severity | Mitigation Strategy |
|---|---|---|---|
| **CWE-120** | Buffer Copy without Checking Size ('Classic Buffer Overflow') | **CRITICAL (CVSS 9.8)** | Replaced `strcpy` with bounded `snprintf(buf, sizeof(buf), ...)` and explicit NULL-termination. |
| **CWE-787** | Out-of-bounds Write | **CRITICAL (CVSS 9.8)** | Enforced array boundary invariant checks before write operations. |
| **CWE-476** | NULL Pointer Dereference | **HIGH (CVSS 7.5)** | Defensive early-return guards before pointer dereferencing. |
| **CWE-416** | Use After Free | **HIGH (CVSS 7.8)** | Immediate pointer nullification post-`free()` and lifetime validation. |

---

## 4. Quick Start & Execution

### Prerequisites
- Python 3.14+
- Node.js v20+ / npm v10+
- Host C/C++ compiler or simulated cross-compiler harness

### Running via Developer Launcher (One-Click)
Double click or run from terminal:
```bat
scripts\dev_launcher.bat
```

### Manual Execution

#### 1. Backend Server
```bash
# In workspace root
python backend/run_server.py
```
Backend API will start on: `http://127.0.0.1:8000`  
Interactive Swagger Docs: `http://127.0.0.1:8000/docs`

#### 2. Frontend Dashboard
```bash
cd frontend
npm install
npm run dev
```
Frontend Web Dashboard: `http://127.0.0.1:5173`

---

## 5. Verification Test Suite

Run the full deterministic test suite across all 39 test records:
```bash
python -m pytest -v
```

Run frontend production build verification:
```bash
cd frontend
npm run build
```

---

## 6. Project Governance & Security Guardrails

As codified in `AGENTS.md`:
1. **Rule 6 — Ground-Truth Verification Authority:** LLM output is NEVER accepted as proof of correctness. A patch is only marked `VERIFIED` when compiler exit codes are 0, sanitizers confirm 0 memory crashes, regression suite is 100% passed, and resource limits are respected.
2. **Path Traversal Defense:** Strict Zip-Slip protection on all firmware ingestion archives (`..` rejection, canonical path validation, 100MB threshold).
3. **Workspace Isolation:** All repairs and compiler runs execute strictly within shadow workspaces (`data/workspaces/{id}/shadow`), leaving original source files read-only and immutable.
4. **Credential Redaction:** API keys are scrubbed from log output and never leaked to frontend clients.

---

## 7. Submission Artifacts
- Source code repositories: `backend/`, `frontend/`, `fixtures/`.
- Project Governance Rules: `AGENTS.md`.
- Architecture & Design: `docs/ARCHITECTURE.md`.
- Project Status Ledger: `docs/PROJECT_STATUS.md`.
- Development Log: `docs/DEVELOPMENT_LOG.md`.
- Test Evidence & Ground-Truth Verification: `docs/TEST_EVIDENCE.md`.
