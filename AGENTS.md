# AGENTS.md — Persistent Project Constraints & Engineering Protocol

**Project:** Safe Vibe AI  
**Hackathon:** AI Manthan 2.0  
**Problem Statement:** PS15 — Automated Code Vulnerability Repair and Secure Software Synthesizer for IoT Firmware  
**Product Identity:** Safe Vibe AI — An IoT-Aware Autonomous Vulnerability Detection, Repair and Verification Platform.

---

## 1. Operating Rules & Constraints

1. **Single Development Machine:** Windows 11 host (16 GB RAM, NVIDIA RTX 3050 Laptop GPU with 6 GB VRAM).
2. **Single Coding Agent:** Work as the sole primary autonomous coding engineer.
   - Do NOT create parallel subagents.
   - Do NOT delegate coding tasks to subagents or hypothetical developers.
   - Do NOT construct team-based schedules.
3. **No Hardware Assumption:**
   - Physical IoT hardware is unavailable.
   - Emulate IoT contexts using C/C++ embedded firmware fixtures, simulated UART/sensor/network I/O, ESP-IDF header analysis, and host-side compiler/sanitizer verification harnesses.
4. **No Local Model Fine-Tuning Blockers:**
   - Foundation models are NOT to be trained from scratch.
   - Fine-tuning is NOT a prerequisite for the working MVP.
   - Keep datasets and fine-tuning scripts modularized for future research.
5. **Phase Gate Protocol:**
   - Execute all 20 development phases sequentially (Phase 0 through Phase 19).
   - Never skip phases, combine phases to rush, or advance without explicit user approval.
   - Always produce an Acceptance Report and STOP at phase boundaries.
6. **Ground-Truth Verification Authority:**
   - LLM generation or approval is NOT verification.
   - A patch can ONLY receive `VERIFIED` status if verified by deterministic compiler exit codes, runtime sanitizers (ASan/UBSan), and regression test harnesses.
   - Never fabricate test outcomes or display fake verification badges.
   - Use only three final statuses: `VERIFIED`, `REJECTED`, or `INCONCLUSIVE`.
7. **Security & Sandbox Isolation:**
   - Untrusted source code must never be run raw on the host.
   - Preserve original source files intact; all repairs occur on shadow workspace copies.
   - Enforce path traversal prevention (Zip-Slip defense) on all archive extractions.
   - Never expose API credentials to frontend clients or model context prompts.

---

## 2. Technology Stack

- **Frontend:** React 19 / Vite, Tailwind CSS, Monaco Editor (code viewing and unified diff review), Axios, React Router, Lucide React, Recharts.
- **Backend:** Python 3.14, FastAPI, Pydantic v2, SQLite / aiosqlite, SQLAlchemy.
- **Static Analysis:** Semgrep rules, Clang Static Analyzer / LibClang AST, custom C/C++ security detectors (CWE-120, CWE-787, CWE-476, CWE-416).
- **AI Engine:** Multi-provider router:
  - **Google Gemini API** (`google-genai` SDK v2.29.0) — Primary hosted reasoning, root-cause analysis, and unified diff synthesis.
  - **OpenAI API** — Alternative hosted provider and independent patch critique.
  - **Ollama (Gemma 3 4B)** — Optional local offline inference.
- **Patch Engine:** Python unified diff engine, patch validation, AST-level bounds enforcement.
- **Verification Engine:** Clang / GCC toolchain, AddressSanitizer (ASan), UndefinedBehaviorSanitizer (UBSan), Pytest test harnesses, resource profiler (binary footprint, RAM/flash delta).

---

## 3. Phase Acceptance Checklist Pattern

For every phase:
1. **Inspection** — Review existing files and system state.
2. **Requirements** — Confirm exact deliverables for the phase.
3. **Implementation** — Create/modify only the approved files.
4. **Testing** — Run deterministic unit/integration checks.
5. **Documentation** — Update `docs/PROJECT_STATUS.md`, `docs/DEVELOPMENT_LOG.md`, `docs/ARCHITECTURE.md`, `docs/TEST_EVIDENCE.md`.
6. **Acceptance Report** — Present summary of changes, test outcomes, and criteria.
7. **STOP & WAIT** — Await explicit user authorization before commencing the next phase.

