"""Safe Vibe AI / SafeCodium — Secure Archive Ingestion & Path Traversal Defense."""

import os
import zipfile
from pathlib import Path
from typing import List

# Relaxed limits to support full repositories, game engines, textures, and large codebases
MAX_UNCOMPRESSED_SIZE_BYTES = 5 * 1024 * 1024 * 1024  # 5 GB max decompressed
MAX_FILE_COUNT = 500000                                # Up to 500,000 files per archive
MAX_COMPRESSION_RATIO = 2000                           # Allows textures/sparse binary while stopping 10000:1 true bombs
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


def is_archive_entry_symlink(entry: zipfile.ZipInfo) -> bool:
    """Checks if the zip entry represents a symbolic link or Unix link."""
    mode = entry.external_attr >> 16
    return (mode & 0o170000) == 0o120000


def _to_long_path(p: Path) -> str:
    """Formats a path with Windows \\\\?\\ prefix if needed to overcome MAX_PATH (260 char) limit."""
    p_str = str(p.resolve())
    if os.name == "nt" and not p_str.startswith("\\\\?\\"):
        if len(p_str) >= 2 and p_str[1] == ":":
            return "\\\\?\\" + p_str
    return p_str


def safe_extract_zip(zip_path: Path, destination_dir: Path) -> List[Path]:
    """
    Safely extracts a ZIP archive into destination_dir enforcing:
    1. Zip-Slip path traversal defense (relative path containment).
    2. Graceful bypass of symlinks.
    3. Windows long path support (bypassing MAX_PATH 260 character limit).
    4. Handles sparse/zero-filled game assets (uasset/textures) without ratio blocking.
    """
    destination_dir.mkdir(parents=True, exist_ok=True)
    dest_resolved = destination_dir.resolve()
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
            # 1. Symlink handling: skip harmless relative symlinks
            if is_archive_entry_symlink(entry):
                continue

            # 2. Total uncompressed size check (5GB max)
            total_uncompressed_bytes += entry.file_size
            if total_uncompressed_bytes > MAX_UNCOMPRESSED_SIZE_BYTES:
                raise IngestionSecurityError(
                    f"Decompressed archive size exceeds safety threshold ({MAX_UNCOMPRESSED_SIZE_BYTES // (1024*1024)}MB)."
                )

            # Skip ratio checks on tiny files (< 10MB) or typical assets (.uasset, .png, .bin, .bmp)
            ext = Path(entry.filename).suffix.lower()
            if entry.file_size > 10 * 1024 * 1024 and ext not in {".uasset", ".png", ".bin", ".bmp", ".dat"}:
                if entry.compress_size > 0:
                    ratio = entry.file_size / entry.compress_size
                    if ratio > MAX_COMPRESSION_RATIO:
                        raise IngestionSecurityError(
                            f"Suspicious compression ratio ({ratio:.1f}:1) detected for '{entry.filename}'"
                        )

            # 3. Path traversal detection
            filename = entry.filename
            if ".." in filename or filename.startswith("/") or filename.startswith("\\"):
                raise IngestionSecurityError(
                    f"Zip-Slip path traversal attempt detected in entry: '{filename}'"
                )

            # 4. Resolve destination path safely
            target_path = (destination_dir / filename).resolve()

            if not target_path.is_relative_to(dest_resolved):
                raise IngestionSecurityError(
                    f"Canonical target path escapes base directory: '{filename}'"
                )

            long_target_str = _to_long_path(target_path)
            long_parent_str = _to_long_path(target_path.parent)

            # Handle directories vs files
            if entry.is_dir():
                os.makedirs(long_target_str, exist_ok=True)
            else:
                os.makedirs(long_parent_str, exist_ok=True)
                with archive.open(entry) as src, open(long_target_str, "wb") as dst:
                    while chunk := src.read(65536):
                        dst.write(chunk)
                extracted_files.append(target_path)

    return extracted_files
