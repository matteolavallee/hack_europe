# CareLoop — Build Progress

> Updated: Feb 21, 2026

---

## Current Status: Wave 1 Complete ✅ — Wave 2 In Progress 🚀

---

## What Has Been Done

### Repository
- Branch: `eliott` (working branch, off `main`)
- Backend scaffold exists at `/backend/` (Mattéo's — file structure + docstrings, no real implementation yet)
- Frontend created at `/frontend/` (Eliott + Malo — Wave 1 complete)

---

### Wave 1 — Foundation (COMPLETE ✅)

| File/Folder | Status | Notes |
|---|---|---|
| `frontend/` — Next.js 16 app | ✅ | TypeScript, Tailwind, App Router |
| `frontend/lib/types.ts` | ✅ | All types: Caregiver, CareReceiver, CalendarItem, AudioContent, CareLoopEvent, DeviceAction, DeviceState |
| `frontend/lib/api.ts` | ✅ | All API calls with built-in mock fallback |
| `frontend/lib/mocks/index.ts` | ✅ | Realistic mock data: Simone + Marie, 4 events, 2 audios, 8 timeline events |
| `frontend/lib/utils.ts` | ✅ | Date/time formatters, cn() utility |
| `frontend/lib/speech.ts` | ✅ | Web Speech API wrapper, intent parser (yes/no/later/help/exercise/play_message) |
| `frontend/lib/audio.ts` | ✅ | Audio playback, stop, TTS URL builder |
| `frontend/components/ui/Button.tsx` | ✅ | 5 variants, 4 sizes, loading state |
| `frontend/components/ui/Card.tsx` | ✅ | Card + CardHeader |
| `frontend/components/ui/Badge.tsx` | ✅ | + eventVariant() + eventLabel() helpers |
| `frontend/components/ui/Input.tsx` | ✅ | Input, Select, Textarea |
| `frontend/components/ui/Modal.tsx` | ✅ | Modal + ConfirmModal |
| `frontend/components/dashboard/Sidebar.tsx` | ✅ | Sticky sidebar with active state |
| `frontend/components/dashboard/DemoPanel.tsx` | ✅ | 3 demo trigger buttons |
| `frontend/hooks/useNextActions.ts` | ✅ | SWR polling every 3s |
| `frontend/hooks/useCalendarItems.ts` | ✅ | SWR with 10s refresh |
| `frontend/hooks/useAudioContents.ts` | ✅ | SWR hook |
| `frontend/hooks/useTimeline.ts` | ✅ | SWR with 5s refresh |
| `frontend/app/layout.tsx` | ✅ | Root layout |
| `frontend/app/page.tsx` | ✅ | Redirects → /dashboard |
| `frontend/app/dashboard/layout.tsx` | ✅ | Sidebar + main |
| `frontend/app/dashboard/page.tsx` | ✅ | Today view with stats, upcoming, recent activity |
| `frontend/app/dashboard/calendar/page.tsx` | 🔶 Stub | Table renders mock data; no create/edit modals yet |
| `frontend/app/dashboard/content/page.tsx` | 🔶 Stub | Cards render mock data; no real upload/send yet |
| `frontend/app/dashboard/timeline/page.tsx` | 🔶 Stub | Renders full timeline from mock data |
| `frontend/app/dashboard/settings/page.tsx` | 🔶 Stub | Form renders mock profile; no save yet |
| `frontend/app/device/page.tsx` | 🔶 Stub | Kiosk shell renders, state machine manual demo only |
| `frontend/components/device/KioskShell.tsx` | 🔶 Stub | UI complete, simulated flow, no real backend/voice yet |
| `frontend/.env.local` | ✅ | MOCK=true, API_URL, TOKEN, CARE_RECEIVER_ID |

**Dev server:** Running at `http://localhost:3000`
**Mock mode:** ON — works with zero backend

---

## Wave 2 — Complete ✅

| Agent | Scope | Status |
|---|---|---|
| **Agent A** | Dashboard: Calendar full CRUD (create/edit/delete modals, repeat rules, real SWR) | ✅ Done |
| **Agent B** | Dashboard: Content Library full (upload, send, schedule) + Timeline (live SWR + filters) | ✅ Done |
| **Agent C** | Dashboard: Settings (real PATCH) + Today page (live data via SWR) | ✅ Done |
| **Agent D** | Device: Full voice state machine (real STT, real TTS, backend polling) | ✅ Done |

### What Wave 2 delivered

**Calendar (`/dashboard/calendar`):**
- Full CRUD with Add/Edit/Delete modals using existing UI components
- Form: title, type, message text (reminder only), datetime picker, repeat rule
- Status filter tabs (All / Upcoming / Completed)
- "Send Now" button per reminder
- Live data via `useCalendarItems` SWR hook, auto-refreshes after mutations

**Content Library (`/dashboard/content`):**
- Upload modal (title, kind, URL, recommendable toggle)
- Per-card: Send Now, Schedule (datetime picker), recommendable toggle
- Inline toast feedback on actions
- `AudioContentCard.tsx` extracted as reusable component

**Timeline (`/dashboard/timeline`):**
- Live data via `useTimeline(100)` polling every 5s
- Filter tabs: All / Reminders / Audio / Exercise / Escalations
- "Live" pulse pill + manual Refresh button
- Relative timestamps with full datetime on hover

**Settings (`/dashboard/settings`):**
- Both forms (care receiver + caregiver) save via PATCH API calls
- Loading skeletons while data fetches
- "Saved!" success feedback for 2s
- `updateCaregiver()` added to `lib/api.ts`

**Today page (`/dashboard/page.tsx`):**
- Upgraded to `"use client"` with live SWR hooks
- Loading skeleton components
- Real counts from live data

**Device kiosk (`/device`):**
- Full state machine: IDLE → SPEAKING → LISTENING → PROCESSING → IDLE
- Mock mode: 3s timeout instead of real audio
- Real mode: ElevenLabs TTS via `playAudio(buildTtsUrl(...))`
- Web Speech API intent recognition + manual Yes/No/Later buttons (always shown after 2s)
- 3-question cognitive exercise flow with progress dots
- Help modal with caregiver notification flow
- Processed action ID tracking (prevents infinite loops with mock)
- `HelpModal` and exercise logic cleanly separated

---

## Wave 3 — Planned (Not Started)

- Connect frontend to real backend (set `NEXT_PUBLIC_USE_MOCK=false`)
- Telegram wiring verification (backend sends → dashboard shows)
- Full end-to-end demo flow test
- Responsive polish on device app
- Error states and loading skeletons

---

## Architecture Decisions Made

| Decision | Choice |
|---|---|
| Single app vs two apps | **Single Next.js app** — `/dashboard/*` and `/device` |
| Styling | **Tailwind CSS** |
| Data fetching | **SWR** — handles polling, caching, revalidation |
| Auth | **Single shared token** in env var |
| STT | **Browser Web Speech API** + manual Yes/No/Later button fallback |
| TTS | **ElevenLabs via backend proxy** (`/api/tts?text=...`) |
| Mock mode | **Built-in** — `NEXT_PUBLIC_USE_MOCK=true/false` |

---

## API Contract (Frontend expects from Backend)

### Auth
All requests: `Authorization: Bearer <CARELOOP_API_TOKEN>`

### Key endpoints needed
```
GET  /api/care-receivers/{id}
PATCH /api/care-receivers/{id}

POST /api/calendar-items
GET  /api/calendar-items?care_receiver_id=
PATCH /api/calendar-items/{id}
DELETE /api/calendar-items/{id}

POST /api/audio-contents
GET  /api/audio-contents?care_receiver_id=
POST /api/audio-contents/{id}/send-now
POST /api/audio-contents/{id}/schedule

GET  /api/events?care_receiver_id=&limit=

POST /api/demo/trigger-reminder-now
POST /api/demo/trigger-suggestion

GET  /api/device/next-actions?care_receiver_id=
POST /api/device/response
POST /api/device/help-request

GET  /api/tts?text=...    ← returns audio stream (ElevenLabs proxy)
```

### Device action shape (critical for device app)
```json
{
  "id": "string",
  "kind": "speak_reminder | propose_audio | propose_exercise",
  "text_to_speak": "string",
  "audio_url": "string (optional)",
  "calendar_item_id": "string (optional)"
}
```

---

## How to Run

```bash
cd frontend
npm install        # already done
npm run dev        # → http://localhost:3000
```

Switch to real backend:
```bash
# Edit frontend/.env.local
NEXT_PUBLIC_USE_MOCK=false
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## File Tree (Current)

```
hack_europe/
├── PRD.md
├── PLAN.md
├── PROGRESS.md          ← this file
├── README.md
├── requirements.txt
├── backend/             ← Mattéo's (scaffolded, not implemented)
│   └── app/
│       ├── api/
│       ├── core/
│       ├── data/
│       ├── models/
│       ├── prompts/
│       ├── services/
│       └── tools/
└── frontend/            ← Eliott + Malo (Wave 1 complete)
    ├── .env.local
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx
    │   ├── dashboard/
    │   │   ├── layout.tsx
    │   │   ├── page.tsx
    │   │   ├── calendar/page.tsx
    │   │   ├── content/page.tsx
    │   │   ├── timeline/page.tsx
    │   │   └── settings/page.tsx
    │   └── device/
    │       └── page.tsx
    ├── components/
    │   ├── ui/           (Button, Card, Badge, Input, Modal)
    │   ├── dashboard/    (Sidebar, DemoPanel)
    │   └── device/       (KioskShell)
    ├── hooks/            (useNextActions, useCalendarItems, useAudioContents, useTimeline)
    └── lib/              (types, api, mocks, utils, speech, audio)
```
