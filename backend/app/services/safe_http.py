"""SSRF-safe outbound fetching for user-supplied URLs.

Every socket opened by urllib3 while ``guarded()`` is active resolves the host
itself, rejects any non-public address and connects to exactly the address it
checked, so DNS rebinding and redirects to internal hosts cannot slip through.
"""

from __future__ import annotations

import ipaddress
import socket
import threading
import urllib.parse
from contextlib import contextmanager
from typing import Iterator

import urllib3.util.connection as urllib3_connection

ALLOWED_SCHEMES = {"http", "https"}
ALLOWED_PORTS = {80, 443}
MAX_REDIRECTS = 3


class UnsafeURLError(ValueError):
    pass


def _is_public(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped:
        ip = ip.ipv4_mapped
    return ip.is_global and not ip.is_multicast


def resolve_public(host: str, port: int) -> str:
    """Resolve ``host`` and return one address, only if every address is public."""
    try:
        infos = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
    except (socket.gaierror, UnicodeError) as exc:
        raise UnsafeURLError("unresolvable host") from exc
    addresses = [info[4][0] for info in infos]
    if not addresses or not all(_is_public(ipaddress.ip_address(a.split("%")[0])) for a in addresses):
        raise UnsafeURLError("non-public address")
    return addresses[0]


def validate_url(url: str) -> str:
    """Check scheme, port and host of ``url``; return it normalised."""
    parsed = urllib.parse.urlparse(url.strip())
    if parsed.scheme not in ALLOWED_SCHEMES or not parsed.hostname:
        raise UnsafeURLError("unsupported scheme")
    if parsed.username or parsed.password:
        raise UnsafeURLError("credentials in url")
    try:
        port = parsed.port or (443 if parsed.scheme == "https" else 80)
    except ValueError as exc:
        raise UnsafeURLError("bad port") from exc
    if port not in ALLOWED_PORTS:
        raise UnsafeURLError("port not allowed")
    resolve_public(parsed.hostname, port)
    return urllib.parse.urlunparse(parsed)


_state = threading.local()
_original_create_connection = urllib3_connection.create_connection


def _guarded_create_connection(address, *args, **kwargs):
    if getattr(_state, "active", False):
        host, port = address
        if port not in ALLOWED_PORTS:
            raise UnsafeURLError("port not allowed")
        address = (resolve_public(host, port), port)
    return _original_create_connection(address, *args, **kwargs)


urllib3_connection.create_connection = _guarded_create_connection


@contextmanager
def guarded() -> Iterator[None]:
    """Enforce public-only connections for urllib3 (requests/cloudscraper) in this thread."""
    previous = getattr(_state, "active", False)
    _state.active = True
    try:
        yield
    finally:
        _state.active = previous


def get_following_redirects(session, url: str, *, timeout: float, **kwargs):
    """GET with manual redirects; each hop is re-validated and connected via the guard."""
    current = validate_url(url)
    with guarded():
        for _ in range(MAX_REDIRECTS + 1):
            response = session.get(current, timeout=timeout, allow_redirects=False, **kwargs)
            if response.status_code not in (301, 302, 303, 307, 308):
                return response
            location = response.headers.get("Location")
            response.close()
            if not location:
                raise UnsafeURLError("redirect without location")
            current = validate_url(urllib.parse.urljoin(current, location))
    raise UnsafeURLError("too many redirects")
