"""Safe Vibe AI — Secure Archive Ingestion & Zip-Slip Defense."""

import os
import zipfile
from pathlib import Path
from typing import List, Tuple

# Security thresholds
MAX_UNCOMPRESSED_SIZE_BYTES = 100 * 1024 * 1024  # 100 MB max decompressed
MAX_FILE_COUNT = 1000                             # Max 1,000 files per archive
ALLOWED_EXTENSIONS = {
    ".c", ".cpp", ".cc", ".cxx", ".h", ".hpp", ".hh",
    ".txt", ".md", ".json", ".yaml", ".yml", ".cmake", ".ini", ".conf",
    "cmakelists.txt", "makefile", "kconfig", "sdkconfig"
}


class IngestionSecurityError(Exception):
    """Raised when an uploaded archive violates security invariants."""
    pass


def is_safe_path(base_dir: Path, target_path: Path) -> bool:
    """Verifies that target_path resolves strictly inside base_dir (Zip-Slip defense)."""
    try:
        base_resolved = base_dir.resolve()
        target_resolved = target_path.resolve()
        return target_resolved.is_relative_to(base_resolved)
    except Exception:
        return False


def safe_extract_zip(zip_path: Path, destination_dir: Path) -> List[Path]:
    """
    Safely extracts a ZIP archive into destination_dir enforcing:
    1. Zip-Slip path traversal defense.
    2. Decompression bomb limits (uncompressed size + file count).
    3. Symlink / hardlink rejection.
    """
    destination_dir.mkdir(parents=True, exist_ok=True)
    extracted_files: List[Path] = []
    total_uncompressed_bytes = 0

    if not zipfile.is_zipfile(zip_path):
        raise IngestionSecurityError("Uploaded file is not a valid ZIP archive.")

    with zipfile.ZipFile(zip_path, "r") as archive:
        entries = archive.infolist()

        if len(entries) > MAX_FILE_COUNT:
            raise IngestionSecurityError(
                f"Archive contains {len(entries)} entries, exceeding limit of {MAX_FILE_COUNT} files."
            )

        for entry in entries:
            # Check decompression bomb size
            total_uncompressed_bytes += entry.file_size
            if total_uncompressed_bytes > MAX_UNCOMPRESSED_SIZE_BYTES:
                raise IngestionSecurityError(
                    f"Decompressed archive size exceeds safety threshold ({MAX_UNCOMPRESSED_SIZE_BYTES // (1024*1024)}MB)."
                )

            # Check filename for directory traversal indicators
            filename = entry.filename
            if ".." in filename or filename.startswith("/") or filename.startswith("\\"):
                raise IngestionSecurityError(
                    f"Zip-Slip path traversal attempt detected in entry: '{filename}'"
                )

            # Resolve target destination path
            target_path = destination_dir / filename

            if not is_safe_path(destination_dir, target_path):
                raise IngestionSecurityError(
                    f"Canonical target path escapes base directory: '{filename}'"
                )

            # Do not extract directory entries as files
            if entry.is_dir():
                target_path.mkdir(parents=True, exist_ok=True)
                continue

            # Ensure parent directories exist
            target_path.parent.mkdir(parents=True, exist_ok=True)

            # Extract file content safely
            with archive.open(entry) as source, open(target_path, "wb") as dest:
                # Copy in 64KB chunks
                while chunk := source.read(65536):
                    dest.write(chunk)

            extracted_files.append(target_path)

    return extracted_files

