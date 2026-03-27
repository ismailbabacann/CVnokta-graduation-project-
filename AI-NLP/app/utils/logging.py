"""
Structured logging and observability utilities.

Provides:
- Structured JSON log formatter
- Per-stage latency tracking context manager
- Request-scoped logging context
"""

from __future__ import annotations

import logging
import time
from contextlib import contextmanager
from typing import Any, Optional

from app.middleware import request_id_ctx

logger = logging.getLogger(__name__)


@contextmanager
def track_latency(stage: str, extra: Optional[dict[str, Any]] = None):
    """
    Context manager that measures and logs execution time of a pipeline stage.

    Usage:
        with track_latency("pdf_extraction"):
            text = extract_text(pdf_path)

    Logs:
        stage_completed | stage=pdf_extraction latency_ms=123.4 request_id=abc123
    """
    start = time.perf_counter()
    result: dict[str, Any] = {"stage": stage}
    if extra:
        result.update(extra)
    try:
        yield result
    except Exception as exc:
        elapsed = round((time.perf_counter() - start) * 1000, 1)
        result["latency_ms"] = elapsed
        result["error"] = str(exc)
        req_id = request_id_ctx.get("")
        logger.error(
            "stage_failed | stage=%s latency_ms=%.1f error=%s request_id=%s",
            stage, elapsed, exc, req_id,
        )
        raise
    else:
        elapsed = round((time.perf_counter() - start) * 1000, 1)
        result["latency_ms"] = elapsed
        req_id = request_id_ctx.get("")
        parts = [f"stage={stage}", f"latency_ms={elapsed:.1f}"]
        if extra:
            for k, v in extra.items():
                parts.append(f"{k}={v}")
        parts.append(f"request_id={req_id}")
        logger.info("stage_completed | %s", " ".join(parts))
