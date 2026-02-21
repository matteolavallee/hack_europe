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

## How to run backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## How to run UI
```bash
cd frontend
npm install
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

This project uses Next.js and [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font).

## Learn More

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.
