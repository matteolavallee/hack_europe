import os
import io
import httpx
from fastapi import HTTPException

_ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
_ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")
_ELEVENLABS_MODEL_ID = os.getenv("ELEVENLABS_MODEL_ID", "eleven_turbo_v2")
_ELEVENLABS_TIMEOUT = 30.0

async def generate_tts_audio(text: str) -> bytes:
    """
    Synthesize speech via ElevenLabs and return raw MP3 bytes.
    Useful for backend-internal generation (e.g. agent response).
    """
    if not _ELEVENLABS_API_KEY:
        raise ValueError("ELEVENLABS_API_KEY is not configured on the server.")

    text = text.strip()
    if not text:
        raise ValueError("'text' must not be empty.")
    if len(text) > 5000:
        raise ValueError(f"'text' exceeds 5000-character ElevenLabs limit ({len(text)} chars).")

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{_ELEVENLABS_VOICE_ID}"

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
                    "model_id": _ELEVENLABS_MODEL_ID,
                    "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
                },
            )
    except httpx.TimeoutException:
        raise RuntimeError("ElevenLabs API timed out.")
    except httpx.RequestError as exc:
        raise RuntimeError(f"Network error reaching ElevenLabs: {exc}")

    if resp.status_code != 200:
        raise RuntimeError(f"ElevenLabs API error {resp.status_code}: {resp.text}")

    return resp.content
