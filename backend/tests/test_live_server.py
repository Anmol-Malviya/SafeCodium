"""Dedicated live HTTP server test for Phase 2."""

import subprocess
import sys
import time
import httpx

def main():
    python_exe = sys.executable
    proc = subprocess.Popen(
        [python_exe, "backend/run_server.py"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    time.sleep(3)
    try:
        with httpx.Client(base_url="http://127.0.0.1:8000", timeout=5.0) as client:
            res = client.get("/api/v1/health")
            print("STATUS_CODE:", res.status_code)
            print("RESPONSE:", res.json())
            assert res.status_code == 200
            assert res.json()["success"] is True
            print("LIVE SERVER PROBE SUCCESSFUL!")
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=3)
        except subprocess.TimeoutExpired:
            proc.kill()

if __name__ == "__main__":
    main()
