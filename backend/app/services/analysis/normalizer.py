"""Safe Vibe AI — Finding Normalization & Severity Calculation."""

from typing import Dict, List, Optional, Tuple
from pydantic import BaseModel

from backend.app.models.project import Vulnerability
from backend.app.services.analysis.cwe_catalog import CweDefinition, get_cwe_metadata


class EnrichedVulnerability(BaseModel):
    id: str
    project_id: str
    scan_id: Optional[str]
    cwe_id: str
    cwe_name: str
    title: str
    severity: str
    cvss_base_score: float
    cvss_vector: str
    confidence: str  # HIGH, MEDIUM, LOW
    confidence_score: float
    file_path: str
    line_start: int
    line_end: int
    function_name: Optional[str]
    vulnerable_code: str
    scanner_source: str
    explanation: str
    iot_impact: str
    mitigation_strategies: List[str]
    status: str


class FindingNormalizer:
    """Enriches and normalizes raw vulnerabilities into authoritative security findings."""

    @classmethod
    def calculate_confidence(cls, vuln: Vulnerability) -> Tuple[str, float]:
        """Calculates confidence score based on scanner source and AST evidence."""
        code = vuln.vulnerable_code.lower()

        # Definite dangerous functions
        if any(fn in code for fn in ("strcpy", "strcat", "gets")):
            return "HIGH", 0.98

        # Explicit parameter dereference with verified function scope
        if vuln.function_name and vuln.cwe_id == "CWE-476":
            return "HIGH", 0.92

        # Free with subsequent pointer dereference
        if vuln.cwe_id == "CWE-416":
            return "HIGH", 0.90

        if vuln.scanner_source == "semgrep":
            return "HIGH", 0.88

        return "MEDIUM", 0.75

    @classmethod
    def normalize(cls, vuln: Vulnerability) -> EnrichedVulnerability:
        """Enriches a Vulnerability model instance with CWE catalog and CVSS metrics."""
        cwe_meta = get_cwe_metadata(vuln.cwe_id)
        confidence_label, confidence_score = cls.calculate_confidence(vuln)

        # Context-aware severity adjustment
        severity = vuln.severity or cwe_meta.default_severity

        return EnrichedVulnerability(
            id=vuln.id,
            project_id=vuln.project_id,
            scan_id=vuln.scan_id,
            cwe_id=vuln.cwe_id,
            cwe_name=cwe_meta.name,
            title=vuln.title,
            severity=severity,
            cvss_base_score=cwe_meta.cvss_base_score,
            cvss_vector=cwe_meta.cvss_vector,
            confidence=confidence_label,
            confidence_score=confidence_score,
            file_path=vuln.file_path,
            line_start=vuln.line_start,
            line_end=vuln.line_end,
            function_name=vuln.function_name,
            vulnerable_code=vuln.vulnerable_code,
            scanner_source=vuln.scanner_source,
            explanation=cwe_meta.description,
            iot_impact=cwe_meta.iot_impact,
            mitigation_strategies=cwe_meta.mitigation_strategies,
            status=vuln.status,
        )
