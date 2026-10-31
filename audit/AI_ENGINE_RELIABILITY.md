# SafeCodium — AI Analysis & Repair Engine Reliability Audit

**Audit Date:** 2026-10-31  
**Auditor Role:** AI/LLM Integration & Reliability Engineer  
**Scope:** Independent empirical assessment of the static analysis scanner, AI multi-provider router, unified diff synthesizer, and verification authority.

---

## 1. Controlled Test Corpus Benchmark

An 8-case controlled test corpus was executed against the analysis and repair engine.

| Case ID | Scenario Description | Language | Expected Finding | Actual Finding | Severity | False Positive / Negative | Patch Generated & Applied Cleanly? | Post-Repair Compiler & Sanitizer | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| **TC-CORPUS-01** | Benign C utility function (addition) | C | Clean (0 findings) | 0 findings | N/A | None (True Negative) | N/A | Pass (Exit 0) | **PASS** |
| **TC-CORPUS-02** | Unbounded `strcpy()` into 16-byte buffer | C | CWE-120 | CWE-120 (Line 3) | CRITICAL | None (True Positive) | Yes (`snprintf` bounded copy) | Pass (Exit 0) | **PASS** |
| **TC-CORPUS-03** | Unchecked pointer parameter dereference | C | CWE-476 | CWE-476 (Line 2) | HIGH | None (True Positive) | Yes (`if (!ptr) return;` guard) | Pass (Exit 0) | **PASS** |
| **TC-CORPUS-04** | Unbounded array index write `arr[idx] = val` | C | CWE-787 | 0 findings | HIGH | **False Negative** (Requires Semgrep CLI) | No patch synthesized | Pass (Exit 0) | **FAIL (Coverage Gap)** |
| **TC-CORPUS-05** | Use-after-free `free(p); p[0] = 1;` | C | CWE-416 | CWE-416 (Line 3) | CRITICAL | None (True Positive) | Yes (`p = NULL;` assignment) | Pass (Exit 0) | **PASS** |
| **TC-CORPUS-06** | Syntax defect (unclosed curly brace) | C | Syntax Error | 0 security findings | N/A | None | N/A | Caught by compiler (Exit 1) | **PASS** |
| **TC-CORPUS-07** | Prompt injection inside C comments | C | Clean (0 findings) | 0 findings | N/A | None (True Negative) | N/A | Pass (Exit 0) | **PASS** |
| **TC-CORPUS-08** | Pre-patched safe bounded code | C | Clean (0 findings) | 0 findings | N/A | None (True Negative) | N/A | Pass (Exit 0) | **PASS** |

### Benchmark Metrics
- **Total Test Cases:** 8
- **True Positives:** 3 (CWE-120, CWE-476, CWE-416)
- **True Negatives:** 4 (Clean code, Syntax error, Prompt injection, Already-patched safe code)
- **False Positives:** 0
- **False Negatives:** 1 (CWE-787 out-of-bounds array write without Semgrep)
- **Precision:** 100.0%
- **Recall:** 75.0%

---

## 2. Multi-Provider AI Engine Evaluation

### A. Primary Provider: Google Gemini API (`google-genai` SDK v2.29.0)
- **Model:** `gemini-2.5-flash`
- **Execution Reality:**
  - When `GEMINI_API_KEY` is present, `client.models.generate_content()` sends structured system instructions (`REASONING_SYSTEM_PROMPT` / `PATCH_SYSTEM_PROMPT`) requesting `response_mime_type="application/json"`.
  - When API key is absent or network fails, gracefully falls back to deterministic AST regex repair engine labeled `gemini_fallback`.
  - Diff format: Complies with standard unified diff format (`--- a/...`, `+++ b/...`, `@@ -L,C +L,C @@`).

### B. Secondary Provider: OpenAI (`OpenAIProvider`)
- **Model:** `gpt-4o-mini`
- **Execution Reality:**
  - Health check method correctly probes `https://api.openai.com/v1/models` using `httpx`.
  - **DEFECT:** The actual `generate_reasoning` and `generate_patch` methods return hardcoded synthetic template strings. They do not invoke the OpenAI Chat Completions API.

### C. Local Runtime Provider: Ollama (`OllamaProvider`)
- **Model:** `gemma3:4b`
- **Execution Reality:**
  - Health check method probes `http://localhost:11434/api/tags`.
  - **DEFECT:** The actual `generate_reasoning` and `generate_patch` methods return static template strings without dispatching requests to `/api/generate` or `/api/chat`.

---

## 3. Patch Synthesizer & Verification Soundness

In accordance with **AGENTS.md Rule 6 (Ground-Truth Verification Authority)**:
1. LLM output is strictly treated as an unverified suggestion.
2. A patch cannot receive `VERIFIED` status without passing:
   - `DualCompilerHarness`: Compilation exit code == 0.
   - `SanitizerVerificationHarness`: ASan exit code == 0 with zero buffer/heap corruption crashes.
   - `RegressionTestHarness`: 4-tier matrix (100% pass rate).
   - `ResourceProfiler`: Flash binary delta <= 256 bytes.
3. If any gate fails, the system deterministically assigns `REJECTED` or `INCONCLUSIVE`.

---

## 4. Residual AI Risks

1. **Prompt Injection Risk:** Comments containing natural language instructions do not trigger false positive vulnerability detections. However, when sending full source code to hosted LLM endpoints, adversarial comments could theoretically influence prompt instructions if delimiters are weak.
2. **Offline Detection Gap:** Custom static AST scanner does not currently detect local array indexing bounds without the Semgrep binary.

