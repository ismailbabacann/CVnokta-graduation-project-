"""
Application middleware — request tracking, API versioning, error standardization.
"""

from __future__ import annotations

import time
import uuid
import logging
from contextvars import ContextVar

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger(__name__)

# ── Context variable for request-scoped data ───────────────────────
request_id_ctx: ContextVar[str] = ContextVar("request_id", default="")

API_VERSION = "1.0.0"


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
