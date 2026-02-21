import type {
  Caregiver,
  CareReceiver,
  CalendarItem,
  AudioContent,
  CareLoopEvent,
  DeviceAction,
} from "@/lib/types"

export const MOCK_CAREGIVER_ID = "cg-0000-0001"
export const MOCK_CARE_RECEIVER_ID = "cr-0000-0001"

export const mockCaregiver: Caregiver = {
  id: MOCK_CAREGIVER_ID,
  name: "Marie",
  telegram_chat_id: "123456789",
  created_at: "2026-02-20T10:00:00Z",
}

export const mockCareReceiver: CareReceiver = {
  id: MOCK_CARE_RECEIVER_ID,
  caregiver_id: MOCK_CAREGIVER_ID,
  name: "Simone",
  language: "en",
  tone: "warm",
  created_at: "2026-02-20T10:01:00Z",
}

export const mockCalendarItems: CalendarItem[] = []

export const mockAudioContents: AudioContent[] = [
  {
    id: "ac-0001",
    care_receiver_id: MOCK_CARE_RECEIVER_ID,
    title: "Message from Marie",
    url: "/sounds/sample.mp3",
    kind: "family_message",
    recommendable: true,
    created_at: "2026-02-21T09:00:00Z",
  },
  {
    id: "ac-0002",
    care_receiver_id: MOCK_CARE_RECEIVER_ID,
    title: "Classic music — Debussy",
    url: "/sounds/debussy.mp3",
    kind: "audiobook",
    recommendable: true,
    created_at: "2026-02-20T14:00:00Z",
  },
]

export const mockEvents: CareLoopEvent[] = [
  {
    id: "ev-0001",
    care_receiver_id: MOCK_CARE_RECEIVER_ID,
    type: "reminder_delivered",
    payload: { title: "Evening medication" },
    created_at: new Date(Date.now() - 65 * 60 * 1000).toISOString(),
  },
  {
    id: "ev-0002",
    care_receiver_id: MOCK_CARE_RECEIVER_ID,
    type: "reminder_confirmed",
    payload: { title: "Evening medication", response: "yes" },
    created_at: new Date(Date.now() - 63 * 60 * 1000).toISOString(),
  },
  {
    id: "ev-0003",
    care_receiver_id: MOCK_CARE_RECEIVER_ID,
    type: "reminder_delivered",
    payload: { title: "Morning medication" },
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "ev-0004",
    care_receiver_id: MOCK_CARE_RECEIVER_ID,
    type: "reminder_postponed",
    payload: { title: "Morning medication", response: "later" },
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000 + 30000).toISOString(),
  },
  {
    id: "ev-0005",
    care_receiver_id: MOCK_CARE_RECEIVER_ID,
    type: "reminder_escalated",
    payload: { title: "Morning medication", attempts: 3 },
    created_at: new Date(Date.now() - 3.5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "ev-0006",
    care_receiver_id: MOCK_CARE_RECEIVER_ID,
    type: "caregiver_notified",
    payload: { channel: "telegram", reason: "no_response" },
    created_at: new Date(Date.now() - 3.5 * 60 * 60 * 1000 + 5000).toISOString(),
  },
  {
    id: "ev-0007",
    care_receiver_id: MOCK_CARE_RECEIVER_ID,
    type: "exercise_completed",
    payload: { score: 3, total: 3 },
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "ev-0008",
    care_receiver_id: MOCK_CARE_RECEIVER_ID,
    type: "audio_played",
    payload: { title: "Message from Marie" },
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
]

export const mockNextActions: DeviceAction[] = [
  {
    id: "da-0001",
    kind: "speak_reminder",
    text_to_speak: "Hi Simone. It's time to take your morning medication. Did you take it?",
    calendar_item_id: "ci-0001",
  },
]
