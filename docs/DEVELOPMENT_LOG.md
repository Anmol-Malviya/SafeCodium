# Safe Vibe AI — Development Log

## 2026-10-30

### Phase 0: Environment Inspection & Architectural Discovery
- **Action:** Inspected Windows 11 host, Python 3.14, Node.js 24, npm 11, Git 2.52, GPU RTX 3050 (6GB VRAM), and missing native tools (Docker, WSL2, Clang CLI).
- **Assessment:** Local inference viable for <= 4B models (Gemma 3 4B Q4). Google Gemini API selected as primary hosted reasoning/patch synthesis engine due to zero host overhead and state-of-the-art C/C++ reasoning.
- **Result:** Phase 0 approved by user.

### Phase 1: Project Initialization
- **Action:** Initialized persistent project governance rules in `AGENTS.md`.
- **Action:** Created four standard documentation logs: `PROJECT_STATUS.md`, `DEVELOPMENT_LOG.md`, `ARCHITECTURE.md`, `TEST_EVIDENCE.md`.
- **Action:** Scaffolded clean directory structure for backend, frontend, fixtures, and docs.
- **Action:** Created `.env.example`, `.gitignore`, `README.md`, and starter dependency specifications.
- **Result:** Phase 1 approved and committed (`1af1f31`).

### Phase 2: Backend Architecture & Core Foundation
- **Action:** Implemented centralized settings with `pydantic-settings` in `backend/app/core/config.py`.
- **Action:** Created secure logger with API key redaction in `backend/app/core/logging.py`.
- **Action:** Built async SQLite/SQLAlchemy session factory and table schema generator in `backend/app/db/session.py` and `backend/app/db/base.py`.
- **Action:** Defined core ORM entities (`Project`, `Scan`, `Vulnerability`, `Patch`, `Verification`) in `backend/app/models/project.py`.
- **Action:** Created generic Pydantic v2 response contracts in `backend/app/schemas/common.py`.
- **Action:** Built `/api/v1/health` dynamic hardware and service diagnostic router in `backend/app/api/v1/health.py`.
- **Action:** Configured FastAPI application with lifespan management, CORS, and global error handlers in `backend/app/main.py`.
- **Action:** Verified with pytest ASGI suite (`TEST-BE-01`) and live HTTP server socket probe (`TEST-BE-02`). Both passed with 100% success rate.
- **Result:** Phase 2 approved and committed (`3e44d83`).

### Phase 3: Frontend Foundation & Cyber Dashboard UI
- **Action:** Scaffolding React 19 + TypeScript + Vite frontend inside `frontend/`.
- **Action:** Configured Tailwind CSS with dark cybersecurity color palette (`#080d1a`, cyan accents, emerald/amber/rose status codes).
- **Action:** Implemented Axios client configured to proxy `/api/v1` to the FastAPI backend.
- **Action:** Built responsive cyber navigation layout:
  - `Navbar`: Live backend telemetry polling (`/api/v1/health`), displaying real-time engine status, RTX 3050 VRAM metrics, and host RAM usage.
  - `Sidebar`: 11 navigation routes with Lucide icons and target architecture context.
  - `MainLayout`: Integrated persistent shell with responsive scroll container.
- **Action:** Implemented all 11 required pages: `Dashboard`, `ProjectUpload`, `CodeAnalysis`, `VulnerabilityScanner`, `VulnerabilityDetails`, `AiRepairStudio`, `CodeDiffReview`, `VerificationCenter`, `SecurityReports`, `ProjectHistory`, `SettingsPage`.
- **Action:** Connected all routes via `react-router-dom` in `App.tsx`.
- **Action:** Successfully installed 259 packages and verified clean production build (`npm run build`, `TEST-FE-02`) with 0 errors.
- **Result:** Phase 3 approved and committed (`50f2bf6`).

### Phase 4: Source Code & Firmware Ingestion
- **Action:** Built `backend/app/services/ingestion/extractor.py` implementing strict Zip-Slip path-traversal detection (`..` rejection, canonical path verification) and decompression bomb protection (100MB threshold, 1,000 file ceiling).
- **Action:** Built `backend/app/services/ingestion/workspace.py` providing isolated shadow workspaces (`data/workspaces/{project_id}/shadow`), read-only original preservation (`data/uploads/{project_id}/original`), and C/C++ source code indexer.
- **Action:** Implemented API endpoints in `backend/app/api/v1/projects.py` (`POST /projects/upload`, `GET /projects`, `GET /projects/{project_id}`, `GET /projects/{project_id}/files`, `GET /projects/{project_id}/file-content`).
- **Action:** Created realistic IoT smart meter vulnerable C fixture in `fixtures/iot_firmware/sample_smart_meter.c` (CWE-120 buffer overflow and CWE-476 NULL pointer).
- **Action:** Wired up real file upload drag-and-drop UI with progress feedback in `frontend/src/pages/ProjectUpload.tsx`.
- **Action:** Added Pytest test suite in `backend/tests/test_ingestion.py` covering safe extraction, Zip-Slip rejection, workspace syncing, and API multipart ingestion. All 6 tests in suite passed.
- **Result:** Phase 4 approved and committed (`84bd491`).

### Phase 5: Static Vulnerability Detection
- **Action:** Created AST and regex security rules in `backend/app/services/analysis/rules.py` covering CWE-120, CWE-787, CWE-476, and CWE-416.
- **Action:** Implemented `backend/app/services/analysis/ast_scanner.py` with C syntax function boundary extractor, parameter type parsing, and pointer dereference tracing.
- **Action:** Implemented `backend/app/services/analysis/engine.py` orchestrating shadow workspace scanning, Semgrep CLI detection, finding deduplication, and database persistence.
- **Action:** Added Pydantic schemas in `backend/app/schemas/scan.py` and API endpoints in `backend/app/api/v1/scans.py` (`POST /scans/run`, `GET /scans/{scan_id}`, `GET /scans/project/{project_id}`, `GET /vulnerabilities/{vuln_id}`, `GET /vulnerabilities/project/{project_id}`).
- **Action:** Connected frontend `VulnerabilityScanner.tsx` with dynamic project selector, live scan execution, and findings table.
- **Action:** Tested static scanner on `fixtures/iot_firmware/sample_smart_meter.c` (`TEST-SCAN-01`, `TEST-SCAN-02`); full suite of 8 backend tests passing 100%. Verified frontend build with 0 errors.
- **Result:** Phase 5 approved and committed (`b2fcb4f`).

### Phase 6: CWE Classification & Finding Normalization
- **Action:** Authored `backend/app/services/analysis/cwe_catalog.py` containing complete taxonomy definitions, CVSS v3.1 base score vectors, IoT embedded firmware impacts, and mitigation strategies for CWE-120, CWE-787, CWE-476, and CWE-416.
- **Action:** Built `backend/app/services/analysis/normalizer.py` calculating dynamic confidence scores (e.g., 0.98 for definite dangerous memory copies, 0.92 for AST-verified parameter dereference) and enriching findings with CVSS base scores.
- **Action:** Added `EnrichedVulnerabilityResponse` schema and updated `/api/v1/vulnerabilities/{vuln_id}` and `/api/v1/vulnerabilities/project/{project_id}` endpoints.
- **Action:** Upgraded `frontend/src/pages/VulnerabilityDetails.tsx` with full CWE taxonomy view, CVSS v3.1 score pill, IoT impact analysis, code line preview, and mitigation checklist.
- **Action:** Added Pytest suite `backend/tests/test_cwe_normalizer.py` (`TEST-NORM-01`, `TEST-NORM-02`, `TEST-NORM-03`). All 11 tests across the entire backend suite passing 100%.
- **Result:** Phase 6 approved and committed (`e2c7a64`).

### Phase 7: IoT Firmware Context Intelligence
- **Action:** Implemented `backend/app/services/iot_context/peripheral_analyzer.py` detecting hardware peripheral register interactions (UART, ADC, SPI, I2C, BLE, WiFi, MMIO, FreeRTOS queues) and categorizing external taint risks.
- **Action:** Implemented `backend/app/services/iot_context/context_bundle.py` assembling structured `IotContextBundle` objects combining function AST, surrounding code lines, memory limits, and target architecture rules (Xtensa LX6/LX7, ARM Cortex-M).
- **Action:** Added API endpoints in `backend/app/api/v1/iot_context.py` (`GET /api/v1/iot-context/vulnerability/{vuln_id}`, `GET /api/v1/iot-context/project/{project_id}`).
- **Action:** Updated `frontend/src/pages/CodeAnalysis.tsx` to display real hardware peripheral taint graphs, operating system detection (FreeRTOS vs Bare-Metal), and source inventory metrics.
- **Action:** Verified with `backend/tests/test_iot_context.py` (`TEST-IOT-01`, `TEST-IOT-02`). All 13 tests across the entire backend suite passing 100%. Verified frontend production build with 0 errors.







