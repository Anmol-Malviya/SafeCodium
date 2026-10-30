"""Safe Vibe AI — Static Security Rules for Embedded C/C++ Firmware."""

import re
from typing import Dict, List, NamedTuple, Optional


class SecurityFindingRaw(NamedTuple):
    cwe_id: str
    title: str
    severity: str  # CRITICAL, HIGH, MEDIUM, LOW
    line_number: int
    line_end: int
    function_name: Optional[str]
    vulnerable_code: str
    explanation: str
    scanner_source: str


# Regex & AST detection patterns for prioritized CWEs
STATIC_PATTERNS = [
    # CWE-120: Buffer Copy without Checking Size of Input
    {
        "cwe_id": "CWE-120",
        "title": "Unbounded Memory Copy via strcpy()",
        "severity": "CRITICAL",
        "pattern": re.compile(r"\bstrcpy\s*\(\s*([A-Za-z0-9_.\->\[\]]+)\s*,\s*([A-Za-z0-9_.\->\[\]]+)\s*\)"),
        "explanation": "Function strcpy() does not verify destination buffer capacity, creating buffer overflow risks.",
    },
    {
        "cwe_id": "CWE-120",
        "title": "Unbounded String Concatenation via strcat()",
        "severity": "HIGH",
        "pattern": re.compile(r"\bstrcat\s*\(\s*([A-Za-z0-9_.\->\[\]]+)\s*,\s*([A-Za-z0-9_.\->\[\]]+)\s*\)"),
        "explanation": "Function strcat() appends source without checking remaining destination capacity.",
    },
    {
        "cwe_id": "CWE-120",
        "title": "Inherently Dangerous Function gets()",
        "severity": "CRITICAL",
        "pattern": re.compile(r"\bgets\s*\(\s*([A-Za-z0-9_.\->\[\]]+)\s*\)"),
        "explanation": "Function gets() provides zero buffer size control and cannot be used safely.",
    },
    {
        "cwe_id": "CWE-120",
        "title": "Unbounded Formatting via sprintf()",
        "severity": "HIGH",
        "pattern": re.compile(r"\bsprintf\s*\(\s*([A-Za-z0-9_.\->\[\]]+)\s*,\s*\"[^\"]*%s"),
        "explanation": "Function sprintf() writes unconstrained formatted string into destination buffer. Use snprintf().",
    },

    # CWE-787: Out-of-bounds Write
    {
        "cwe_id": "CWE-787",
        "title": "Potential Out-of-Bounds Memory Write",
        "severity": "CRITICAL",
        "pattern": re.compile(r"(\w+)\[\s*(\w+)\s*\]\s*=\s*[^;]+;"),
        "explanation": "Array element assignment without preceding bounds assertion or modulo restriction.",
    },

    # CWE-476: NULL Pointer Dereference
    {
        "cwe_id": "CWE-476",
        "title": "Unchecked Pointer Dereference",
        "severity": "HIGH",
        "pattern": re.compile(r"(\*([A-Za-z0-9_]+)|\b([A-Za-z0-9_]+)->[A-Za-z0-9_]+|\b([A-Za-z0-9_]+)\[0\])"),
        "explanation": "Pointer or array parameter dereferenced without validating that the pointer is non-NULL.",
    },

    # CWE-416: Use After Free
    {
        "cwe_id": "CWE-416",
        "title": "Potential Use-After-Free of Pointer",
        "severity": "CRITICAL",
        "pattern": re.compile(r"\bfree\s*\(\s*([A-Za-z0-9_]+)\s*\);"),
        "explanation": "Pointer is freed; any subsequent dereference without reassignment triggers Use-After-Free.",
    },
]
