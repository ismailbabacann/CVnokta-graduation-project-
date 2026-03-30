"""
OpenAI GPT wrapper service.

Encapsulates all GPT-4o-mini interactions behind a clean
interface.  Responses are always parsed JSON.

Includes versioned LRU cache (Phase H2) with TTL support.
"""

from __future__ import annotations

import hashlib
import json
import logging
import re
import time
from collections import OrderedDict
from typing import Any, Dict, Optional, Tuple

from app.config import get_settings

logger = logging.getLogger(__name__)


# ── Versioned LLM Response Cache ───────────────────────────────────

class LLMCache:
    """
    In-process LRU cache for LLM JSON responses.

    Cache key includes: hash(system_prompt + user_prompt) + model_id + prompt_version.
    Entries expire after TTL seconds.
    """

    def __init__(self, max_size: int = 128, ttl_seconds: int = 3600) -> None:
        self._max_size = max_size
        self._ttl = ttl_seconds
        self._store: OrderedDict[str, Tuple[Dict[str, Any], float]] = OrderedDict()
        self._hits = 0
        self._misses = 0

    @staticmethod
    def _make_key(system_prompt: str, user_prompt: str) -> str:
        settings = get_settings()
        content = f"{settings.openai_model}:{system_prompt}:{user_prompt}"
        return hashlib.sha256(content.encode()).hexdigest()

    def get(self, system_prompt: str, user_prompt: str) -> Optional[Dict[str, Any]]:
        key = self._make_key(system_prompt, user_prompt)
        entry = self._store.get(key)
        if entry is None:
            self._misses += 1
            return None
        data, ts = entry
        if time.monotonic() - ts > self._ttl:
            del self._store[key]
            self._misses += 1
            return None
        self._store.move_to_end(key)
        self._hits += 1
        return data

    def put(self, system_prompt: str, user_prompt: str, data: Dict[str, Any]) -> None:
        key = self._make_key(system_prompt, user_prompt)
        self._store[key] = (data, time.monotonic())
        self._store.move_to_end(key)
        while len(self._store) > self._max_size:
            self._store.popitem(last=False)

    def clear(self) -> None:
        self._store.clear()
        self._hits = 0
        self._misses = 0

    @property
    def stats(self) -> Dict[str, Any]:
        return {
            "size": len(self._store),
            "max_size": self._max_size,
            "ttl_seconds": self._ttl,
            "hits": self._hits,
            "misses": self._misses,
            "hit_rate": round(self._hits / max(1, self._hits + self._misses), 3),
        }


# Global cache instance
_llm_cache: Optional[LLMCache] = None


def get_llm_cache() -> LLMCache:
    """Lazy singleton for the LLM response cache."""
    global _llm_cache
    if _llm_cache is None:
        settings = get_settings()
        _llm_cache = LLMCache(
            max_size=settings.llm_cache_max_size,
            ttl_seconds=settings.llm_cache_ttl_seconds,
        )
    return _llm_cache


def _coerce_response_text(content: Any) -> str:
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict):
                text_part = item.get("text")
                if isinstance(text_part, str):
                    parts.append(text_part)
        return "\n".join(parts).strip()
    return str(content).strip()


def _extract_json_payload(text: str) -> Dict[str, Any]:
    decoder = json.JSONDecoder()

    # 1) Direct parse first.
    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass

    # 2) Parse fenced json blocks.
    for block in re.findall(r"```(?:json)?\s*(.*?)```", text, flags=re.IGNORECASE | re.DOTALL):
        block = block.strip()
        if not block:
            continue
        try:
            parsed = json.loads(block)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            continue

    # 3) Parse first decodable object from noisy text.
    for idx, ch in enumerate(text):
        if ch not in "[{":
            continue
        try:
            parsed, _ = decoder.raw_decode(text[idx:])
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            continue

    raise json.JSONDecodeError("No valid JSON object found in model output", text, 0)


class OpenAIService:
    """Thin wrapper around LangChain's ChatOpenAI model."""

    def __init__(self) -> None:
        from langchain_openai import ChatOpenAI

        settings = get_settings()
        self._model = ChatOpenAI(
            model=settings.openai_model,
            temperature=settings.openai_temperature,
            max_tokens=settings.openai_max_tokens,
            api_key=settings.openai_api_key,
        )

    async def generate_json(
        self,
        system_prompt: str,
        user_prompt: str,
        *,
        retry_count: int = 2,
        use_cache: bool = True,
    ) -> Dict[str, Any]:
        """
        Send a system + user prompt and parse the response as JSON.

        Retries on JSON parse failure up to *retry_count* times.
        Results are cached (keyed by model + prompts) when use_cache=True.
        """
        from langchain_core.messages import HumanMessage, SystemMessage

        settings = get_settings()

        # Check cache first
        if use_cache and settings.llm_cache_enabled:
            cache = get_llm_cache()
            cached = cache.get(system_prompt, user_prompt)
            if cached is not None:
                logger.info("LLM cache hit")
                return cached

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt),
        ]

        last_error: Optional[Exception] = None
        for attempt in range(retry_count + 1):
            try:
                response = await self._model.ainvoke(messages)
                text = _coerce_response_text(response.content)
                result = _extract_json_payload(text)

                # Store in cache
                if use_cache and settings.llm_cache_enabled:
                    cache = get_llm_cache()
                    cache.put(system_prompt, user_prompt, result)

                return result
            except json.JSONDecodeError as exc:
                last_error = exc
                logger.warning(
                    "JSON parse failed (attempt %d/%d): %s",
                    attempt + 1,
                    retry_count + 1,
                    exc,
                )
            except Exception as exc:
                last_error = exc
                logger.error("OpenAI call failed: %s", exc)
                raise

        raise ValueError(
            f"Failed to parse JSON from GPT after {retry_count + 1} attempts: {last_error}"
        )

    async def generate_text(
        self,
        system_prompt: str,
        user_prompt: str,
    ) -> str:
        """Plain text generation (for interview questions, etc.)."""
        from langchain_core.messages import HumanMessage, SystemMessage

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt),
        ]
        response = await self._model.ainvoke(messages)
        return response.content.strip()
