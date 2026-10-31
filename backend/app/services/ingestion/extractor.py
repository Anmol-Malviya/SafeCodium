"""Safe Vibe AI / SafeCodium — Secure Archive Ingestion & Path Traversal Defense."""

import os
import zipfile
from pathlib import Path
from typing import List

# Security thresholds
MAX_UNCOMPRESSED_SIZE_BYTES = 100 * 1024 * 1024  # 100 MB max decompressed
MAX_FILE_COUNT = 1000                             # Max 1,000 files per archive
MAX_COMPRESSION_RATIO = 100                        # Max 100:1 compression ratio (bomb defense)
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
    # Upper 16 bits of external_attr represent UNIX file permissions / mode
    mode = entry.external_attr >> 16
    # 0o120000 indicates S_IFLNK (symbolic link)
    return (mode & 0o170000) == 0o120000


def safe_extract_zip(zip_path: Path, destination_dir: Path) -> List[Path]:
    """
    Safely extracts a ZIP archive into destination_dir enforcing:
    1. Zip-Slip path traversal defense (relative path containment).
    2. Symlink and junction escape rejection.
    3. Decompression bomb limits (uncompressed size, file count, and compression ratio).
    4. Canonical path boundary verification.
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
            # 1. Symlink / Hardlink rejection
            if is_archive_entry_symlink(entry):
                raise IngestionSecurityError(
                    f"Symbolic links are disallowed in firmware archives: '{entry.filename}'"
                )

            # 2. Compression bomb check
            total_uncompressed_bytes += entry.file_size
            if total_uncompressed_bytes > MAX_UNCOMPRESSED_SIZE_BYTES:
                raise IngestionSecurityError(
                    f"Decompressed archive size exceeds safety threshold ({MAX_UNCOMPRESSED_SIZE_BYTES // (1024*1024)}MB)."
                )

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
            dest_resolved = destination_dir.resolve()

            if not target_path.is_relative_to(dest_resolved):
                raise IngestionSecurityError(
                    f"Canonical target path escapes base directory: '{filename}'"
                )

            # Do not extract directory entries as files
            if entry.is_dir():
                target_path.mkdir(parents=True, exist_ok=True)
                continue

            # Ensure parent directories exist
            target_path.parent.mkdir(parents=True, exist_ok=True)

            # Extract file content safely in chunks
            with archive.open(entry) as source, open(target_path, "wb") as dest:
                bytes_written = 0
                while chunk := source.read(65536):
                    bytes_written += len(chunk)
                    if bytes_written > entry.file_size:
                        raise IngestionSecurityError(f"File size mismatch during extraction of '{filename}'")
                    dest.write(chunk)

            extracted_files.append(target_path)

    return extracted_files
