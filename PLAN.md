# CareLoop — Project Plan

> Written by AI after deep reading of PRD.md and codebase analysis.
> Last updated: Feb 21, 2026

---

## 0. Quick State of the Repo

| What | Status |
|---|---|
| PRD | ✅ Complete |
| Backend scaffold | ⚠️ Scaffolded (files exist, mostly empty docstrings — Mattéo's work) |
| Frontend | ❌ Does not exist yet |
| DB / scheduler | ❌ Not implemented |
| Telegram / ElevenLabs / Gemini | ❌ Not wired up |

**Bottom line:** We are starting from a clean slate on the frontend. The backend is partially organized but needs real implementation.

---

## 1. Team Split (from PRD §13)

| Person | Responsibility |
|---|---|
| **Mattéo** | Backend (FastAPI, DB, scheduler, Gemini, ElevenLabs, Telegram) |
| **Eliott + Malo** | Frontend: Next.js caregiver dashboard + phone device web app + Telegram wiring + demo polish |

This plan focuses primarily on **Eliott + Malo's scope**.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                  NEXT.JS FRONTEND (single app)          │
│                                                         │
│  /dashboard/*          │  /device                       │
│  (Caregiver, desktop)  │  (Care receiver, phone/kiosk)  │
└───────────────────────────────────────────────────────  │
                          │
              REST + polling over HTTP
                          │
┌─────────────────────────────────────────────────────────┐
│                FASTAPI BACKEND (Mattéo)                  │
│                                                         │
│  CRUD endpoints  │  Scheduler  │  Event log             │
│  Gemini agent    │  ElevenLabs │  Telegram bot          │
└─────────────────────────────────────────────────────────┘
```

**Key architectural decisions:**

| Decision | Choice | Reason |
|---|---|---|
| Single app or two apps? | **Single Next.js app** | Simpler, one deploy, shared code |
| Styling | **Tailwind CSS** | Fastest for hackathon |
| Data fetching | **SWR** (stale-while-revalidate) | Built-in polling, easy caching |
| Auth | **Single shared token (env var)** | Hackathon pragmatic |
| STT | **Browser Speech Recognition API** | No backend needed, zero cost |
| TTS | **ElevenLabs via backend proxy** | Backend generates audio → device plays |
| DB | **SQLite** (backend) | Zero setup, fast for hackathon |
| Scheduler | **APScheduler** (backend) | Simpler than Celery |
| Audio storage | **Local files / base64** | Hackathon pragmatic |

---

## 3. Frontend File Structure

```
frontend/
├── app/
│   ├── layout.tsx                   # Root layout (fonts, globals)
│   ├── page.tsx                     # Redirect → /dashboard
│   ├── dashboard/
│   │   ├── layout.tsx               # Sidebar nav + top bar
│   │   ├── page.tsx                 # Today view (upcoming events)
│   │   ├── calendar/
│   │   │   └── page.tsx             # Agenda CRUD (A1)
│   │   ├── content/
│   │   │   └── page.tsx             # Audio library (A2)
│   │   ├── timeline/
│   │   │   └── page.tsx             # Event log / journal (A3)
│   │   └── settings/
│   │       └── page.tsx             # Profile management (A3)
│   └── device/
│       └── page.tsx                 # Kiosk UI (B1+B2+B3)
├── components/
│   ├── ui/                          # Shared primitives (Button, Modal, Badge…)
│   ├── dashboard/
│   │   ├── Sidebar.tsx
│   │   ├── CalendarEventForm.tsx
│   │   ├── EventCard.tsx
│   │   ├── ContentLibrary.tsx
│   │   ├── AudioUploader.tsx
│   │   ├── TimelineList.tsx
│   │   └── DemoPanel.tsx            # Demo trigger buttons
│   └── device/
│       ├── KioskScreen.tsx          # Main state machine UI
│       ├── StatusIndicator.tsx      # Idle / Speaking / Listening / Processing
│       └── HelpButton.tsx
├── lib/
│   ├── api.ts                       # All API calls (typed)
│   ├── types.ts                     # TypeScript types from data model
│   ├── audio.ts                     # Browser audio playback helpers
│   └── speech.ts                    # Browser STT helpers (Web Speech API)
├── hooks/
│   ├── useNextActions.ts            # Device polling hook
│   ├── useCalendarItems.ts
│   ├── useAudioContents.ts
│   └── useTimeline.ts
└── public/
    └── sounds/                      # Optional local sounds
```

---

## 4. Detailed Page Breakdown

### 4.1 Dashboard — Today / Home (`/dashboard`)
- Card showing next upcoming event
- Quick demo action panel (trigger reminder, exercise, suggestion)
- Mini timeline of last 5 events

### 4.2 Dashboard — Calendar (`/dashboard/calendar`)
- List view of scheduled events (medication, appointment, routine, audio push)
- "Add event" modal:
  - Title, type, date/time, optional repeat rule
  - For audio push: link to audio content from library
- Edit / delete events inline
- "Send now" shortcut button per event

### 4.3 Dashboard — Content Library (`/dashboard/content`)
- List of audio files (title, type, status, date uploaded)
- "Upload audio" (file input → backend upload → store URL)
- Per-item actions:
  - "Send now" → POST to backend
  - "Schedule" → date/time picker modal
  - "Mark as recommendable" toggle
- Simple empty state for first-time use

### 4.4 Dashboard — Timeline (`/dashboard/timeline`)
- Chronological log of all events
- Color-coded by type:
  - 🔵 info (reminder delivered)
  - 🟢 success (confirmed, completed)
  - 🟡 warning (postponed, retry)
  - 🔴 alert (escalated, no response)
- Optional filter by type or date
- Auto-refreshes (SWR polling)

### 4.5 Dashboard — Settings (`/dashboard/settings`)
- Care receiver profile: name, tone preference
- Caregiver profile: name, Telegram chat_id
- Save button (PATCH to backend)

### 4.6 Device — Kiosk App (`/device`)

**State machine:**

```
IDLE
  │  next-action arrives (poll every 3s)
  ▼
SPEAKING  ← play TTS audio from backend (ElevenLabs)
  │  audio ends
  ▼
LISTENING ← Web Speech API (5s timeout)
  │  response parsed
  ▼
PROCESSING ← POST /api/device/response
  │  done
  ▼
IDLE (or next action if queue)
```

**Special flows:**
- "Later" → show "I'll remind you again" → back to IDLE
- No speech heard → retry TTS (up to 3x, then backend escalates)
- Help button always visible → "Do you want me to notify your caregiver?"

**UI:**
- Full-screen, big text
- One large status label (e.g. "Listening…")
- One large circle button = Help / Contact
- Minimal chrome — this is a kiosk for elderly users

---

## 5. API Contract (Frontend ↔ Backend)

All requests include `Authorization: Bearer <CARELOOP_TOKEN>` header.
Base URL: `NEXT_PUBLIC_API_URL` (env var).

### Types
```typescript
// lib/types.ts
type Caregiver = { id: string; name: string; telegram_chat_id: string }
type CareReceiver = { id: string; caregiver_id: string; name: string; language: string; tone: string }
type CalendarItem = {
  id: string; care_receiver_id: string;
  type: "reminder" | "audio_push"; title: string;
  message_text?: string; scheduled_at: string;
  repeat_rule?: string; status: "scheduled"|"sent"|"completed"|"cancelled"
}
type AudioContent = {
  id: string; care_receiver_id: string; title: string;
  url: string; kind: "family_message"|"audiobook"|"other";
  recommendable: boolean; created_at: string
}
type Event = {
  id: string; care_receiver_id: string;
  type: EventType; payload: Record<string, unknown>; created_at: string
}
type DeviceAction = {
  id: string;
  kind: "speak_reminder"|"propose_audio"|"propose_exercise";
  text_to_speak: string;
  audio_url?: string;
  calendar_item_id?: string;
}
```

### Dashboard Endpoints
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/caregivers` | Create caregiver |
| POST | `/api/care-receivers` | Create care receiver |
| GET | `/api/care-receivers/{id}` | Get profile |
| PATCH | `/api/care-receivers/{id}` | Update profile |
| POST | `/api/calendar-items` | Create event |
| GET | `/api/calendar-items?care_receiver_id=` | List events |
| PATCH | `/api/calendar-items/{id}` | Edit event |
| DELETE | `/api/calendar-items/{id}` | Delete event |
| POST | `/api/audio-contents` | Upload content |
| GET | `/api/audio-contents?care_receiver_id=` | List content |
| POST | `/api/audio-contents/{id}/send-now` | Push instantly |
| POST | `/api/audio-contents/{id}/schedule` | Schedule push |
| GET | `/api/events?care_receiver_id=` | Timeline |
| POST | `/api/demo/trigger-reminder-now` | Demo button |
| POST | `/api/demo/trigger-suggestion` | Demo button |

### Device Endpoints
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/device/next-actions?care_receiver_id=` | Poll for actions |
| POST | `/api/device/response` | Submit yes/no/later |
| POST | `/api/device/help-request` | Escalate to caregiver |

---

## 6. Mocking Strategy (Frontend can work independently)

Until the backend is ready, use a **mock API layer** in `lib/api.ts`:

```typescript
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true"
```

Mock data files live in `lib/mocks/`. This means frontend agents can work in parallel with Mattéo's backend work.

---

## 7. Agent Parallelization Strategy

### Wave 1 — Foundation (must complete first, ~1-2 hours)
**One agent, sequential:**
- [ ] Init Next.js app with Tailwind
- [ ] Set up routing structure (all pages as stubs)
- [ ] Create `lib/types.ts` (all TypeScript types)
- [ ] Create `lib/api.ts` (all API calls, with mock fallback)
- [ ] Create shared UI primitives: `Button`, `Modal`, `Badge`, `Card`, `Input`
- [ ] Create Dashboard layout with sidebar navigation

### Wave 2 — Parallel (launch simultaneously after Wave 1)

**Agent A — Dashboard: Calendar & Demo** (~2 hours)
- `/dashboard/calendar` full page
- `CalendarEventForm` modal (create/edit)
- `EventCard` component
- Demo trigger panel in `/dashboard`

**Agent B — Dashboard: Content Library & Timeline** (~2 hours)
- `/dashboard/content` full page with AudioUploader
- `/dashboard/timeline` full page with color-coded events
- Auto-refresh via SWR polling

**Agent C — Dashboard: Settings & Today View** (~1 hour)
- `/dashboard/settings` page
- `/dashboard` today overview card
- Profile display

**Agent D — Device App** (~2-3 hours, most complex)
- `/device` kiosk page full implementation
- State machine (IDLE → SPEAKING → LISTENING → PROCESSING)
- `lib/speech.ts` (Web Speech API wrapper)
- `lib/audio.ts` (audio playback from URL)
- `useNextActions` polling hook
- Help flow modal

### Wave 3 — Integration & Polish (~1-2 hours)
- Connect frontend to real backend (replace mocks)
- Telegram wiring check (backend sends, dashboard shows)
- Error states and loading states
- Demo flow end-to-end test
- Responsive polish on device app

---

## 8. Critical Path & Dependencies

```
Wave 1: App scaffold + types + API client
    │
    ├── Agent A: Calendar page ──────────────────┐
    ├── Agent B: Content + Timeline pages ───────┤── Wave 3: Integration & demo
    ├── Agent C: Settings + Today pages ─────────┤
    └── Agent D: Device kiosk app ───────────────┘
                                                  │
Mattéo: Backend (independent) ────────────────────┘
```

The frontend agents can work entirely with mocks. The only real integration dependency is Wave 3, which happens after both backend and all frontend are ready.

---

## 9. Key Technical Notes

### Speech Recognition (Device)
```typescript
// lib/speech.ts
// Use window.SpeechRecognition (Chrome / Edge)
// Safari has limited support — fallback: text input button
// Listen for 5 seconds max, pick first result
// Intent parsing: simple keyword match
//   "yes" / "yeah" / "done" / "okay" → YES
//   "no" / "not yet" / "nope"       → NO
//   "later" / "wait" / "minute"     → LATER
//   "help" / "contact" / "call"     → HELP
//   "exercise" / "activity"         → EXERCISE
//   "message" / "play" / "listen"   → PLAY_MESSAGE
```

### Device Polling
```typescript
// hooks/useNextActions.ts
// Poll GET /api/device/next-actions every 3 seconds
// Only process one action at a time (state machine)
// SWR with refreshInterval: 3000
```

### Audio Playback (TTS from ElevenLabs)
```typescript
// lib/audio.ts
// Backend returns audio_url for TTS
// Use HTMLAudioElement to play
// Fire onended callback → transition to LISTENING state
```

### Environment Variables
```bash
# .env.local (frontend)
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_CARE_RECEIVER_ID=<uuid>   # hardcoded for hackathon demo
NEXT_PUBLIC_USE_MOCK=true             # set to false when backend ready
CARELOOP_API_TOKEN=demo-token
```

---

## 10. Demo Script (What judges will see)

1. Caregiver opens dashboard → creates a medication reminder for "in 1 minute"
2. Caregiver hits "Demo: Trigger Now" → immediately fires the reminder
3. Device phone receives the reminder → speaks it (ElevenLabs TTS)
4. Care receiver says "Later" → device confirms, schedules follow-up
5. Care receiver doesn't respond to follow-up → backend escalates → Telegram message sent to caregiver
6. Dashboard timeline shows full event chain: created → delivered → postponed → escalated
7. Caregiver pushes a family audio message → device proposes it → care receiver says "Yes" → plays
8. Care receiver says "Give me an exercise" → device runs 3-question exercise → timeline logs score

**This covers all 4 success metrics from PRD §12.**

---

## 11. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Browser Speech Recognition doesn't work on demo device | Add large on-screen Yes/No/Later buttons as fallback |
| ElevenLabs API slow / down | Cache generated audio; have text-only fallback |
| Backend not ready in time | Frontend works with mocks; integration is last step |
| Telegram bot not set up | Mock the Telegram notification in demo |
| Audio upload/storage complex | Use base64 encoded audio in DB for hackathon |
| Device phone browser STT support | Test early, default to manual buttons if needed |

---

## 12. Immediate Next Steps

1. **Agree on `NEXT_PUBLIC_CARE_RECEIVER_ID`** — hardcode a UUID for demo
2. **Mattéo: expose `/api/device/next-actions`** — this is the most critical endpoint for device
3. **Start Wave 1** — scaffold the Next.js app
4. **Start Wave 2 agents** — all four in parallel once scaffold exists
