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

## How to run backend (future)
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## How to run UI (future)
```bash
cd ui
npm install
npm run dev
```
