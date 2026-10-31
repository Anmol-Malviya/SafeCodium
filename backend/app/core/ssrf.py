"""Safe Vibe AI — Server-Side Request Forgery (SSRF) Defense Engine."""

import ipaddress
import socket
import urllib.parse
from typing import List, Optional
from fastapi import HTTPException, status
from backend.app.core.config import settings
from backend.app.core.logging import logger

# Blocked subnets
BLOCKED_NETWORKS = [
    ipaddress.ip_network("0.0.0.0/8"),          # "This host on this network"
    ipaddress.ip_network("10.0.0.0/8"),         # Private RFC1918
    ipaddress.ip_network("100.64.0.0/10"),      # Shared Address Space (CGNAT)
    ipaddress.ip_network("127.0.0.0/8"),        # Loopback
    ipaddress.ip_network("169.254.0.0/16"),     # Link-Local / Cloud Metadata (AWS, GCP, Azure)
    ipaddress.ip_network("172.16.0.0/12"),      # Private RFC1918
    ipaddress.ip_network("192.0.0.0/24"),       # IETF Protocol Assignments
    ipaddress.ip_network("192.0.2.0/24"),       # Documentation (TEST-NET-1)
    ipaddress.ip_network("192.168.0.0/16"),     # Private RFC1918
    ipaddress.ip_network("198.18.0.0/15"),      # Network Interconnect Device Benchmark Testing
    ipaddress.ip_network("198.51.100.0/24"),    # Documentation (TEST-NET-2)
    ipaddress.ip_network("203.0.113.0/24"),     # Documentation (TEST-NET-3)
    ipaddress.ip_network("224.0.0.0/4"),        # Multicast
    ipaddress.ip_network("240.0.0.0/4"),        # Reserved for Future Use
    ipaddress.ip_network("255.255.255.255/32"), # Broadcast
    # IPv6 blocked ranges
    ipaddress.ip_network("::1/128"),            # IPv6 Loopback
    ipaddress.ip_network("::/128"),             # Unspecified
    ipaddress.ip_network("fc00::/7"),           # Unique Local Address (ULA)
    ipaddress.ip_network("fe80::/10"),          # Link-Local Unicast
]

CLOUD_METADATA_HOSTS = {
    "169.254.169.254",
    "metadata.google.internal",
    "instance-data",
    "metadata.azure.com",
}


class SSRFValidationError(ValueError):
    """Raised when an outbound URL violates SSRF safety constraints."""
    pass


def validate_provider_url(url: str, allow_local: Optional[bool] = None) -> str:
    """
    Validates that a provider endpoint URL is safe from SSRF attacks:
    1. Scheme check (HTTPS required for remote; HTTP allowed only for localhost if allow_local=True).
    2. Embedded credentials rejection (user:pass@host).
    3. Hostname and Cloud metadata blocking.
    4. DNS resolution to check against private/loopback/cloud-metadata IP ranges.
    """
    if not url or not isinstance(url, str):
        raise SSRFValidationError("Provider URL must be a non-empty string.")

    url = url.strip()
    parsed = urllib.parse.urlparse(url)

    if not parsed.scheme or not parsed.netloc:
        raise SSRFValidationError("Malformed URL: missing scheme or network location.")

    scheme = parsed.scheme.lower()
    if scheme not in ("http", "https"):
        raise SSRFValidationError(f"Invalid URL scheme '{scheme}'. Only HTTP and HTTPS are permitted.")

    if parsed.username or parsed.password:
        raise SSRFValidationError("Embedded credentials in provider URLs are prohibited.")

    hostname = parsed.hostname
    if not hostname:
        raise SSRFValidationError("Invalid URL: missing hostname.")

    hostname_lower = hostname.lower()

    if hostname_lower in CLOUD_METADATA_HOSTS:
        raise SSRFValidationError("Access to cloud metadata service is strictly blocked.")

    # Determine local mode allowance
    is_local_allowed = allow_local if allow_local is not None else settings.ALLOW_LOCAL_AI_ENDPOINTS
    is_loopback_name = hostname_lower in ("localhost", "127.0.0.1", "::1", "0.0.0.0")

    if is_loopback_name:
        if is_local_allowed:
            # Safe local Ollama / dev endpoint
            return url
        else:
            raise SSRFValidationError("Local loopback provider endpoints are disabled.")

    # Remote providers MUST use HTTPS
    if scheme != "https":
        raise SSRFValidationError(f"Remote provider endpoints must use HTTPS. Received: '{scheme}'.")

    # DNS Resolution Check
    try:
        resolved_info = socket.getaddrinfo(hostname, parsed.port or 443, proto=socket.IPPROTO_TCP)
    except socket.gaierror as e:
        raise SSRFValidationError(f"Unable to resolve host '{hostname}': {str(e)}")

    if not resolved_info:
        raise SSRFValidationError(f"DNS lookup returned no addresses for '{hostname}'.")

    for item in resolved_info:
        sockaddr = item[4]
        ip_str = sockaddr[0]
        try:
            ip_obj = ipaddress.ip_address(ip_str)
        except ValueError:
            raise SSRFValidationError(f"Invalid IP address resolved: '{ip_str}'")

        # Check against blocked networks
        for net in BLOCKED_NETWORKS:
            if ip_obj in net:
                raise SSRFValidationError(
                    f"Destination IP '{ip_str}' belongs to blocked private/metadata network '{net}'."
                )

    return url

