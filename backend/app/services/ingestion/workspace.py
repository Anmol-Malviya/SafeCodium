"""Safe Vibe AI — Workspace Manager & Shadow Cloner."""

import os
import shutil
import stat
from pathlib import Path
from typing import Dict, List, Tuple
from backend.app.core.config import settings

C_EXTENSIONS = {".c", ".cpp", ".cc", ".cxx", ".h", ".hpp", ".hh"}


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

        original_dir.mkdir(parents=True, exist_ok=True)
        shadow_dir.mkdir(parents=True, exist_ok=True)

        return original_dir, shadow_dir

    @staticmethod
    def sync_to_shadow(original_dir: Path, shadow_dir: Path) -> None:
        """Copies all files from original_dir to shadow_dir with fresh permissions."""
        if shadow_dir.exists():
            shutil.rmtree(shadow_dir, ignore_errors=True)
        shutil.copytree(original_dir, shadow_dir, dirs_exist_ok=True)

    @staticmethod
    def detect_framework_type(root_dir: Path) -> str:
        """Heuristically identifies IoT framework from files and headers."""
        esp_markers = {"sdkconfig", "esp_err.h", "esp_wifi.h", "esp_system.h", "freertos/freeRTOS.h"}
        arduino_markers = {"Arduino.h", "sketch.ino"}

        for root, _, files in os.walk(root_dir):
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
        for root, _, files in os.walk(root_dir):
            for file in files:
                ext = Path(file).suffix.lower()
                if ext in C_EXTENSIONS:
                    file_path = Path(root) / file
                    rel_path = file_path.relative_to(root_dir)
                    try:
                        size = file_path.stat().st_size
                        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
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

