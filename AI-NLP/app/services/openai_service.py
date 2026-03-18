"""
OpenAI GPT wrapper service.

Encapsulates all GPT-5-mini / GPT-4o-mini interactions behind a clean
interface.  Responses are always parsed JSON.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any, Dict, Optional

from app.config import get_settings

logger = logging.getLogger(__name__)


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
    ) -> Dict[str, Any]:
        """
        Send a system + user prompt and parse the response as JSON.

        Retries on JSON parse failure up to *retry_count* times.
        """
        from langchain_core.messages import HumanMessage, SystemMessage

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt),
        ]

        last_error: Optional[Exception] = None
        for attempt in range(retry_count + 1):
            try:
                response = await self._model.ainvoke(messages)
                text = _coerce_response_text(response.content)
                return _extract_json_payload(text)
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
