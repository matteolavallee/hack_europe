# Voice STT + TTS Integration

## What was implemented

| Layer | What | Where |
|---|---|---|
| Backend | `POST /api/stt/transcribe` — multipart audio → Whisper transcript | `backend/app/api/voice.py` |
| Backend | `POST /api/tts/speak` — JSON text → ElevenLabs MP3 stream | `backend/app/api/voice.py` |
| Backend | FastAPI app bootstrap + CORS middleware + router registration | `backend/app/main.py` |
| Backend | Python dependency manifest | `backend/requirements.txt` |
| Frontend | Test page with record → STT → TTS flow | `frontend/app/device-voice-test/page.tsx` |
| Docs | Backend env template | `backend/.env.example` |
| Docs | Frontend env template | `frontend/.env.local.example` |
| Docs | This file | `docs/VOICE_STT_TTS.md` |

### STT — `POST /api/stt/transcribe`

- Accepts `multipart/form-data` with field name `audio`.
- Supported browser formats: **webm** (default MediaRecorder), **wav**, **mp3**, **ogg**, **mp4/m4a**.
- Forwards the audio to **OpenAI Whisper** (`whisper-1` model) via `httpx.AsyncClient`.
- Returns `{ "text": "<transcript>" }`.
- Limits: 25 MB (Whisper hard cap), 30 s timeout.

### TTS — `POST /api/tts/speak`

- Accepts `Content-Type: application/json` body: `{ "text": "...", "voice_id"?: "...", "model_id"?: "..." }`.
- Calls **ElevenLabs** text-to-speech API.
- Returns raw **MP3 bytes** (`audio/mpeg`).
- `voice_id` and `model_id` fall back to `ELEVENLABS_VOICE_ID` / `ELEVENLABS_MODEL_ID` env vars.
- Limits: 5 000 chars, 30 s timeout.

### Frontend test page

Route: **`/device-voice-test`**

Features:
1. **Record** — `MediaRecorder` → `audio/webm` blob.
2. **Transcribe** — POST blob to `/api/stt/transcribe`, display result.
3. **Speak** — POST text to `/api/tts/speak`, decode MP3 via `AudioContext`, play it.
4. **Echo avoidance** — `isSpeakingRef` flag blocks new recordings while TTS is active; 300 ms cooldown after playback ends.
5. **Status UI** — `idle / recording / transcribing / speaking / error` states with coloured circles and animated bars.
6. **Activity log** — timestamped event trail shown on-screen.

---

## Required environment variables

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `OPENAI_API_KEY` | ✅ | — | OpenAI key with Audio API access |
| `ELEVENLABS_API_KEY` | ✅ | — | ElevenLabs API key |
| `ELEVENLABS_VOICE_ID` | optional | `21m00Tcm4TlvDq8ikWAM` | ElevenLabs voice (default: Rachel) |
| `ELEVENLABS_MODEL_ID` | optional | `eleven_turbo_v2` | ElevenLabs model |
| `ALLOWED_ORIGINS` | optional | `http://localhost:3000` | Comma-separated CORS origins |

### Frontend (`frontend/.env.local`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_BACKEND_URL` | optional | `http://localhost:8000` | FastAPI base URL (no trailing slash) |

---

## How to run locally

### 1 — Backend

```bash
cd backend

# Copy and fill env
cp .env.example .env
# Edit .env and add OPENAI_API_KEY + ELEVENLABS_API_KEY

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn app.main:app --reload --port 8000
```

API docs (Swagger UI) will be at: http://localhost:8000/docs

### 2 — Frontend

```bash
cd frontend

# Copy env (already has NEXT_PUBLIC_BACKEND_URL=http://localhost:8000)
cp .env.local.example .env.local

# Install dependencies (if not done yet)
npm install

# Start dev server
npm run dev
```

---

## How to test the DeviceVoiceTest page end-to-end

1. Ensure both backend and frontend are running (see above).
2. Open **http://localhost:3000/device-voice-test** in a browser.
3. **STT test:**
   - Click **▶ Start Recording** — browser will ask for mic permission (grant it).
   - Speak a short phrase (e.g. "Hello, this is a test").
   - Click **■ Stop** — the page posts the audio to Whisper and displays the transcript.
4. **TTS test:**
   - Edit the text field (default: "Got it.").
   - Click **🔊 Speak Text** — the page calls ElevenLabs and plays the MP3 via `AudioContext`.
5. **Combined flow:**
   - Record → stop → wait for transcript → speak a confirmation.
   - Verify the recording button is disabled while TTS is playing (echo avoidance).

### Quick API smoke tests (curl)

```bash
# STT — replace recording.webm with a real file
curl -X POST http://localhost:8000/api/stt/transcribe \
  -F "audio=@recording.webm;type=audio/webm"

# TTS — saves mp3 to /tmp/out.mp3
curl -X POST http://localhost:8000/api/tts/speak \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello world"}' \
  --output /tmp/out.mp3
```

---

## Troubleshooting

### CORS errors in browser

- Symptom: `Access-Control-Allow-Origin` missing / blocked.
- Fix: Set `ALLOWED_ORIGINS=http://localhost:3000` (or your actual frontend URL) in `backend/.env` and restart.

### `OPENAI_API_KEY is not configured` (HTTP 500)

- The backend started without the env variable set.
- Fix: add `OPENAI_API_KEY=sk-…` to `backend/.env` and restart uvicorn.

### Audio format errors from Whisper (HTTP 415 / 502)

- Some mobile browsers send `video/webm` or `application/octet-stream` as content-type.
- The backend normalises these — if issues persist, record in WAV format by passing `{ mimeType: "audio/wav" }` to `MediaRecorder` (where supported).
- Whisper also rejects silent/empty clips — ensure the mic actually captured audio.

### Mic permission denied

- Browser shows a permission dialog on first use. If you dismissed it, reset via the address bar lock icon → Site Settings → Microphone → Allow.
- `localhost` is always treated as a secure origin; production deployments require HTTPS.

### TTS plays but sounds wrong / wrong voice

- Check `ELEVENLABS_VOICE_ID` — find IDs at https://elevenlabs.io/voice-library.
- Use `ELEVENLABS_MODEL_ID=eleven_multilingual_v2` for languages other than English.

### `AudioContext` blocked (autoplay policy)

- Chrome may block `AudioContext` before a user gesture. The TTS button requires a click, which counts as a gesture — this should not occur in normal use.
- If it does, call `audioCtx.resume()` after creation.
