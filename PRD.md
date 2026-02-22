# PRD.md — CareLoop (Hack Europe)

> **Goal:** Ship a complete, hackathon-ready MVP (end-to-end) that we can iterate on after the first working version.
> **Core outcome:** Reduce caregiver mental load using a voice-first “device” for the care receiver + a caregiver web dashboard, with reminders/content delivery, confirmations, and Telegram escalation.

---

## 0) Quick Context

CareLoop is a voice-first companion designed for **people with light-to-moderate loss of autonomy** living at home (not hospitalized). It provides:
- **Smart reminders & scheduled routines** (meds, appointments, daily tasks)
- **Audio content delivery** (family audio messages and other audio content)
- **Basic cognitive micro-exercises** (simple, structured, non-medical)
- **Help & escalation flow** (notify caregiver via Telegram)
- A caregiver **web dashboard** to configure everything and monitor event history

We are building:
- **Caregiver Dashboard** (Next.js web app, desktop)
- **Care Receiver “Device”** (phone web app, kiosk-like)
- **Backend** (FastAPI) + DB + scheduler + Telegram bot
- **LLM**: Gemini API for agent logic (optional RAG)
- **TTS**: ElevenLabs
- **Messaging**: Telegram
- **Payments**: Stripe (nice-to-have for hackathon; can be mocked)

---

## 1) Problem & Target Users

### 1.1 Problem
Family caregivers carry a high mental load:
- remembering routines & appointments
- checking whether tasks were done
- ensuring engagement and stimulation
- reacting quickly to “something is wrong” situations

### 1.2 Personas
**Care Receiver (primary end user)**
- At home, light/moderate autonomy loss
- Can answer simple prompts: **Yes / No / Later**
- Needs low-friction, voice-first interaction

**Caregiver (primary buyer/operator)**
- One main caregiver profile for MVP
- Wants “only alerts when needed”
- Wants a single place to schedule reminders, push content, and see logs

---

## 2) MVP Scope (Final)

### 2.1 Categories & Subcategories

#### A) Caregiver Web App (Dashboard)

**A1. Agenda / Calendar**
- Create scheduled events:
  - Medication reminders
  - Appointments
  - Routine tasks
  - Scheduled audio deliveries (family audio message at a specific time)
- View upcoming items + past history
- Edit / delete events
- Trigger “instant push” audio via the same agenda mechanism
- (Optional) “Today view” of upcoming events

**A2. Sandbox / Activities & Content**
- Upload/record **audio content** (MVP: audio only; photo/video is future)
- Manage a simple “library” (title + type + tags + status)
- Send content to device now OR schedule it
- Flag content as “recommendable” (eligible for proactive suggestions)

**A3. Management & Monitoring**
- Create/manage care receiver profile:
  - Name, language=English, tone preferences
  - Caregiver Telegram chat_id / recipient
- Full **timeline / journal** of events:
  - reminder delivered / confirmed / postponed / missed / escalated
  - content queued / played / postponed
  - exercise completed (score/factual)
  - help request / contact request
- Demo buttons:
  - Trigger reminder now
  - Trigger content suggestion now
  - Trigger exercise suggestion now

---

#### B) Care Receiver “Device” (Phone Web App)

**B1. Agenda & Routines**
- Receive and play scheduled reminders (TTS)
- Receive and play scheduled/instant audio pushes (TTS + audio playback)
- Capture simple responses (STT + intent):
  - Yes / No / Later
- “Later” follow-up behavior (prompt + backend rescheduling)
- Non-response handling (device plays retries; backend escalates)

**B2. Sandbox / Activities**
- Cognitive micro-exercise (basic, proven-style format, non-medical)
- Play audio content from caregiver/library
- Proactive suggestions:
  - “Want to do an exercise?”
  - “Want to listen to a family message?”
- On-demand commands:
  - “Give me an exercise”
  - “Play my message”

**B3. Help & Escalation**
- On-demand: “I need help / Contact someone”
- Flow:
  - “Do you want to continue with me or notify your caregiver?”
- Confirm and notify caregiver via backend → Telegram
- Log all actions in timeline

> **Removed from MVP:** Social guided conversation (explicitly out)

---

#### C) Other (Backend, Automation, Security)

**C1. API & Database**
- Store:
  - profiles
  - calendar events
  - audio content metadata (URLs)
  - timeline events
- Provide endpoints for:
  - dashboard CRUD + timeline
  - device polling + responses + help requests

**C2. Scheduler & “Smart” Logic**
- Run time-based triggers for calendar events
- Retry policy for reminder confirmation
- Simple proactive suggestion rules (scheduled blocks + manual triggers)
- Escalation rules and Telegram notifications

**C3. Telegram**
- Push notifications:
  - missed confirmation
  - caregiver contact requested
- (Optional) `/status` for last event + next reminders

**C4. Logs & Privacy**
- Central event logging
- No raw audio storage by default
- Store only:
  - events
  - optional 1-sentence summaries
  - audio file URL (if user uploaded)

---

## 3) Key MVP Flows (End-to-End)

### 3.1 Reminder Flow (Core Loop)
1) Caregiver creates reminder (time + text + repeat optional)
2) Scheduler triggers reminder at T0
3) Device speaks reminder
4) Device listens for response:
   - **Yes** → event confirmed
   - **Later** → schedule follow-up
   - **No response** → retry and escalate
5) Escalation alert to Telegram if needed
6) Timeline updates in dashboard

**Default Retry/Escalation Policy**
- Attempt 1: T0
- Attempt 2: T0 + 2 min (if no response)
- Attempt 3: T0 + 7 min (if still no response)
- Escalate: T0 + 8 min (Telegram)

### 3.2 Audio Push Flow (Family Moments)
1) Caregiver uploads/records an audio message (dashboard)
2) Caregiver schedules it OR pushes instantly
3) Device proposes/plays:
   - “I have a message for you. Want to listen?”
4) If Yes → plays audio; log played
5) If Later → reschedule a short follow-up; log postponed

### 3.3 Cognitive Micro-Exercise
Trigger:
- proactive suggestion OR voice command “Give me an exercise”

Exercise format (MVP default, English):
- Q1: “What day is it today?”
- Q2: “Where are you right now?”
- Q3: “How do you feel: good, okay, or not good?”

Log only:
- completed yes/no
- score out of 3 (factual)
- no diagnosis, no interpretation

### 3.4 Help / Contact Flow
Trigger: “I need help” / “Contact someone”
- Device asks: “Do you want to continue with me or notify your caregiver?”
- If notify caregiver:
  - Device confirms
  - Backend sends Telegram message:
    - “[Name] requested contact/help”
  - Timeline logs event

---

## 4) Functional Requirements (Detailed)

### 4.1 Dashboard Requirements
- Minimal onboarding (single caregiver + single care receiver)
- Calendar UI (list + add/edit)
- Content library UI (audio upload, list, send/schedule)
- Timeline view with filters (optional)
- Demo triggers (must)

### 4.2 Device Requirements
- Phone-first web UI
- “Kiosk mode” feel:
  - big button / minimal visuals
  - clear states: Idle / Speaking / Listening / Processing
- TTS via ElevenLabs
- STT:
  - preferred: browser speech recognition (fast)
  - fallback: backend Whisper (if implemented)
- Intent parsing limited to:
  - Yes / No / Later
  - “exercise”
  - “play message”
  - “contact someone”
  - “help”
- Must poll backend for “next actions”

### 4.3 Backend Requirements
- FastAPI with:
  - REST endpoints
  - background scheduler
- Reliable event log writing (single source of truth)
- Timezone handling (use UTC internally)
- Basic auth (see Open Questions; default is simple passwordless token for hackathon)

---

## 5) Data Model (Proposed)

### 5.1 Tables / Collections

**caregivers**
- id (uuid)
- name
- telegram_chat_id
- created_at

**care_receivers**
- id (uuid)
- caregiver_id
- name
- language ("en")
- tone ("warm", etc.)
- created_at

**calendar_items**
- id (uuid)
- care_receiver_id
- type ("reminder" | "audio_push")
- title
- message_text (for reminders)
- scheduled_at (datetime)
- repeat_rule (nullable)
- status ("scheduled" | "sent" | "completed" | "cancelled")
- created_at

**audio_contents**
- id (uuid)
- care_receiver_id
- title
- url (storage URL)
- kind ("family_message" | "audiobook" | "other")
- recommendable (bool)
- created_at

**events** (timeline)
- id (uuid)
- care_receiver_id
- type (enum; see below)
- payload (json)
- created_at

### 5.2 Event Types (Canonical List)
- reminder_created
- reminder_delivered
- reminder_confirmed
- reminder_postponed
- reminder_no_response
- reminder_escalated
- audio_uploaded
- audio_queued
- audio_played
- audio_postponed
- exercise_started
- exercise_completed
- help_requested
- caregiver_notified

---

## 6) API Spec (Minimal)

### 6.1 Dashboard
- POST `/api/caregivers` (create caregiver)
- POST `/api/care-receivers` (create care receiver)
- GET  `/api/care-receivers/{id}`

**Calendar**
- POST `/api/calendar-items`
- GET  `/api/calendar-items?care_receiver_id=...`
- PATCH `/api/calendar-items/{id}`
- DELETE `/api/calendar-items/{id}`

**Audio Content**
- POST `/api/audio-contents` (metadata + upload URL or base64 if hacky)
- GET  `/api/audio-contents?care_receiver_id=...`
- POST `/api/audio-contents/{id}/send-now`
- POST `/api/audio-contents/{id}/schedule` (with datetime)

**Timeline**
- GET `/api/events?care_receiver_id=...&limit=...`

**Demo Triggers**
- POST `/api/demo/trigger-reminder-now`
- POST `/api/demo/trigger-suggestion` (exercise/message)

### 6.2 Device
- GET `/api/device/next-actions?care_receiver_id=...`
  - returns ordered list of actions:
    - speak reminder
    - propose play audio
    - propose exercise
- POST `/api/device/response`
  - payload:
    - action_id
    - response ("yes"|"no"|"later"|...)
- POST `/api/device/help-request`
  - payload:
    - type ("notify_caregiver")
    - message (optional)

---

## 7) Agent / LLM Design (MVP)

### 7.1 Purpose
Use Gemini to generate friendly voice text and handle simple dialog decisions.

### 7.2 Inputs
- Care receiver profile (name, tone)
- Current action context (reminder/audio/exercise/help)
- Optional “context store” (JSON) for preferences and family details

### 7.3 Outputs
- Text to speak (TTS)
- Suggested next step (ask yes/no/later, confirm, escalate)

### 7.4 System Prompt Guidelines (Core)
- Be warm, reassuring, concise
- Ask only simple questions
- Never provide medical diagnosis or advice
- Always offer “notify caregiver” as an option in uncertain situations
- Keep replies short (1–2 sentences)

---

## 8) RAG / Context Storage (MVP Minimal)

We store context as JSON (server-side):
- profile.json (name, preferences, language)
- family.json (caregiver name, contact)
- health.json (MVP: optional placeholder; no real sensor data)
- conversation.json (optional summary only)

Tools (internal):
- read_json(file)
- write_json(file, patch)
- log_event(type, payload)

---

## 9) Non-Goals (Hackathon)
- Real pillbox hardware integration
- Real wearable/sensor data
- Photo/video display
- Multi-caregiver roles and permissions
- Medical claims, diagnosis, or treatment advice
- Fully autonomous conversation companion

---

## 10) Tech Stack & Deployment

### 10.1 Backend
- FastAPI
- DB: SQLite (fast) or Postgres (if deployed)
- Scheduler: APScheduler or Celery beat (choose simplest)
- Storage: local files or S3-compatible bucket (hackathon pragmatic)

### 10.2 Frontend
- Next.js for dashboard (desktop-first)
- Phone web app for device (responsive, kiosk-style)

### 10.3 Integrations
- Gemini API (LLM)
- ElevenLabs (TTS)
- Telegram Bot API (alerts)
- Stripe (optional: simple checkout/mock pricing)

---

## 11) Security & Privacy (MVP Safe Mode)
- No raw audio stored by default
- Store only:
  - audio file URL (if uploaded by caregiver)
  - event logs
  - optional 1-sentence summaries
- Explicit user consent assumption for hackathon demo
- Avoid sensitive medical claims; “health data” is future scope

---

## 12) Success Metrics (Hackathon)
- End-to-end flow works reliably:
  - schedule reminder → device speaks → no response → Telegram alert → dashboard timeline updates
- At least one audio message delivered and logged
- At least one cognitive exercise completed and logged
- Clear demo narrative: “reduces caregiver mental load”

---

## 13) Team Task Assignment (Current)
- **Mattéo:** Backend setup (FastAPI, DB, scheduler, event logging, Telegram integration, Gemini/TTS integration)
- **Eliott + Malo:** Next.js dashboard + phone device web app + Telegram bot wiring + demo polish
- **Stripe:** optional if time (mock pricing page is acceptable)

---

## 14) Open Questions (Answer later, not blocking PRD)
1) **Auth:** Do we need login or a single shared demo token?
2) **Audio upload/storage:** S3 bucket, local storage, or base64 in DB for hackathon?
3) **STT choice:** Browser speech recognition vs backend Whisper?
4) **Timezone:** Use local timezone for scheduling or enforce UTC?
5) **Proactive suggestions frequency:** “as needed” is hard—define simple rules:
   - fixed times (morning/afternoon)
   - after reminders
   - manual demo triggers
6) **Health data display:** MVP currently avoids real health data. Should the dashboard include a placeholder section?

---

## 15) Appendix — Minimal Copy (English)

**Reminder**
- “Hi {Name}. It’s time for {task}. Did you do it?”
- “Okay. I’ll remind you again in a few minutes.”

**Family message**
- “I have a message for you. Do you want to listen now?”

**Exercise**
- “Let’s do a quick one-minute exercise.”

**Help**
- “Do you want to keep talking with me, or should I notify your caregiver?”

---