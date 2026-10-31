# SafeCodium / Safe Vibe AI — Final Test Evidence Report

**Date:** 2026-10-31  
**Project:** SafeCodium / Safe Vibe AI  
**Scope:** Backend Pytest Suite, Security Regression Checks, Frontend TypeScript Build.

---

## 1. Test Suite Summary

- **Total Test Cases Executed:** 40
- **Total Passed:** 40
- **Total Failed:** 0
- **Total Skipped:** 0
- **Total Test Execution Duration:** ~11.6 seconds
- **Frontend TypeScript Build:** `npm run build` completed with code `0` (`tsc -b && vite build` succeeded).

---

## 2. Test Breakdown by Domain

| Test Module | Tests | Status | Key Coverage |
|-------------|-------|--------|--------------|
| `backend/tests/test_ai_router.py` | 4 | PASSED | Provider availability probe, reasoning generation, unified diff synthesis, API endpoints |
| `backend/tests/test_analytics.py` | 1 | PASSED | Real-time KPI aggregation, severity/CWE/framework distributions |
| `backend/tests/test_compiler_harness.py` | 3 | PASSED | Single-file clean compile, unsafe construct rejection, dual-compilation API |
| `backend/tests/test_cwe_normalizer.py` | 3 | PASSED | Catalog definitions, finding enrichment, normalized vulnerability API |
| `backend/tests/test_e2e_demonstrations.py` | 2 | PASSED | Full end-to-end demonstrations on CWE-120 and CWE-476 |
| `backend/tests/test_health.py` | 2 | PASSED | Root status and `/health` diagnostic endpoints |
| `backend/tests/test_ingestion.py` | 5 | PASSED | Safe extraction, Zip-Slip traversal rejection, decompression bomb rejection, workspace sync, single-file upload |
| `backend/tests/test_iot_context.py` | 2 | PASSED | Peripheral analyzer, IoT context inspection endpoints |
| `backend/tests/test_passport_reporting.py` | 2 | PASSED | Cryptographic SHA-256 verification passport generation and verification endpoint |
| `backend/tests/test_patch_review.py` | 3 | PASSED | Unified diff parsing/application, independent patch critique, critique API |
| `backend/tests/test_patch_synthesizer.py` | 2 | PASSED | Direct patch synthesizer, patch generation API endpoint |
| `backend/tests/test_reasoning_service.py` | 2 | PASSED | Direct root-cause reasoning service, reasoning API endpoint |
| `backend/tests/test_regression_harness.py` | 2 | PASSED | Regression suite test runner, regression test API endpoint |
| `backend/tests/test_resource_profiler.py` | 2 | PASSED | Binary footprint delta, memory/flash delta, verification status promotion |
| `backend/tests/test_sanitizer_harness.py` | 3 | PASSED | ASan buffer overflow detection, repaired source pass, explicit `execution_mode` validation |
| `backend/tests/test_scanner.py` | 2 | PASSED | AST scanner on smart meter fixture, scan workflow API |

---

## 3. Security Regression Verification

1. **Zip-Slip & Symlink Defense:**
   - Path traversal attempts with `../` paths raise `IngestionSecurityError` matching `"Zip-Slip path traversal"`.
   - Compression ratios exceeding `100:1` raise `IngestionSecurityError` matching `"Suspicious compression ratio"`.
2. **Read-Only Original Workspace:**
   - Workspace original folders are write-protected after ingestion; shadow copies are explicitly made writable for patch modifications.
3. **Transparent Execution Mode:**
   - Sanitizer and compiler runs report `execution_mode` (`NATIVE_EXECUTION` or `STATIC_HEURISTIC_SIMULATION`).

---

## 4. Frontend Compilation Evidence

```
> safevibe-ai-frontend@0.1.0 build
> tsc -b && vite build

vite v6.4.5 building for production...
transforming...
✓ 2756 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.92 kB │ gzip:   0.51 kB
dist/assets/index-BOt6RVoC.css   27.57 kB │ gzip:   5.41 kB
dist/assets/index-90gAdMlY.js   827.31 kB │ gzip: 237.62 kB
✓ built in 27.24s
```
