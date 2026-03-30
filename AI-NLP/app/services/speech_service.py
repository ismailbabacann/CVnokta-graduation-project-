"""
Speech services — TTS (Text-to-Speech) and STT (Speech-to-Text).

Uses OpenAI TTS API (tts-1) and Whisper API (whisper-1).
"""

from __future__ import annotations

import base64
import io
import logging
from typing import Optional

from app.config import get_settings

logger = logging.getLogger(__name__)


class SpeechService:
    """
    OpenAI-backed TTS and STT service.

    TTS: Converts question text → audio bytes (mp3).
    STT: Converts audio bytes → transcribed text.
    """

    def __init__(self) -> None:
        self._settings = get_settings()

    def _get_client(self):
        """Lazy-load OpenAI client."""
        from openai import OpenAI
        return OpenAI(api_key=self._settings.openai_api_key)

    async def text_to_speech(
        self,
        text: str,
        voice: Optional[str] = None,
    ) -> bytes:
        """
        Convert text to speech audio (mp3 bytes).

        Args:
            text: Text to synthesize.
            voice: TTS voice name (default from config: 'nova').

        Returns:
            Raw mp3 audio bytes.
        """
        if not self._settings.openai_api_key:
            raise RuntimeError("OpenAI API key required for TTS")

        voice = voice or self._settings.interview_tts_voice
        client = self._get_client()

        response = client.audio.speech.create(
            model=self._settings.interview_tts_model,
            voice=voice,
            input=text,
            response_format="mp3",
        )

        audio_bytes = response.content
        logger.info("TTS generated: %d bytes for %d chars", len(audio_bytes), len(text))
        return audio_bytes

    async def text_to_speech_base64(
        self,
        text: str,
        voice: Optional[str] = None,
    ) -> str:
        """Convert text to base64-encoded mp3 audio."""
        audio_bytes = await self.text_to_speech(text, voice)
        return base64.b64encode(audio_bytes).decode("utf-8")

    async def speech_to_text(
        self,
        audio_bytes: bytes,
        filename: str = "audio.webm",
    ) -> str:
        """
        Transcribe audio to text via Whisper.

        Args:
            audio_bytes: Raw audio bytes (webm, mp3, wav, etc.)
            filename: Filename hint for format detection.

        Returns:
            Transcribed text string.
        """
        if not self._settings.openai_api_key:
            raise RuntimeError("OpenAI API key required for STT")

        client = self._get_client()

        audio_file = io.BytesIO(audio_bytes)
        audio_file.name = filename

        transcript = client.audio.transcriptions.create(
            model=self._settings.interview_stt_model,
            file=audio_file,
        )

        text = transcript.text.strip()
        logger.info("STT transcribed: %d chars from %d bytes", len(text), len(audio_bytes))
        return text
