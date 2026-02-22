# CareLoop (HackEurope) - Pipeline & Installation Guide

This document summarizes the entire architecture, data flow, and installation steps for the CareLoop Alzheimer Assistant.

## 1. Project Organization

The repository is divided into two main parts:
- **`backend/`** (FastAPI): The brain of the application. It handles the AI logic via Google Gemini, scheduling with APScheduler, TTS using ElevenLabs, and real-time interactions with Telegram & WhatsApp.
- **`frontend/`** (Next.js): The user interface for both the caregiver (dashboard) and the care receiver (device).

Both rely on a central `.env` file located at the **root** of the project.

### Architecture Data Flow (Pseudo-DB)
To keep the application highly portable and easy to run/deploy without setting up PostgreSQL, we use local JSON files as a "pseudo-database" (managed in `backend/app/services/json_store_service.py` with multi-threading locks). Data resides in `backend/app/data/`.

## 2. The AI Agent Loop (Gemini)

When a patient speaks to the device (or types using the test interface), the flow is:
1. **Speech-to-Text**: The frontend captures audio, sends a `.webm` blob to `/api/stt/transcribe` (or sends text directly to `/api/chat/message`).
2. **Context Injection**: In `agent_service.py`, the backend fetches the `patient_context.json`, pending reminders, events, and current time to build an *Environment Context*. This is injected invisibly before the patient's message.
3. **Tool Execution (Reasoning)**: Gemini ponders the user input + context. If it decides it needs to execute an action (e.g., `schedule_reminder`, `send_whatsapp_message`), it returns a function call. The backend executes the python function mapped in `app/tools/` and gives the results back to Gemini.
4. **Final Response**: Once Gemini has all info, it generates a final textual response.
5. **Text-to-Speech**: The text response is sent to ElevenLabs (`tts_service.py`).
6. **Delivery**: The MP3 is saved statically and returned to the frontend to be played.

To view the **AI Reasoning** live, watch the backend terminal! It features colored logs showing exactly when Gemini thinks, which tool it calls, and the result.

## 3. Installation & Setup

### Requirements
- Node.js (v18+)
- Python (3.10+)

### Step 1: Environment Variables
Create a file named `.env` at the **very root** of the repository (alongside `README.md`) using `.env.example` as a template. You need at least:
- `GEMINI_API_KEY`
- `ELEVENLABS_API_KEY`

### Step 2: Backend (FastAPI)
Open a terminal at the root:
```bash
cd backend
python -m venv .venv

# On Windows:
.\.venv\Scripts\activate
# On Mac/Linux:
source .venv/bin/activate

pip install -r requirements.txt
python -m uvicorn app.main:app --port 8000 --reload
```
*The backend is now running at http://localhost:8000.*

### Step 3: Frontend (Next.js)
Open another terminal at the root:
```bash
cd frontend
npm install
npm run dev
```
*The frontend is now running at http://localhost:3000.*

## 4. Testing the Application

### The Device Interface (Patient)
1. Navigate to: [http://localhost:3000/device](http://localhost:3000/device)
2. You will see the main orb. You can either tap it to record your voice, OR use the **Text Input Block** below it to type commands (e.g., *"I have a doctor appointment tomorrow at 10"*).
3. Look at your backend terminal to see the `[AGENT REASONING]` in action!

### The Dashboard (Caregiver)
1. Navigate to: [http://localhost:3000/dashboard](http://localhost:3000/dashboard)
2. This interface allows the family member to view scheduled tasks, send direct audio messages to the device, and monitor logs.

### WhatsApp / Telegram Integrations
- **WhatsApp**: Requires a WapiCloud account (`WAPICLOUD_URL` and `WAPICLOUD_TOKEN`). The agent can proactively message the caregiver if the patient asks for it.
- **Telegram Webhook**: You can map `https://<your-ngrok-url>/api/telegram/webhook` to a Telegram Bot using BotFather to let caregivers chat directly with the system.
