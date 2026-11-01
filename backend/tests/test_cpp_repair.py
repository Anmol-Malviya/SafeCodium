"""Tests for C/C++ compilation diagnostic scanning and auto-repair."""

from pathlib import Path
import pytest

from backend.app.db.session import init_db, AsyncSessionLocal
from backend.app.models.project import Project, Vulnerability
from backend.app.services.analysis.engine import AnalysisEngine
from backend.app.services.verification.compiler_harness import DualCompilerHarness


@pytest.mark.asyncio
async def test_cpp_compilation_diagnostic_detection(tmp_path):
    """Test that C++ syntax/compiler errors are detected as CWE-COMPILE-ERR findings."""
    await init_db()

    # Create dummy workspace with broken C++ code
    cpp_broken = tmp_path / "broken_sensor.cpp"
    cpp_broken.write_text(
        """#include <iostream>

void process_data() {
    int value = 42
    std::cout << value << std::endl;
}
""",
        encoding="utf-8",
    )

    comp_res = DualCompilerHarness.compile_file(str(cpp_broken))
    assert not comp_res.success
    assert any("error:" in diag for diag in comp_res.diagnostics)

    # Verify AnalysisEngine detects it
    async with AsyncSessionLocal() as db:
        project = Project(
            name="Cpp Diagnostic Test",
            original_path=str(tmp_path),
            shadow_path=str(tmp_path),
            framework_type="generic_cpp",
            source_type="single_file",
        )
        db.add(project)
        await db.commit()
        await db.refresh(project)

        scan = await AnalysisEngine.run_scan(project, db)
        assert scan.findings_count >= 1

        vulns = (await db.execute(
            Vulnerability.__table__.select().where(Vulnerability.project_id == project.id)
        )).fetchall()
        assert any(v.cwe_id == "CWE-COMPILE-ERR" for v in vulns)
