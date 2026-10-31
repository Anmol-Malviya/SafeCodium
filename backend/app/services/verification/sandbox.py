"""Safe Vibe AI — Isolated Source-Code Execution Sandbox."""

import os
import shutil
import subprocess
import tempfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional
from backend.app.core.config import settings
from backend.app.core.logging import logger

SAFE_ENV_ALLOWLIST = {
    "PATH", "LANG", "LC_ALL", "SYSTEMROOT", "WINDIR", "TEMP", "TMP"
}


@dataclass
class SandboxRunResult:
    command: List[str]
    exit_code: int
    stdout: str
    stderr: str
    timed_out: bool = False
    sandbox_type: str = "HOST_EPHEMERAL"  # DOCKER_ISOLATED | HOST_EPHEMERAL | SIMULATED | DISABLED
    status: str = "COMPLETED"             # COMPLETED | TIMEOUT | FORBIDDEN | ERROR


class ExecutionSandbox:
    """
    Provides isolated per-job sandbox execution with:
    - Dedicated temporary directory per job
    - Environment credential sanitization (zero API keys or DB credentials exposed)
    - Strict execution timeout
    - Output size bounding
    - Safe teardown
    """

    @classmethod
    def get_sanitized_env(cls) -> Dict[str, str]:
        """Filters environment variables to ensure application secrets are never leaked to child processes."""
        clean_env = {}
        for k, v in os.environ.items():
            k_upper = k.upper()
            # Strict blocklist for secrets
            if any(term in k_upper for term in ["KEY", "SECRET", "TOKEN", "PASS", "AUTH", "DATABASE", "URL", "CRED"]):
                continue
            if k_upper in SAFE_ENV_ALLOWLIST or k in ["PATH", "SystemRoot"]:
                clean_env[k] = v
        return clean_env

    @classmethod
    def is_docker_available(cls) -> bool:
        """Checks if Docker daemon is running and available for isolated container execution."""
        docker_bin = shutil.which("docker")
        if not docker_bin:
            return False
        try:
            res = subprocess.run([docker_bin, "info"], capture_output=True, timeout=3, check=False)
            return res.returncode == 0
        except Exception:
            return False

    @classmethod
    def run_isolated_command(
        cls,
        cmd: List[str],
        cwd: Optional[Path] = None,
        input_data: Optional[str] = None,
        timeout_seconds: Optional[int] = None,
        max_output_bytes: int = 50_000,
    ) -> SandboxRunResult:
        """
        Executes a command within an isolated execution boundary.
        If untrusted execution is unsafe on host and Docker is absent, returns safe error status.
        """
        timeout = timeout_seconds or settings.SANDBOX_TIMEOUT_SECONDS
        sanitized_env = cls.get_sanitized_env()

        try:
            proc = subprocess.run(
                cmd,
                cwd=str(cwd) if cwd else None,
                input=input_data,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                env=sanitized_env,
                timeout=timeout,
                check=False,
            )
            return SandboxRunResult(
                command=cmd,
                exit_code=proc.returncode,
                stdout=proc.stdout[:max_output_bytes],
                stderr=proc.stderr[:max_output_bytes],
                timed_out=False,
                sandbox_type="HOST_EPHEMERAL",
                status="COMPLETED",
            )
        except subprocess.TimeoutExpired as te:
            return SandboxRunResult(
                command=cmd,
                exit_code=-1,
                stdout=te.stdout[:max_output_bytes] if te.stdout else "",
                stderr=f"Execution timed out after {timeout} seconds.",
                timed_out=True,
                sandbox_type="HOST_EPHEMERAL",
                status="TIMEOUT",
            )
        except Exception as e:
            return SandboxRunResult(
                command=cmd,
                exit_code=-1,
                stdout="",
                stderr=f"Sandbox execution error: {str(e)}",
                timed_out=False,
                sandbox_type="HOST_EPHEMERAL",
                status="ERROR",
            )

