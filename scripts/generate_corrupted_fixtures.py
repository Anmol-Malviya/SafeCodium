import zipfile
from pathlib import Path

# 1. Truncated / Header-Damaged ZIP (tests decompression crash protection)
corrupt_zip_bytes = b"PK\x03\x04\x14\x00\x00\x00\x08\x00" + b"\xff\x00\xaa\xbb" * 16 + b"MALFORMED_HEADER_PAYLOAD"
corrupt_zip_path = Path("corrupted_malformed_archive.zip")
corrupt_zip_path.write_bytes(corrupt_zip_bytes)
print("1. Created corrupted malformed ZIP:", corrupt_zip_path.resolve())

# 2. Syntax-Broken / Uncompilable C++ File (tests compiler diagnostics and build gate failure handling)
broken_cpp_content = """// CORRUPTED C++ FIRMWARE FIXTURE
#include <stdio.h>
#include <string.h>

void broken_function(void) {
    int x = ; // SYNTAX ERROR: Missing rvalue expression
    char* ptr = "unclosed string literal;
    
    // Unterminated bracket block
    for (int i = 0; i < 10 i++) {
        x += i;
"""
broken_cpp_path = Path("corrupted_syntax_firmware.cpp")
broken_cpp_path.write_text(broken_cpp_content, encoding="utf-8")
print("2. Created corrupted syntax C++ file:", broken_cpp_path.resolve())

# 3. ZIP archive containing non-code binary garbage (tests 0-file rejection and mime sanitization)
dummy_dir = Path("temp_garbage_test")
dummy_dir.mkdir(exist_ok=True)
(dummy_dir / "firmware_blob.bin").write_bytes(b"\x00\x01\x02\x03\xfe\xff" * 256)
(dummy_dir / "corrupted_asset.dat").write_text("RANDOM_BLOB_CORRUPTED_NON_CPP_CONTENT")

corrupt_payload_zip = Path("corrupted_no_cpp_files.zip")
with zipfile.ZipFile(corrupt_payload_zip, "w") as z:
    z.write(dummy_dir / "firmware_blob.bin", arcname="firmware_blob.bin")
    z.write(dummy_dir / "corrupted_asset.dat", arcname="corrupted_asset.dat")
print("3. Created non-code binary archive ZIP:", corrupt_payload_zip.resolve())

# 4. ZIP containing extreme syntax chaos C++ file (tests scanner recovery & error handling)
syntax_zip = Path("corrupted_firmware_project.zip")
with zipfile.ZipFile(syntax_zip, "w") as z:
    z.write(broken_cpp_path, arcname="broken_module.cpp")
print("4. Created ZIP with broken C++ code:", syntax_zip.resolve())

