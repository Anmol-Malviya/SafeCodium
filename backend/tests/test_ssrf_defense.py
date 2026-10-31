"""
Safe Vibe AI — SSRF Defense Engine Test Suite.
Validates:
1. Rejection of forbidden schemes (file://, gopher://, ftp://, dict://).
2. Rejection of URLs containing credentials (http://user:pass@host).
3. Rejection of cloud metadata IP addresses (169.254.169.254, metadata.google.internal).
4. Rejection of loopback addresses (127.0.0.1, localhost) when local endpoints are disallowed.
5. Rejection of private RFC 1918 subnets (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16).
6. Acceptance of valid public HTTP/HTTPS endpoints.
7. Controlled permission of localhost:11434 when allow_local=True.
"""

import pytest
from backend.app.core.ssrf import validate_provider_url, SSRFValidationError


def test_ssrf_rejects_non_http_schemes():
    forbidden_urls = [
        "file:///etc/passwd",
        "file:///C:/Windows/System32/drivers/etc/hosts",
        "gopher://127.0.0.1:70/",
        "ftp://mirror.example.com/payload.bin",
        "dict://127.0.0.1:11211/stat",
    ]
    for url in forbidden_urls:
        with pytest.raises(SSRFValidationError) as exc_info:
            validate_provider_url(url)
        assert "scheme" in str(exc_info.value).lower()


def test_ssrf_rejects_embedded_credentials():
    url_with_creds = "https://admin:secret123@example.com/api"
    with pytest.raises(SSRFValidationError) as exc_info:
        validate_provider_url(url_with_creds)
    assert "credential" in str(exc_info.value).lower()


def test_ssrf_blocks_cloud_metadata():
    metadata_targets = [
        "http://169.254.169.254/latest/meta-data/",
        "http://metadata.google.internal/computeMetadata/v1/",
        "http://169.254.169.254/metadata/v1.json",
    ]
    for target in metadata_targets:
        with pytest.raises(SSRFValidationError) as exc_info:
            validate_provider_url(target, allow_local=True)
        assert "cloud metadata" in str(exc_info.value).lower() or "blocked ip" in str(exc_info.value).lower()


def test_ssrf_blocks_private_subnets():
    private_ips = [
        "https://10.0.0.1:8080/internal",
        "https://192.168.1.1/router-config",
        "https://172.16.0.5/secrets",
        "https://100.64.0.1/carrier-nat",
    ]
    for target in private_ips:
        with pytest.raises(SSRFValidationError) as exc_info:
            validate_provider_url(target, allow_local=False)
        assert "blocked" in str(exc_info.value).lower() or "private" in str(exc_info.value).lower()


def test_ssrf_blocks_loopback_when_not_allowed():
    loopback_targets = [
        "http://127.0.0.1:11434/api/tags",
        "http://localhost:8000/internal",
    ]
    for target in loopback_targets:
        with pytest.raises(SSRFValidationError) as exc_info:
            validate_provider_url(target, allow_local=False)
        assert "loopback" in str(exc_info.value).lower() or "blocked ip" in str(exc_info.value).lower()


def test_ssrf_allows_localhost_when_allow_local_true():
    local_ollama = "http://localhost:11434"
    res = validate_provider_url(local_ollama, allow_local=True)
    assert res == "http://localhost:11434"


def test_ssrf_allows_valid_public_url():
    public_url = "https://api.openai.com/v1"
    res = validate_provider_url(public_url, allow_local=False)
    assert res == "https://api.openai.com/v1"
