# Safe Vibe AI — Test Evidence & Verification Records

This document maintains ground-truth records of all test executions, compiler diagnostics, sanitizer logs, and regression runs throughout the project lifecycle.

## Phase 0 & 1 Verification Records

| Test ID | Target / Command | Purpose | Exit Code | Outcome |
|---|---|---|---|---|
| `TEST-ENV-01` | `powershell nvidia-smi` | Confirm GPU Model & VRAM for local inference feasibility | 0 | PASSED (RTX 3050 Laptop, 6 GB VRAM, Driver 592.27, CUDA 13.1) |
| `TEST-ENV-02` | `powershell python --version` | Verify Python availability and version | 0 | PASSED (Python 3.14.3) |
| `TEST-ENV-03` | `powershell node -v; npm -v` | Verify Node.js & npm toolchain | 0 | PASSED (Node v24.6.0, npm 11.5.1) |
| `TEST-ENV-04` | `powershell git --version` | Verify Git availability | 0 | PASSED (git version 2.52.0.windows.1) |
| `TEST-SDK-01` | `python -c "from google import genai; ..."` | Confirm official Google GenAI SDK availability | 0 | PASSED (`google-genai` 2.29.0 imported cleanly) |
| `TEST-BE-01` | `python -m pytest backend/tests/test_health.py` | Verify root and health endpoints via ASGI async client | 0 | PASSED (2/2 tests passed, DB async query verified) |
| `TEST-BE-02` | `python backend/tests/test_live_server.py` | Verify live HTTP server boot, GPU telemetry, and DB connection | 0 | PASSED (HTTP 200, GPU RTX 3050 detected, DB connected) |

