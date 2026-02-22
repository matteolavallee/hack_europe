# Ancrage - Alzheimer Cognitive Assistant

## Elevator Pitch
**Ancrage** reduces the mental load on caregivers by providing a voice-first smart companion for the care receiver (patient), seamlessly connected to a comprehensive web dashboard. With Ancrage, caregivers can easily manage medication reminders, schedule family audio messages, and receive critical alerts, while patients maintain their autonomy through an accessible, conversation-driven interface.

## Problem Statement
Living with Alzheimer's or light-to-moderate loss of autonomy requires continuous support for daily tasks, communication, and emotional well-being. Family caregivers often carry a crushing mental load: remembering routines, checking if tasks were done, and reacting to emergencies. Ancrage is tailored to bridge this gap, ensuring peace of mind for caregivers and engaging, frustration-free support for patients.

## Features
- **Voice-First Care Receiver Kiosk**: A simple, accessible phone/tablet web app where patients interact through voice (Yes/No/Later/Help). No complex UI to learn.
- **Caregiver Web Dashboard**: A central hub to schedule text-to-speech reminders, push voice messages from family, and monitor an end-to-end timeline of the patient's day.
- **Smart Escalation**: If a patient misses a critical reminder or asks for help, Ancrage automatically sends an alert to the caregiver via Telegram.
- **Cognitive Micro-Exercises**: Non-medical, friendly check-ins to stimulate the patient's cognition and mood, logged securely for the caregiver.

## Architecture Overview
- **Backend (Python/FastAPI)**: Orchestrates the Gemini API for intelligence and conversation, ElevenLabs for high-quality TTS, and Telegram for automated emergency notifications.
- **Frontend (Next.js/React)**: A unified app serving both the Caregiver Dashboard and the Care Receiver Kiosk.
- **Data Storage**: Fast, local JSON file datastore optimized for the MVP scope without needing complex database infrastructure.

## Prerequisites
- Node.js (v18+)
- Python (3.11+)
- Desired API Keys (Google Gemini API, ElevenLabs, Telegram bot token).

## How to Run Locally

### 1. Start the Backend
```bash
# Navigate to the backend folder
cd backend

# Create and activate a virtual environment
python -m venv .venv
# On Windows
.venv\Scripts\activate
# On Mac/Linux
# source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI server
uvicorn app.main:app --reload
```
The backend API and Swagger UI will be available at [http://localhost:8000/docs](http://localhost:8000/docs).

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

> **Note**: To connect the frontend to the real backend data instead of mocks, ensure that `NEXT_PUBLIC_USE_MOCK=false` is set in your `frontend/.env.local` file.
