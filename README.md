# Alzheimer Cognitive Assistant

## Problem Statement
Alzheimer's patients often require continuous support for daily tasks, communication, and emotional well-being. This project provides a voice-based assistant tailored for such patients, alongside a dedicated dashboard for caregivers to monitor interactions and set up reminders.

## MVP Scope
- Voice-based specialized conversational agent for the patient.
- Web dashboard for caregivers (reminders, logs, notifications).
- Local JSON file datastore (no complex database infrastructure).

## Architecture Overview
- **Backend**: FastAPI orchestrating Gemini API for intelligence, ElevenLabs for TTS, and Telegram for automated emergency/caregiver notifications.
- **UI**: Next.js-based frontend for caregivers.
- **Data**: Handled entirely through static JSON files acting as databases.

## Tech Stack
- FastAPI, Google Gemini API, ElevenLabs TTS, Telegram Bot API, Stripe
- Next.js (React)

## Prerequisites
- Node.js (v18+)
- Python (3.11+)
- API Keys for Google Gemini API and ElevenLabs (optional)

## How to run from scratch

### 1. Start the Backend
```bash
# Navigate to the backend folder
cd backend

# Create a virtual environment
python -m venv .venv

# Activate it (Windows)
.venv\\Scripts\\activate
# Activate it (Mac/Linux)
# source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt


# Start the FastAPI server

cd backend
python -m venv .venv
uvicorn app.main:app --reload
```
The backend will be available at [http://localhost:8000](http://localhost:8000)
API Documentation (Swagger UI) is available at [http://localhost:8000/docs](http://localhost:8000/docs)

### AI Agent Scripts

**1. Interactive Onboarding Loop**
To initialize a new patient profile conversationally:
```bash
# In the backend directory with .venv active
python scripts/init_data.py
```
This will launch a CLI chat with the AI Dr. to populate `patient_context.json`.

**2. Automated Testing**
To verify that the AI agent correctly orchestrates its tools (`schedule_reminder`, `write_log`):
```bash
# In the backend directory with .venv active
python -m pytest tests/test_agent_tools.py -v -s
```

### 2. Start the Frontend UI
```bash
# Open a new terminal and navigate to the frontend folder
cd frontend

# Install dependencies
npm install

# Start the Next.js frontend
npm run dev
```

The caregiver dashboard and patient kiosk UI will be available at [http://localhost:3000](http://localhost:3000).

> **Note**: To use the real backend data, ensure that `NEXT_PUBLIC_USE_MOCK=false` in your `frontend/.env` file.
