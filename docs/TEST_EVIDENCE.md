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
| `TEST-FE-01` | `npm install` | Install React 19, Vite, Tailwind CSS, Monaco, Lucide dependencies | 0 | PASSED (259 packages added, zero audit vulnerabilities) |
| `TEST-FE-02` | `npm run build` | TypeScript compile (`tsc -b`) and Vite production bundle | 0 | PASSED (2,126 modules transformed, dist built in 6.41s) |
| `TEST-ING-01` | `pytest backend/tests/test_ingestion.py::test_safe_zip_extraction` | Verify safe extraction of valid C firmware archive | 0 | PASSED (clean extraction into designated sandbox) |
| `TEST-ING-02` | `pytest backend/tests/test_ingestion.py::test_zip_slip_rejection` | Verify Zip-Slip path-traversal attack is blocked | 0 | PASSED (IngestionSecurityError thrown on `../` entry) |
| `TEST-ING-03` | `pytest backend/tests/test_ingestion.py::test_workspace_manager_sync_and_indexing` | Verify shadow copy sync and C/C++ file discovery | 0 | PASSED (read-only original copied to shadow, 2 C files indexed) |
| `TEST-ING-04` | `pytest backend/tests/test_ingestion.py::test_upload_api_single_c_file` | Verify HTTP multipart upload, DB persistence, and listing | 0 | PASSED (HTTP 201 Created, project registered, files listed) |
| `TEST-SCAN-01` | `pytest backend/tests/test_scanner.py::test_ast_scanner_on_smart_meter_fixture` | Verify AST scanner detects CWE-120 and CWE-476 on fixture | 0 | PASSED (accurate line numbers, function scopes, and snippets) |
| `TEST-SCAN-02` | `pytest backend/tests/test_scanner.py::test_api_scan_workflow` | Verify HTTP scan trigger (`/scans/run`) and DB persistence | 0 | PASSED (HTTP 201 Created, vulnerabilities indexed, retrieved) |
| `TEST-NORM-01` | `pytest backend/tests/test_cwe_normalizer.py::test_cwe_catalog_definitions` | Verify CWE catalog metadata (CVSS scores, vectors, mitigations) | 0 | PASSED (CWE-120 9.8, CWE-476 7.5, mitigations validated) |
| `TEST-NORM-02` | `pytest backend/tests/test_cwe_normalizer.py::test_finding_normalizer_enrichment` | Verify finding normalization, confidence score & IoT impact | 0 | PASSED (HIGH confidence 0.98 assigned, full metadata mapped) |
| `TEST-NORM-03` | `pytest backend/tests/test_cwe_normalizer.py::test_enriched_vulnerability_api` | Verify GET `/vulnerabilities/{id}` returns CVSS & taxonomy | 0 | PASSED (HTTP 200, enriched payload verified) |
| `TEST-IOT-01` | `pytest backend/tests/test_iot_context.py::test_peripheral_analyzer_detection` | Verify hardware peripheral detection (UART FIFO, ADC, FreeRTOS) | 0 | PASSED (accurate classification of UNTRUSTED_EXTERNAL taint) |
| `TEST-IOT-02` | `pytest backend/tests/test_iot_context.py::test_api_iot_context_endpoints` | Verify `/iot-context/project/{id}` and `/iot-context/vulnerability/{id}` | 0 | PASSED (HTTP 200, context bundle populated with memory rules) |
| `TEST-AI-01` | `pytest backend/tests/test_ai_router.py::test_provider_availability_probe` | Probe operational health of Gemini, OpenAI, and Ollama | 0 | PASSED (all 3 providers probed cleanly with explicit status) |
| `TEST-AI-02` | `pytest backend/tests/test_ai_router.py::test_ai_reasoning_generation` | Generate structured root-cause analysis and hardware impact | 0 | PASSED (valid Pydantic AiReasoningResponse returned) |
| `TEST-AI-03` | `pytest backend/tests/test_ai_router.py::test_ai_patch_synthesis_diff_format` | Synthesize unified diff defensive patch | 0 | PASSED (valid unified diff format `--- a/ +++ b/` produced) |
| `TEST-AI-04` | `pytest backend/tests/test_ai_router.py::test_ai_api_endpoints` | Verify HTTP API routes `/ai/providers`, `/ai/reasoning`, `/ai/patch` | 0 | PASSED (HTTP 200 on all AI router endpoints) |
| `TEST-RSN-01` | `pytest backend/tests/test_reasoning_service.py::test_reasoning_service_direct` | Synthesize root-cause reasoning injecting IoT context bundle | 0 | PASSED (root-cause, attack scenario & hardware impact generated) |
| `TEST-RSN-02` | `pytest backend/tests/test_reasoning_service.py::test_api_reasoning_endpoint` | Verify HTTP route `/reasoning/analyze/{vuln_id}` | 0 | PASSED (HTTP 200 with structured AiReasoningResponse payload) |

