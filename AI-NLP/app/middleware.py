"""
Application middleware — request tracking, API versioning, API key authentication.
"""

from __future__ import annotations

import time
import uuid
import logging
from contextvars import ContextVar

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

logger = logging.getLogger(__name__)

# ── Context variable for request-scoped data ───────────────────────
request_id_ctx: ContextVar[str] = ContextVar("request_id", default="")

API_VERSION = "1.0.0"

# Paths exempt from API key check
_PUBLIC_PATHS = frozenset({
    "/", "/health", "/config", "/docs", "/redoc", "/openapi.json",
    "/interview-room", "/realtime-interview", "/demo",
})

_PUBLIC_PREFIXES = ("/static/", "/api/v1/interview/setup/",)


class ApiKeyMiddleware(BaseHTTPMiddleware):
    """
    Validates X-Api-Key header on incoming requests.

    Skips validation for:
    - Public paths (health, docs, static)
    - WebSocket upgrade requests (auth handled in WS init)
    - When no API key is configured (dev mode)
    """

    def __init__(self, app, api_key: str = ""):
        super().__init__(app)
        self.api_key = api_key

    async def dispatch(self, request: Request, call_next) -> Response:
        # Skip if no key configured (dev mode)
        if not self.api_key:
            return await call_next(request)

        # Skip WebSocket upgrades (auth handled in WS handler)
        if request.headers.get("upgrade", "").lower() == "websocket":
            return await call_next(request)

        # Skip public paths
        path = request.url.path.rstrip("/") or "/"
        if path in _PUBLIC_PATHS or any(path.startswith(p) for p in _PUBLIC_PREFIXES):
            return await call_next(request)

        # Validate API key
        provided_key = request.headers.get("X-Api-Key", "")
        if provided_key != self.api_key:
            logger.warning(
                "api_key_rejected | path=%s method=%s ip=%s",
                path, request.method, request.client.host if request.client else "unknown",
            )
            return JSONResponse(
                status_code=401,
                content={"detail": "Invalid or missing API key"},
            )

        return await call_next(request)


class RequestTrackingMiddleware(BaseHTTPMiddleware):
    """
    Injects X-Request-ID and X-API-Version headers into every response.

    If the incoming request has an X-Request-ID header, it is propagated.
    Otherwise a new UUID is generated.

    Also tracks request latency.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        # Extract or generate request ID
        req_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex
        request_id_ctx.set(req_id)

        start_time = time.perf_counter()

        response = await call_next(request)

        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 1)

        # Attach standard headers
        response.headers["X-Request-ID"] = req_id
        response.headers["X-API-Version"] = API_VERSION
        response.headers["X-Response-Time-Ms"] = str(elapsed_ms)

        logger.info(
            "request_completed | method=%s path=%s status=%d latency_ms=%.1f request_id=%s",
            request.method,
            request.url.path,
            response.status_code,
            elapsed_ms,
            req_id,
        )

        return response
