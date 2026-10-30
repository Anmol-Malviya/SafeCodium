# Safe Vibe AI — Architectural Specification

## System Overview
Safe Vibe AI is an IoT-aware autonomous vulnerability detection, repair, and verification platform designed for embedded C/C++ firmware projects.

## Core Modules

```
                +------------------------------------------------+
                |         Module A: IoT Ingestion & AST          |
                |  - Zip-Slip Safe Archive Extractor             |
                |  - Shadow Workspace Cloner                     |
                |  - ESP-IDF & Arduino Hardware Register Taint   |
                |  - LibClang / Semgrep Static Scanner           |
                +-----------------------+------------------------+
                                        | Normalized Findings
                                        v
                +------------------------------------------------+
                |         Module B: Multi-Provider AI Engine     |
                |  - Common Provider Protocol                    |
                |  - Google Gemini API (Primary Engine)          |
                |  - OpenAI API (Secondary / Validator)          |
                |  - Ollama Gemma 3 4B (Local Offline)           |
                |  - Defensive Bounds Patch Synthesizer          |
                +-----------------------+------------------------+
                                        | Unified Diffs
                                        v
                +------------------------------------------------+
                |         Module C: Verification Engine          |
                |  - Dual Compiler Harness                       |
                |  - ASan & UBSan Runtime Sanitizer Execution    |
                |  - Regression & Fuzzing Test Suite             |
                |  - Flash / RAM / Stack Binary Metrics          |
                |  - Verification Passport (JSON / PDF)          |
                +------------------------------------------------+
```

## Security & Verification Contracts
1. **Zero Hallucinated Approvals:** A patch is only marked `VERIFIED` when clean compiler exit codes and clean sanitizer runs confirm vulnerability elimination with zero regression.
2. **Original Source Immutability:** The uploaded project is strictly read-only in its original archive directory; all remediation operations occur on temporary shadow clones.
3. **Zip-Slip Hardening:** All file paths inside uploaded archives are checked against path traversal (`..` components and absolute paths rejected).

