"""Safe Vibe AI — Authoritative CWE Taxonomy & Metadata Catalog."""

from typing import Dict, List, Optional
from pydantic import BaseModel


class CweDefinition(BaseModel):
    cwe_id: str
    name: str
    description: str
    extended_description: str
    default_severity: str
    cvss_base_score: float
    cvss_vector: str
    iot_impact: str
    mitigation_strategies: List[str]
    common_consequences: List[str]


CWE_CATALOG: Dict[str, CweDefinition] = {
    "CWE-120": CweDefinition(
        cwe_id="CWE-120",
        name="Buffer Copy without Checking Size of Input ('Classic Buffer Overflow')",
        description="The program copies an input buffer to an output buffer without verifying that the size of the input buffer is less than the size of the output buffer.",
        extended_description=(
            "In embedded IoT firmware, unbounded copies into stack or static memory "
            "frequently corrupt adjacent control registers, return addresses, or task structures, "
            "enabling remote code execution (RCE) or complete microcontroller lockups."
        ),
        default_severity="CRITICAL",
        cvss_base_score=9.8,
        cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
        iot_impact="Arbitrary remote firmware execution over UART/WiFi, peripheral hijacking, persistent device bricking.",
        mitigation_strategies=[
            "Replace unsafe functions (strcpy, strcat, sprintf, gets) with bounded alternatives (snprintf, strncpy, memcpy with explicit len).",
            "Ensure destination buffers are explicitly sized and null-terminated.",
            "Use bounded input read APIs for hardware FIFOs and serial ports.",
        ],
        common_consequences=[
            "Execute Unauthorized Code or Commands",
            "Modify Memory / Overwrite Control Pointers",
            "Denial of Service (Crash or Watchdog Reset)",
        ],
    ),
    "CWE-787": CweDefinition(
        cwe_id="CWE-787",
        name="Out-of-bounds Write",
        description="The software writes data past the end, or before the beginning, of the intended buffer.",
        extended_description=(
            "Typically occurs through pointer arithmetic, off-by-one loop indexing, or flawed "
            "DMA buffer offsets in microcontrollers, corrupting hardware memory regions or heap headers."
        ),
        default_severity="CRITICAL",
        cvss_base_score=9.1,
        cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:H/A:H",
        iot_impact="Memory corruption of microcontroller memory-mapped registers (MMIO), leading to sensor tampering or firmware crashes.",
        mitigation_strategies=[
            "Enforce strict array index assertions before writes.",
            "Validate all packet length fields against maximum allowed buffer limits.",
            "Utilize compiler bounds-checking flags (-fstack-protector-strong).",
        ],
        common_consequences=[
            "Modify Memory",
            "Denial of Service",
            "Execute Unauthorized Code",
        ],
    ),
    "CWE-476": CweDefinition(
        cwe_id="CWE-476",
        name="NULL Pointer Dereference",
        description="A NULL pointer dereference occurs when the application dereferences a pointer that it expects to be valid, but is NULL.",
        extended_description=(
            "In bare-metal or FreeRTOS embedded systems without MMU (Memory Management Unit), "
            "dereferencing address 0x00000000 can either trap a hardware Fault Handler (causing reboot loops) "
            "or read from the vector interrupt table, causing undefined microcontroller behavior."
        ),
        default_severity="HIGH",
        cvss_base_score=7.5,
        cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H",
        iot_impact="Hard fault exception / Panic loop, watchdog timer timeout, sensor reading paralysis.",
        mitigation_strategies=[
            "Always validate pointer arguments against NULL prior to dereferencing (if (ptr == NULL) return ESP_ERR_INVALID_ARG).",
            "Verify memory allocation returns (malloc, calloc) before using pointer.",
            "Initialize all pointer declarations to NULL.",
        ],
        common_consequences=[
            "Microcontroller Crash / Denial of Service",
            "Spurious Interrupt Execution",
        ],
    ),
    "CWE-416": CweDefinition(
        cwe_id="CWE-416",
        name="Use After Free",
        description="Referencing memory after it has been freed can cause a program to crash, use unexpected values, or execute code.",
        extended_description=(
            "Embedded firmware managing dynamic telemetry queues or BLE connection contexts "
            "may reuse memory blocks that have been reclaimed, corrupting active data structures."
        ),
        default_severity="CRITICAL",
        cvss_base_score=8.8,
        cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
        iot_impact="Silent telemetry data corruption, heap metadata poisoning, arbitrary code execution.",
        mitigation_strategies=[
            "Set pointers to NULL immediately after calling free().",
            "Avoid complex ownership models across FreeRTOS tasks.",
            "Use static memory allocation buffers for high-reliability embedded firmware.",
        ],
        common_consequences=[
            "Execute Unauthorized Code",
            "Modify Memory",
            "Denial of Service",
        ],
    ),
    "CWE-COMPILE-ERR": CweDefinition(
        cwe_id="CWE-COMPILE-ERR",
        name="C/C++ Compilation or Syntax Diagnostic Error",
        description="The source code fails deterministic compiler or syntax validation checks.",
        extended_description=(
            "Compilation errors include syntax anomalies, missing delimiters, undeclared identifiers, "
            "type mismatches, or header omissions that prevent compilation into valid firmware binaries."
        ),
        default_severity="HIGH",
        cvss_base_score=7.0,
        cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H",
        iot_impact="Prevents firmware artifact generation and breaks the continuous deployment pipeline.",
        mitigation_strategies=[
            "Fix syntax error, add missing symbols, correct typing, and verify matching brackets.",
            "Ensure required header files are included and functions are declared.",
        ],
        common_consequences=[
            "Build Failure",
            "Denial of Service",
        ],
    ),
}


def get_cwe_metadata(cwe_id: str) -> CweDefinition:
    """Returns canonical CWE definition or a sensible fallback."""
    normalized_id = cwe_id.upper().strip()
    if normalized_id in CWE_CATALOG:
        return CWE_CATALOG[normalized_id]

    return CweDefinition(
        cwe_id=normalized_id,
        name=f"Security Weakness ({normalized_id})",
        description="A potential vulnerability or flaw in memory or logic implementation.",
        extended_description="Identified by static analysis engine.",
        default_severity="MEDIUM",
        cvss_base_score=5.0,
        cvss_vector="CVSS:3.1/AV:L/AC:L/PR:N/UI:N/S:U/C:L/I:L/A:L",
        iot_impact="Potential firmware malfunction or denial of service.",
        mitigation_strategies=["Review code logic and apply defensive checks."],
        common_consequences=["Unexpected system behavior"],
    )
