# SafeCodium / Safe Vibe AI — Residual Risks & Platform Limitations

**Date:** 2026-10-31  
**Project:** SafeCodium / Safe Vibe AI  
**Scope:** Architecture, Verification Boundaries, IoT Simulation, and Operational Limitations.

---

## 1. Operating Environment & Toolchain Constraints

### 1.1 Host-Specific Native Sanitizers (Windows 11)
- **Constraint:** Native AddressSanitizer (`-fsanitize=address`) and UndefinedBehaviorSanitizer (`-fsanitize=undefined`) require specific MSVC/Clang-cl runtime libraries when running on Windows hosts. If the developer machine does not have the Clang-cl ASan runtime in PATH, the sanitizer harness falls back to AST-driven static heuristic simulation.
- **Remediation & Transparency:** SafeCodium explicitly reports `execution_mode: STATIC_HEURISTIC_SIMULATION` with `[Heuristic Analysis]` tags in logs. It never claims native ASan runtime execution occurred if it did not.
- **Recommended Production Environment:** For native sanitizer and hardware-in-the-loop validation, deploy backend verification workers inside Linux containers (e.g., Ubuntu LTS with LLVM 18+ and GCC 14+).

---

## 2. IoT Hardware Emulation Boundaries

### 2.1 Emulated Peripheral & Hardware States
- **Physical Absence:** SafeCodium is designed for environments without physical microcontrollers attached. Emulation relies on C/C++ static analysis, simulated UART/I2C/SPI register interactions, and ESP-IDF header parsing.
- **Timing & Electrical Faults:** Glitching, brownout resets, bus contention, and real-time race conditions tied to physical quartz oscillators cannot be fully replicated purely through host-side unit harnesses. Physical testbeds remain recommended for high-assurance hardware qualification.

---

## 3. Large Language Model (AI) Synthesis Limitations

### 3.1 Non-Deterministic Patch Generation
- **Behavior:** Multi-provider LLMs (Gemini 2.5, OpenAI GPT-4o, Gemma 3 4B) may occasionally synthesize syntactically incomplete or non-compilable patches on complex multi-file macro definitions.
- **Safety Valve:** SafeCodium enforces deterministic compiler exit codes (`clang -Wall -Werror`) and AST bounds verification. Patches that fail compilation or AST checks are immediately assigned `REJECTED` or `INCONCLUSIVE` status and never marked `VERIFIED`.

### 3.2 Token Limits on Large Firmware Repositories
- **Context Size:** Monolithic single-file firmware files exceeding 10,000 lines can exceed prompt context budgets. SafeCodium mitigates this by slicing functions around AST vulnerability line targets, but global architectural refactorings across sprawling codebases require modular source layout.

---

## 4. Archive Upload Considerations

### 4.1 Encrypted / Password-Protected ZIPs
- **Policy:** Encrypted ZIP files are rejected by the extraction engine because source inspection cannot occur prior to decompression.
- **Non-C/C++ Files:** Firmware projects containing binary blobs, pre-compiled `.bin` files, or non-source assets have those files ignored; SafeCodium's security scanners only index and audit `.c`, `.cpp`, `.h`, and `.hpp` source files.

