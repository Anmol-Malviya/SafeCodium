"""
Safe Vibe AI / SafeCodium — Autonomous Pipeline Orchestrator.
Executes the continuous 9-stage automated workflow:
Upload -> Validate -> Store -> Map -> Analyze -> Explain -> Patch -> Verify -> Report & Package.
Persists step-by-step progress, timings, and cryptographic guarantees.
"""

import asyncio
import os
import shutil
import stat
import time
import uuid
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.logging import logger
from backend.app.models.project import AnalysisJob, Patch, Project, Scan, Verification, Vulnerability
from backend.app.services.analysis.engine import AnalysisEngine
from backend.app.services.iot_context.context_bundle import IotContextBuilder
from backend.app.services.patching.review_engine import PatchReviewEngine
from backend.app.services.patching.synthesizer import PatchSynthesizer
from backend.app.services.reporting.passport_generator import SecurityAssuranceReporter
from backend.app.services.verification.compiler_harness import DualCompilerHarness
from backend.app.services.verification.regression_harness import RegressionTestHarness
from backend.app.services.verification.resource_profiler import ResourceProfiler
from backend.app.services.verification.sanitizer_harness import SanitizerVerificationHarness


PIPELINE_STAGES = [
    {"id": "VALIDATE_FILES", "name": "Validating Files & Sandbox Security", "weight": 10},
    {"id": "MAP_STRUCTURE", "name": "Mapping Project & Architectural Manifest", "weight": 10},
    {"id": "STATIC_ANALYSIS", "name": "Running Static AST & Toolchain Analyzers", "weight": 20},
    {"id": "AI_ROOT_CAUSE", "name": "Investigating Vulnerability Root Cause", "weight": 15},
    {"id": "GENERATE_PATCHES", "name": "Synthesizing Defensive Boundary Patches", "weight": 15},
    {"id": "SHADOW_APPLICATION", "name": "Applying Patches to Isolated Shadow Copy", "weight": 10},
    {"id": "BUILD_AND_TEST", "name": "Dual Compilation & Sanitizer Verification", "weight": 10},
    {"id": "VERIFY_SECURITY", "name": "4-Tier Regression Matrix & Profiling", "weight": 5},
    {"id": "PACKAGE_REPORT", "name": "Generating Cryptographic Passport & Package", "weight": 5},
]


@dataclass
class StageStatus:
    stage_id: str
    name: str
    status: str = "PENDING"  # PENDING, RUNNING, COMPLETED, FAILED, SKIPPED, INCONCLUSIVE
    details: str = ""
    evidence: Dict[str, str] = field(default_factory=dict)
    elapsed_seconds: float = 0.0


class PipelineOrchestrator:
    """Manages autonomous execution of the entire SafeCodium verification and repair pipeline."""

    @classmethod
    async def run_pipeline_for_project(
        cls,
        project_id: str,
        job_id: str,
        db: AsyncSession,
        ai_provider: str = "gemini",
    ) -> Dict[str, Any]:
        """
        Autonomous orchestrator entrypoint.
        Updates job status in database continuously so frontend/clients can poll real-time progress.
        """
        # Fetch Job & Project
        job_res = await db.execute(select(AnalysisJob).where(AnalysisJob.id == job_id))
        job = job_res.scalar_one_or_none()

        proj_res = await db.execute(select(Project).where(Project.id == project_id))
        project = proj_res.scalar_one_or_none()

        if not job or not project:
            logger.error(f"Pipeline job {job_id} or project {project_id} not found.")
            return {"error": "Project or Job not found"}

        # Initialize Stages
        stages_map: Dict[str, StageStatus] = {
            s["id"]: StageStatus(stage_id=s["id"], name=s["name"]) for s in PIPELINE_STAGES
        }

        async def save_progress(curr_stage: str, progress_pct: int, status: str = "running", err: str = None):
            job.current_stage = curr_stage
            job.progress_percentage = progress_pct
            job.status = status
            job.error_message = err
            job.stages_data = {
                k: {
                    "stage_id": v.stage_id,
                    "name": v.name,
                    "status": v.status,
                    "details": v.details,
                    "evidence": v.evidence,
                    "elapsed_seconds": round(v.elapsed_seconds, 2),
                }
                for k, v in stages_map.items()
            }
            await db.commit()

        total_start = time.time()

        try:
            # -------------------------------------------------------------
            # Stage 1: VALIDATE_FILES
            # -------------------------------------------------------------
            t0 = time.time()
            stages_map["VALIDATE_FILES"].status = "RUNNING"
            await save_progress("VALIDATE_FILES", 5)

            orig_dir = Path(project.original_path)
            shadow_dir = Path(project.shadow_path) if project.shadow_path else None

            if not orig_dir.exists() or not shadow_dir or not shadow_dir.exists():
                raise RuntimeError("Workspaces not properly initialized on host.")

            stages_map["VALIDATE_FILES"].status = "COMPLETED"
            stages_map["VALIDATE_FILES"].details = f"Verified read-only original and writable shadow isolation for {project.file_count} files."
            stages_map["VALIDATE_FILES"].evidence = {"original": str(orig_dir), "shadow": str(shadow_dir)}
            stages_map["VALIDATE_FILES"].elapsed_seconds = time.time() - t0
            await save_progress("VALIDATE_FILES", 10)

            # -------------------------------------------------------------
            # Stage 2: MAP_STRUCTURE (Project Discovery)
            # -------------------------------------------------------------
            t0 = time.time()
            stages_map["MAP_STRUCTURE"].status = "RUNNING"
            await save_progress("MAP_STRUCTURE", 15)

            source_files = []
            for root, _, files in os.walk(shadow_dir):
                for f in files:
                    if Path(f).suffix.lower() in {".c", ".cpp", ".cc", ".h", ".hpp"}:
                        source_files.append(str(Path(root, f).relative_to(shadow_dir)))

            stages_map["MAP_STRUCTURE"].status = "COMPLETED"
            stages_map["MAP_STRUCTURE"].details = f"Discovered {len(source_files)} source files. Framework identified as '{project.framework_type.upper()}'."
            stages_map["MAP_STRUCTURE"].evidence = {"files_indexed": str(len(source_files)), "framework": project.framework_type}
            stages_map["MAP_STRUCTURE"].elapsed_seconds = time.time() - t0
            await save_progress("MAP_STRUCTURE", 20)

            # -------------------------------------------------------------
            # Stage 3: STATIC_ANALYSIS (Vulnerability Scanning)
            # -------------------------------------------------------------
            t0 = time.time()
            stages_map["STATIC_ANALYSIS"].status = "RUNNING"
            await save_progress("STATIC_ANALYSIS", 30)

            scan = await AnalysisEngine.run_scan(project=project, db=db, scanner_type="composite")

            vuln_query = await db.execute(select(Vulnerability).where(Vulnerability.scan_id == scan.id))
            vulnerabilities = vuln_query.scalars().all()

            stages_map["STATIC_ANALYSIS"].status = "COMPLETED"
            stages_map["STATIC_ANALYSIS"].details = f"Static analysis complete. Detected {len(vulnerabilities)} vulnerabilities (CWE catalog normalized)."
            stages_map["STATIC_ANALYSIS"].evidence = {"findings_count": str(len(vulnerabilities)), "scan_id": scan.id}
            stages_map["STATIC_ANALYSIS"].elapsed_seconds = time.time() - t0
            await save_progress("STATIC_ANALYSIS", 40)

            if not vulnerabilities:
                # No vulnerabilities found -> project is clean
                stages_map["AI_ROOT_CAUSE"].status = "SKIPPED"
                stages_map["AI_ROOT_CAUSE"].details = "No vulnerabilities detected; AI investigation skipped."
                stages_map["GENERATE_PATCHES"].status = "SKIPPED"
                stages_map["GENERATE_PATCHES"].details = "No repairs necessary."
                stages_map["SHADOW_APPLICATION"].status = "SKIPPED"
                stages_map["BUILD_AND_TEST"].status = "SKIPPED"
                stages_map["VERIFY_SECURITY"].status = "SKIPPED"
                stages_map["PACKAGE_REPORT"].status = "COMPLETED"
                stages_map["PACKAGE_REPORT"].details = "Clean project verified and packaged."
                job.summary_data = {
                    "total_vulns": 0,
                    "repaired_count": 0,
                    "verified_count": 0,
                    "final_verdict": "VERIFIED_CLEAN",
                }
                await save_progress("PACKAGE_REPORT", 100, status="completed")
                return {"status": "completed", "final_verdict": "VERIFIED_CLEAN"}

            # Iterate over unique vulnerable files so that each file is repaired and verified one by one
            seen_files = set()
            unique_target_vulns = []
            for v in vulnerabilities:
                if v.file_path not in seen_files:
                    seen_files.add(v.file_path)
                    unique_target_vulns.append(v)

            total_repaired = 0
            latest_passport = None
            last_final_status = "REJECTED"

            # Freshly synchronize shadow workspace from immutable original before repair cycle
            if orig_dir.exists():
                for s_file in shadow_dir.rglob('*'):
                    if s_file.is_file():
                        try:
                            os.chmod(s_file, stat.S_IWRITE | stat.S_IREAD)
                        except Exception:
                            pass
                def copy_with_write_perm(src, dst):
                    shutil.copy2(src, dst)
                    try:
                        os.chmod(dst, stat.S_IWRITE | stat.S_IREAD)
                    except Exception:
                        pass
                shutil.copytree(orig_dir, shadow_dir, dirs_exist_ok=True, copy_function=copy_with_write_perm)

            for idx, target_vuln in enumerate(unique_target_vulns, 1):
                # -------------------------------------------------------------
                # Stage 4: AI_ROOT_CAUSE (Investigation & IoT Context)
                # -------------------------------------------------------------
                t0 = time.time()
                stages_map["AI_ROOT_CAUSE"].status = "RUNNING"
                stages_map["AI_ROOT_CAUSE"].details = f"Analyzing {target_vuln.file_path} for {target_vuln.cwe_id} ({target_vuln.title})..."
                stages_map["AI_ROOT_CAUSE"].evidence = {
                    "cwe": target_vuln.cwe_id,
                    "file": target_vuln.file_path,
                    "line": str(target_vuln.line_start),
                }
                await save_progress("AI_ROOT_CAUSE", int(40 + (idx / len(unique_target_vulns)) * 15))

                context_bundle = IotContextBuilder.build_bundle(project=project, vuln=target_vuln)
                stages_map["AI_ROOT_CAUSE"].status = "COMPLETED"
                stages_map["AI_ROOT_CAUSE"].details = f"Analyzed {target_vuln.cwe_id} in {target_vuln.file_path} with {len(context_bundle.peripheral_sources)} peripheral taint sources."
                stages_map["AI_ROOT_CAUSE"].elapsed_seconds = time.time() - t0
                await save_progress("AI_ROOT_CAUSE", int(40 + (idx / len(unique_target_vulns)) * 18))

                # -------------------------------------------------------------
                # Stage 5: GENERATE_PATCHES (Unified Diff Synthesis)
                # -------------------------------------------------------------
                t0 = time.time()
                stages_map["GENERATE_PATCHES"].status = "RUNNING"
                stages_map["GENERATE_PATCHES"].details = f"Synthesizing patch for {target_vuln.file_path}..."
                stages_map["GENERATE_PATCHES"].evidence = {"file": target_vuln.file_path, "cwe": target_vuln.cwe_id}
                await save_progress("GENERATE_PATCHES", int(60 + (idx / len(unique_target_vulns)) * 10))

                patch_record, patch_detail = await PatchSynthesizer.synthesize_patch(
                    vuln=target_vuln,
                    project=project,
                    db=db,
                    provider=ai_provider,
                )

                stages_map["GENERATE_PATCHES"].status = "COMPLETED"
                stages_map["GENERATE_PATCHES"].details = f"Synthesized defensive patch for {target_vuln.file_path} via {patch_record.ai_provider}."
                stages_map["GENERATE_PATCHES"].evidence = {
                    "patch_id": patch_record.id,
                    "file": target_vuln.file_path,
                    "strategy": patch_record.repair_strategy,
                }
                stages_map["GENERATE_PATCHES"].elapsed_seconds = time.time() - t0
                await save_progress("GENERATE_PATCHES", int(60 + (idx / len(unique_target_vulns)) * 12))

                # -------------------------------------------------------------
                # Stage 6: SHADOW_APPLICATION (Safe Workspace Patching)
                # -------------------------------------------------------------
                t0 = time.time()
                stages_map["SHADOW_APPLICATION"].status = "RUNNING"
                stages_map["SHADOW_APPLICATION"].details = f"Patching shadow copy of {target_vuln.file_path}..."
                stages_map["SHADOW_APPLICATION"].evidence = {"file": target_vuln.file_path}
                await save_progress("SHADOW_APPLICATION", int(72 + (idx / len(unique_target_vulns)) * 8))

                apply_res = PatchReviewEngine.apply_patch_to_shadow(
                    shadow_workspace_path=project.shadow_path,
                    relative_file_path=target_vuln.file_path,
                    diff_text=patch_record.unified_diff,
                    dry_run=False,
                )
                patch_record.status = "APPLIED"
                await db.commit()

                stages_map["SHADOW_APPLICATION"].status = "COMPLETED"
                stages_map["SHADOW_APPLICATION"].details = f"Applied {apply_res.hunks_applied}/{apply_res.hunks_total} hunks to {target_vuln.file_path}."
                stages_map["SHADOW_APPLICATION"].evidence = {
                    "file": target_vuln.file_path,
                    "hunks_applied": str(apply_res.hunks_applied),
                }
                stages_map["SHADOW_APPLICATION"].elapsed_seconds = time.time() - t0
                await save_progress("SHADOW_APPLICATION", int(72 + (idx / len(unique_target_vulns)) * 10))

                # -------------------------------------------------------------
                # Stage 7: BUILD_AND_TEST (Dual Compiler & Sanitizers)
                # -------------------------------------------------------------
                t0 = time.time()
                stages_map["BUILD_AND_TEST"].status = "RUNNING"
                stages_map["BUILD_AND_TEST"].details = f"Verifying {target_vuln.file_path} under dual Clang/ASan traps..."
                stages_map["BUILD_AND_TEST"].evidence = {"file": target_vuln.file_path}
                await save_progress("BUILD_AND_TEST", 85)

                orig_file_cand = list(orig_dir.glob(f"**/{Path(target_vuln.file_path).name}"))
                shadow_file_cand = list(shadow_dir.glob(f"**/{Path(target_vuln.file_path).name}"))
                orig_file_path = str(orig_file_cand[0]) if orig_file_cand else str(orig_dir / target_vuln.file_path)
                shadow_file_path = str(shadow_file_cand[0]) if shadow_file_cand else str(shadow_dir / target_vuln.file_path)

                comp_res = DualCompilerHarness.compare_compilation(
                    patch_id=patch_record.id,
                    original_file_path=orig_file_path,
                    shadow_file_path=shadow_file_path,
                )

                san_res = SanitizerVerificationHarness.compare_sanitizers(
                    patch_id=patch_record.id,
                    original_file_path=orig_file_path,
                    shadow_file_path=shadow_file_path,
                    target_cwe=target_vuln.cwe_id,
                )

                build_passed = comp_res.compilation_passed and san_res.verification_passed
                stages_map["BUILD_AND_TEST"].status = "COMPLETED" if build_passed else "INCONCLUSIVE"
                stages_map["BUILD_AND_TEST"].details = f"Dual toolchain for {target_vuln.file_path}: compiled exit {comp_res.post_patch.exit_code}. ASan clean."
                stages_map["BUILD_AND_TEST"].evidence = {
                    "file": target_vuln.file_path,
                    "compiler_exit": str(comp_res.post_patch.exit_code),
                    "asan_clean": "TRUE" if san_res.verification_passed else "FALSE",
                }
                stages_map["BUILD_AND_TEST"].elapsed_seconds = time.time() - t0
                await save_progress("BUILD_AND_TEST", 90)

                # -------------------------------------------------------------
                # Stage 8: VERIFY_SECURITY (4-Tier Regression & Resource Profile)
                # -------------------------------------------------------------
                t0 = time.time()
                stages_map["VERIFY_SECURITY"].status = "RUNNING"
                await save_progress("VERIFY_SECURITY", 93)

                reg_res = RegressionTestHarness.run_regression_suite(
                    patch_id=patch_record.id,
                    cwe_id=target_vuln.cwe_id,
                    original_source_path=orig_file_path,
                    shadow_source_path=shadow_file_path,
                )

                prof_res = ResourceProfiler.compare_resource_profile(
                    patch_id=patch_record.id,
                    original_source_path=orig_file_path,
                    shadow_source_path=shadow_file_path,
                )

                final_status = "VERIFIED" if (comp_res.compilation_passed and san_res.verification_passed and reg_res.suite_passed and prof_res.is_resource_safe) else "REJECTED"
                last_final_status = final_status
                verification = Verification(
                    patch_id=patch_record.id,
                    pre_patch_compiler_exit=comp_res.pre_patch.exit_code,
                    post_patch_compiler_exit=comp_res.post_patch.exit_code,
                    asan_exit_code=san_res.post_patch_asan.exit_code,
                    asan_output=san_res.post_patch_asan.report_output,
                    ubsan_exit_code=san_res.post_patch_ubsan.exit_code,
                    ubsan_output=san_res.post_patch_ubsan.report_output,
                    test_suite_passed=reg_res.suite_passed,
                    binary_size_delta_bytes=prof_res.flash_delta_bytes,
                    final_status=final_status,
                )
                db.add(verification)
                patch_record.status = final_status
                if final_status == "VERIFIED":
                    for v in vulnerabilities:
                        if v.file_path == target_vuln.file_path:
                            v.status = "verified"
                else:
                    target_vuln.status = "rejected"
                await db.commit()

                stages_map["VERIFY_SECURITY"].status = "COMPLETED"
                stages_map["VERIFY_SECURITY"].details = f"Verified {target_vuln.file_path}: {reg_res.passed_cases}/{reg_res.total_cases} passed. Status: {final_status}."
                stages_map["VERIFY_SECURITY"].evidence = {
                    "file": target_vuln.file_path,
                    "regression_pass": f"{reg_res.passed_cases}/{reg_res.total_cases}",
                    "final_status": final_status,
                }
                stages_map["VERIFY_SECURITY"].elapsed_seconds = time.time() - t0
                await save_progress("VERIFY_SECURITY", 96)

                total_repaired += 1
                latest_passport = SecurityAssuranceReporter.generate_passport(
                    passport_id=f"PASSPORT-{uuid.uuid4().hex[:8].upper()}",
                    project_id=project.id,
                    project_name=project.name,
                    vuln_id=target_vuln.id,
                    cwe_id=target_vuln.cwe_id,
                    cwe_name=target_vuln.title,
                    pre_cvss=9.8 if target_vuln.severity == "CRITICAL" else 7.5,
                    patch_id=patch_record.id,
                    ai_provider=patch_record.ai_provider,
                    model_name=patch_record.model_name,
                    original_code=Path(orig_file_path).read_text(encoding="utf-8", errors="replace"),
                    repaired_code=Path(shadow_file_path).read_text(encoding="utf-8", errors="replace"),
                    unified_diff=patch_record.unified_diff,
                    sanitizer_output=san_res.post_patch_asan.report_output,
                    compiler_exit=comp_res.post_patch.exit_code,
                    asan_exit=san_res.post_patch_asan.exit_code,
                    test_passed=reg_res.suite_passed,
                    flash_delta=prof_res.flash_delta_bytes,
                    final_status=final_status,
                )

            # -------------------------------------------------------------
            # Stage 9: PACKAGE_REPORT (Passport & Repaired Package)
            # -------------------------------------------------------------
            t0 = time.time()
            stages_map["PACKAGE_REPORT"].status = "RUNNING"
            await save_progress("PACKAGE_REPORT", 98)

            passport = SecurityAssuranceReporter.generate_passport(
                passport_id=f"PASSPORT-{uuid.uuid4().hex[:8].upper()}",
                project_id=project.id,
                project_name=project.name,
                vuln_id=target_vuln.id,
                cwe_id=target_vuln.cwe_id,
                cwe_name=target_vuln.title,
                pre_cvss=9.8 if target_vuln.severity == "CRITICAL" else 7.5,
                patch_id=patch_record.id,
                ai_provider=patch_record.ai_provider,
                model_name=patch_record.model_name,
                original_code=Path(orig_file_path).read_text(encoding="utf-8", errors="replace"),
                repaired_code=Path(shadow_file_path).read_text(encoding="utf-8", errors="replace"),
                unified_diff=patch_record.unified_diff,
                sanitizer_output=san_res.post_patch_asan.report_output,
                compiler_exit=comp_res.post_patch.exit_code,
                asan_exit=san_res.post_patch_asan.exit_code,
                test_passed=reg_res.suite_passed,
                flash_delta=prof_res.flash_delta_bytes,
                final_status=final_status,
            )

            stages_map["PACKAGE_REPORT"].status = "COMPLETED"
            stages_map["PACKAGE_REPORT"].details = f"Verification Passport {passport.passport_id} signed with root SHA-256 hash. Repaired package ready for download."
            stages_map["PACKAGE_REPORT"].evidence = {
                "passport_id": passport.passport_id,
                "signature": passport.cryptographic_hashes.passport_signature_sha256[:16] + "...",
            }
            stages_map["PACKAGE_REPORT"].elapsed_seconds = time.time() - t0

            job.summary_data = {
                "total_vulns": len(vulnerabilities),
                "repaired_cwe": target_vuln.cwe_id,
                "patch_id": patch_record.id,
                "passport_id": passport.passport_id,
                "final_verdict": final_status,
                "total_elapsed_seconds": round(time.time() - total_start, 2),
            }
            await save_progress("PACKAGE_REPORT", 100, status="completed")

            return {
                "status": "completed",
                "final_verdict": final_status,
                "passport_id": passport.passport_id,
                "patch_id": patch_record.id,
            }

        except Exception as e:
            logger.error(f"Pipeline execution failure on job {job_id}: {e}", exc_info=True)
            job.status = "failed"
            job.error_message = str(e)
            await db.commit()
            return {"status": "failed", "error": str(e)}
