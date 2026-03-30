"""
Structured logging and observability utilities.

Provides:
- Structured JSON log formatter
- Per-stage latency tracking context manager
- Request-scoped logging context
- Latency metrics collector for benchmarking
"""

from __future__ import annotations

import logging
import time
from collections import defaultdict
from contextlib import contextmanager
from typing import Any, Dict, List, Optional

from app.middleware import request_id_ctx

logger = logging.getLogger(__name__)


# ── In-process metrics collector (H1) ──────────────────────────────

class LatencyCollector:
    """Collect per-stage latency samples for benchmarking."""

    def __init__(self) -> None:
        self._samples: Dict[str, List[float]] = defaultdict(list)
        self._max_samples = 1000

    def record(self, stage: str, latency_ms: float) -> None:
        buf = self._samples[stage]
        if len(buf) >= self._max_samples:
            buf.pop(0)
        buf.append(latency_ms)

    def get_stats(self) -> Dict[str, Dict[str, Any]]:
        stats: Dict[str, Dict[str, Any]] = {}
        for stage, samples in self._samples.items():
            if not samples:
                continue
            sorted_s = sorted(samples)
            n = len(sorted_s)
            stats[stage] = {
                "count": n,
                "avg_ms": round(sum(sorted_s) / n, 1),
                "min_ms": round(sorted_s[0], 1),
                "max_ms": round(sorted_s[-1], 1),
                "p50_ms": round(sorted_s[n // 2], 1),
                "p95_ms": round(sorted_s[int(n * 0.95)], 1) if n >= 20 else None,
                "p99_ms": round(sorted_s[int(n * 0.99)], 1) if n >= 100 else None,
            }
        return stats

    def clear(self) -> None:
        self._samples.clear()


_collector = LatencyCollector()


def get_latency_collector() -> LatencyCollector:
    """Global latency collector singleton."""
    return _collector


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
        _collector.record(stage, elapsed)
        req_id = request_id_ctx.get("")
        logger.error(
            "stage_failed | stage=%s latency_ms=%.1f error=%s request_id=%s",
            stage, elapsed, exc, req_id,
        )
        raise
    else:
        elapsed = round((time.perf_counter() - start) * 1000, 1)
        result["latency_ms"] = elapsed
        _collector.record(stage, elapsed)
        req_id = request_id_ctx.get("")
        parts = [f"stage={stage}", f"latency_ms={elapsed:.1f}"]
        if extra:
            for k, v in extra.items():
                parts.append(f"{k}={v}")
        parts.append(f"request_id={req_id}")
        logger.info("stage_completed | %s", " ".join(parts))
