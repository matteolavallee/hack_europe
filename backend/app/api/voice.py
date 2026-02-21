"""
Voice API routes — STT via OpenAI Whisper and TTS via ElevenLabs.

Endpoints:
  POST /api/stt/transcribe  — multipart audio → { "text": "..." }
  POST /api/tts/speak       — JSON text       → raw MP3 bytes
"""

from __future__ import annotations

import io
import os
from typing import Optional

import httpx
from fastapi import APIRouter, File, HTTPException, Response, UploadFile
from pydantic import BaseModel

router = APIRouter(prefix="/api", tags=["voice"])

# ─── Configuration (resolved once at import time) ─────────────────────────────

_OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
_ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
_ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")  # ElevenLabs "Rachel"
_ELEVENLABS_MODEL_ID = os.getenv("ELEVENLABS_MODEL_ID", "eleven_turbo_v2")

_OPENAI_TIMEOUT = 30.0
_ELEVENLABS_TIMEOUT = 30.0
_MAX_AUDIO_BYTES = 25 * 1024 * 1024  # Whisper hard limit

# Content-types accepted from browsers (webm, wav, mp3, ogg, mp4/m4a, generic blob)
_SUPPORTED_CONTENT_TYPES = {
    "audio/webm",
    "audio/wav",
    "audio/wave",
    "audio/x-wav",
    "audio/mp3",
    "audio/mpeg",
    "audio/ogg",
    "audio/mp4",
    "audio/x-m4a",
    "video/webm",          # Firefox sometimes sends this for audio recordings
    "application/octet-stream",  # Generic binary — accept and let Whisper judge
}

# Map content-type → filename extension for Whisper (it uses the extension to detect format)
_EXT_MAP: dict[str, str] = {
    "audio/webm": "webm",
    "audio/wav": "wav",
    "audio/wave": "wav",
    "audio/x-wav": "wav",
    "audio/mp3": "mp3",
    "audio/mpeg": "mp3",
    "audio/ogg": "ogg",
    "audio/mp4": "mp4",
    "audio/x-m4a": "m4a",
    "video/webm": "webm",
    "application/octet-stream": "webm",  # Assume webm (most common MediaRecorder default)
}


# ─── Schemas ──────────────────────────────────────────────────────────────────

class TtsRequest(BaseModel):
    text: str
    voice_id: Optional[str] = None
    model_id: Optional[str] = None


# ─── STT endpoint ─────────────────────────────────────────────────────────────

@router.post("/stt/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)) -> dict:
    """Transcribe uploaded audio via OpenAI Whisper (whisper-1)."""
    if not _OPENAI_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="OPENAI_API_KEY is not configured on the server.",
        )

    content_type = (audio.content_type or "application/octet-stream").split(";")[0].strip().lower()

    if content_type not in _SUPPORTED_CONTENT_TYPES:
        raise HTTPException(
            status_code=415,
            detail=(
                f"Unsupported audio format: '{content_type}'. "
                "Accepted formats: webm, wav, mp3, ogg, mp4/m4a."
            ),
        )

    audio_bytes = await audio.read()

    if len(audio_bytes) == 0:
        raise HTTPException(status_code=422, detail="Uploaded audio file is empty.")
    if len(audio_bytes) > _MAX_AUDIO_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Audio file exceeds the 25 MB Whisper limit ({len(audio_bytes)} bytes received).",
        )

    # Build a filename with a proper extension so Whisper infers the codec correctly
    ext = _EXT_MAP.get(content_type, "webm")
    filename = audio.filename or f"audio.{ext}"
    if "." not in filename:
        filename = f"{filename}.{ext}"

    try:
        async with httpx.AsyncClient(timeout=_OPENAI_TIMEOUT) as client:
            resp = await client.post(
                "https://api.openai.com/v1/audio/transcriptions",
                headers={"Authorization": f"Bearer {_OPENAI_API_KEY}"},
                files={"file": (filename, io.BytesIO(audio_bytes), content_type)},
                data={"model": "whisper-1"},
            )
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Whisper API timed out after 30 s.")
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Network error reaching Whisper: {exc}")

    if resp.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"Whisper API returned {resp.status_code}: {resp.text}",
        )

    return {"text": resp.json().get("text", "")}


# ─── TTS endpoint ─────────────────────────────────────────────────────────────

@router.post("/tts/speak")
async def text_to_speech(req: TtsRequest) -> Response:
    """Synthesize speech via ElevenLabs and return raw MP3 bytes."""
    if not _ELEVENLABS_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="ELEVENLABS_API_KEY is not configured on the server.",
        )

    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=422, detail="'text' must not be empty.")
    if len(text) > 5000:
        raise HTTPException(
            status_code=422,
            detail=f"'text' exceeds 5 000-character ElevenLabs limit ({len(text)} chars).",
        )

    voice_id = (req.voice_id or _ELEVENLABS_VOICE_ID).strip()
    model_id = (req.model_id or _ELEVENLABS_MODEL_ID).strip()

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"

    try:
        async with httpx.AsyncClient(timeout=_ELEVENLABS_TIMEOUT) as client:
            resp = await client.post(
                url,
                headers={
                    "xi-api-key": _ELEVENLABS_API_KEY,
                    "Content-Type": "application/json",
                    "Accept": "audio/mpeg",
                },
                json={
                    "text": text,
                    "model_id": model_id,
                    "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
                },
            )
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="ElevenLabs API timed out after 30 s.")
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Network error reaching ElevenLabs: {exc}")

    if resp.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"ElevenLabs API returned {resp.status_code}: {resp.text}",
        )

    return Response(content=resp.content, media_type="audio/mpeg")
