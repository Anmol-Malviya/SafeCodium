# Safe Vibe AI Firmware & Code Fixtures

This directory contains standalone, reproducible vulnerable C/C++ firmware fixtures designed to represent real-world embedded IoT devices (smart meters, environmental sensors, medical telemetry).

Each fixture includes:
- Target C/C++ source code.
- Known vulnerability manifestation (e.g. CWE-120 buffer overflow, CWE-476 NULL pointer).
- Unit test harness executing normal, boundary, and exploit inputs.
- Sanitizer verification targets.

