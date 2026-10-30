"""Safe Vibe AI — Composite Static Analysis Engine."""

import json
import shutil
import subprocess
from pathlib import Path
from typing import Dict, List
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.logging import logger
from backend.app.models.project import Project, Scan, Vulnerability
from backend.app.services.analysis.ast_scanner import AstSecurityScanner
from backend.app.services.analysis.rules import SecurityFindingRaw


class AnalysisEngine:
    """Orchestrates static analysis across all source files in a shadow workspace."""

    @classmethod
    async def run_scan(
        cls,
        project: Project,
        db: AsyncSession,
        scanner_type: str = "composite",
    ) -> Scan:
        """Executes vulnerability scan on project's shadow workspace."""
        shadow_dir = Path(project.shadow_path)
        logger.info(f"Running static security scan on project '{project.name}' at {shadow_dir}")

        scan = Scan(
            project_id=project.id,
            scanner_type=scanner_type,
            status="running",
            findings_count=0,
        )
        db.add(scan)
        await db.commit()
        await db.refresh(scan)

        raw_findings: List[Tuple[str, SecurityFindingRaw]] = []

        # 1. Custom AST & Syntax Scanner across all C/C++ files
        for root, _, files in shutil.os.walk(shadow_dir):
            for file in files:
                ext = Path(file).suffix.lower()
                if ext in {".c", ".cpp", ".cc", ".cxx", ".h", ".hpp"}:
                    file_path = Path(root) / file
                    rel_path = str(file_path.relative_to(shadow_dir)).replace("\\", "/")
                    file_findings = AstSecurityScanner.scan_file(file_path, rel_path)
                    for f in file_findings:
                        raw_findings.append((rel_path, f))

        # 2. Check for Semgrep if installed on PATH
        semgrep_binary = shutil.which("semgrep")
        if semgrep_binary:
            logger.info("Semgrep detected. Running community C security rules...")
            try:
                semgrep_cmd = [
                    semgrep_binary,
                    "scan",
                    "--config", "p/c",
                    "--json",
                    "--quiet",
                    str(shadow_dir),
                ]
                res = subprocess.run(semgrep_cmd, capture_output=True, text=True, timeout=60, check=False)
                if res.returncode in (0, 1) and res.stdout.strip():
                    data = json.loads(res.stdout)
                    for result in data.get("results", []):
                        path_str = result.get("path", "")
                        line_no = result.get("start", {}).get("line", 1)
                        check_id = result.get("check_id", "semgrep.c.vuln")
                        msg = result.get("extra", {}).get("message", "Semgrep security finding")
                        raw_findings.append((
                            path_str,
                            SecurityFindingRaw(
                                cwe_id="CWE-120" if "buffer" in msg.lower() else "CWE-787",
                                title=f"Semgrep: {check_id.split('.')[-1]}",
                                severity="HIGH",
                                line_number=line_no,
                                line_end=result.get("end", {}).get("line", line_no),
                                function_name=None,
                                vulnerable_code=result.get("extra", {}).get("lines", ""),
                                explanation=msg,
                                scanner_source="semgrep",
                            ),
                        ))
            except Exception as e:
                logger.warning(f"Semgrep execution encountered an issue: {e}")

        # Deduplicate findings by (rel_path, cwe_id, line_number)
        seen = set()
        deduped_vulnerabilities: List[Vulnerability] = []

        for rel_path, finding in raw_findings:
            key = (rel_path, finding.cwe_id, finding.line_number)
            if key not in seen:
                seen.add(key)
                vuln = Vulnerability(
                    project_id=project.id,
                    scan_id=scan.id,
                    cwe_id=finding.cwe_id,
                    title=finding.title,
                    severity=finding.severity,
                    file_path=rel_path,
                    line_start=finding.line_number,
                    line_end=finding.line_end,
                    function_name=finding.function_name,
                    vulnerable_code=finding.vulnerable_code,
                    scanner_source=finding.scanner_source,
                    status="detected",
                )
                db.add(vuln)
                deduped_vulnerabilities.append(vuln)

        # Update Scan record
        scan.status = "completed"
        scan.findings_count = len(deduped_vulnerabilities)
        scan.raw_output = f"Scan complete. Discovered {len(deduped_vulnerabilities)} security findings."

        await db.commit()
        await db.refresh(scan)

        logger.info(f"Scan {scan.id} finished with {scan.findings_count} findings.")
        return scan
