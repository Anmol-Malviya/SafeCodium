"""Safe Vibe AI / SafeCodium — Workspace Manager & Shadow Cloner."""

import os
import shutil
import stat
from pathlib import Path
from typing import Dict, List, Tuple
from backend.app.core.config import settings

C_EXTENSIONS = {".c", ".cpp", ".cc", ".cxx", ".h", ".hpp", ".hh"}


def _to_long_path(p: Path) -> str:
    """Formats path for Windows extended-length paths (\\\\?\\ prefix)."""
    p_str = str(p.resolve())
    if os.name == "nt" and not p_str.startswith("\\\\?\\"):
        if len(p_str) >= 2 and p_str[1] == ":":
            return "\\\\?\\" + p_str
    return p_str


class WorkspaceManager:
    """Manages read-only originals and isolated shadow workspaces."""

    @staticmethod
    def setup_project_workspace(project_id: str) -> Tuple[Path, Path]:
        """
        Initializes directory structure:
        - data/uploads/{project_id}/original  (Read-only preservation)
        - data/workspaces/{project_id}/shadow (Isolated sandbox copy)
        """
        original_dir = settings.UPLOAD_DIR / project_id / "original"
        shadow_dir = settings.WORKSPACE_DIR / project_id / "shadow"

        os.makedirs(_to_long_path(original_dir), exist_ok=True)
        os.makedirs(_to_long_path(shadow_dir), exist_ok=True)

        return original_dir, shadow_dir

    @staticmethod
    def protect_original_workspace(original_dir: Path) -> None:
        """
        Enforces read-only permissions on original source files.
        Guarantees that original firmware cannot be modified during patching or testing.
        """
        long_orig = _to_long_path(original_dir)
        for root, dirs, files in os.walk(long_orig):
            for file in files:
                full_path = os.path.join(root, file)
                try:
                    mode = os.stat(full_path).st_mode
                    os.chmod(full_path, mode & ~stat.S_IWRITE)
                except Exception:
                    pass

    @staticmethod
    def unprotect_original_workspace(original_dir: Path) -> None:
        """Restores write permissions if directory cleanup or deletion is needed."""
        long_orig = _to_long_path(original_dir)
        for root, dirs, files in os.walk(long_orig):
            for file in files:
                full_path = os.path.join(root, file)
                try:
                    mode = os.stat(full_path).st_mode
                    os.chmod(full_path, mode | stat.S_IWRITE)
                except Exception:
                    pass

    @staticmethod
    def sync_to_shadow(original_dir: Path, shadow_dir: Path) -> None:
        """Copies all files from original_dir to shadow_dir with fresh writable permissions."""
        long_orig = _to_long_path(original_dir)
        long_shadow = _to_long_path(shadow_dir)

        if os.path.exists(long_shadow):
            shutil.rmtree(long_shadow, ignore_errors=True)
        shutil.copytree(long_orig, long_shadow, dirs_exist_ok=True)

        # Ensure shadow copy files are explicitly writable
        for root, _, files in os.walk(long_shadow):
            for file in files:
                full_path = os.path.join(root, file)
                try:
                    mode = os.stat(full_path).st_mode
                    os.chmod(full_path, mode | stat.S_IWRITE)
                except Exception:
                    pass

    @staticmethod
    def detect_framework_type(root_dir: Path) -> str:
        """Heuristically identifies IoT framework from files and headers."""
        esp_markers = {"sdkconfig", "esp_err.h", "esp_wifi.h", "esp_system.h", "freertos/freeRTOS.h"}
        arduino_markers = {"Arduino.h", "sketch.ino"}

        long_root = _to_long_path(root_dir)
        for root, _, files in os.walk(long_root):
            for file in files:
                f_lower = file.lower()
                if f_lower in esp_markers or f_lower.endswith(".kconfig"):
                    return "esp_idf"
                if f_lower in arduino_markers or f_lower.endswith(".ino"):
                    return "arduino"

        return "generic_c"

    @staticmethod
    def index_source_files(root_dir: Path) -> List[Dict[str, any]]:
        """Scans directory and returns metadata for all C/C++ source and header files."""
        indexed_files = []
        long_root = _to_long_path(root_dir)
        for root, _, files in os.walk(long_root):
            for file in files:
                ext = Path(file).suffix.lower()
                if ext in C_EXTENSIONS:
                    full_path = os.path.join(root, file)
                    clean_root = str(root_dir.resolve())
                    clean_full = full_path.replace("\\\\?\\", "")
                    try:
                        rel_path = os.path.relpath(clean_full, clean_root)
                        size = os.stat(full_path).st_size
                        with open(full_path, "r", encoding="utf-8", errors="replace") as f:
                            line_count = sum(1 for _ in f)
                        indexed_files.append({
                            "relative_path": str(rel_path).replace("\\", "/"),
                            "filename": file,
                            "extension": ext,
                            "size_bytes": size,
                            "line_count": line_count,
                        })
                    except Exception:
                        pass
        return indexed_files
