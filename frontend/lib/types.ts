// ─── Core entities ────────────────────────────────────────────────────────────

export interface Caregiver {
  id: string
  name: string
  telegram_chat_id: string
  created_at: string
}

export interface CareReceiver {
  id: string
  caregiver_id: string
  name: string
  language: string
  tone: "warm" | "professional" | "playful"
  created_at: string
}

// ─── Calendar ─────────────────────────────────────────────────────────────────

export type CalendarItemType = "reminder" | "audio_push" | "whatsapp_prompt"
export type CalendarItemStatus = "scheduled" | "sent" | "completed" | "cancelled"

export interface CalendarItem {
  id: string
  care_receiver_id: string
  type: CalendarItemType
  title: string
  message_text?: string
  scheduled_at: string          // ISO datetime
  repeat_rule?: string          // e.g. "daily", "weekly" — nullable
  status: CalendarItemStatus
  audio_content_id?: string     // linked audio (for audio_push type)
  created_at: string
}

export interface CreateCalendarItemPayload {
  care_receiver_id: string
  type: CalendarItemType
  title: string
  message_text?: string
  scheduled_at: string
  repeat_rule?: string
  audio_content_id?: string
}

export interface UpdateCalendarItemPayload {
  title?: string
  message_text?: string
  scheduled_at?: string
  repeat_rule?: string
  status?: CalendarItemStatus
}

// ─── Audio content ────────────────────────────────────────────────────────────

export type AudioContentKind = "family_message" | "audiobook" | "other"

export interface AudioContent {
  id: string
  care_receiver_id: string
  title: string
  url: string
  kind: AudioContentKind
  recommendable: boolean
  created_at: string
}

export interface CreateAudioContentPayload {
  care_receiver_id: string
  title: string
  url: string
  kind: AudioContentKind
  recommendable?: boolean
}

// ─── Events (timeline) ────────────────────────────────────────────────────────

export type EventType =
  | "reminder_created"
  | "reminder_delivered"
  | "reminder_confirmed"
  | "reminder_postponed"
  | "reminder_no_response"
  | "reminder_escalated"
  | "audio_uploaded"
  | "audio_queued"
  | "audio_played"
  | "audio_postponed"
  | "exercise_started"
  | "exercise_completed"
  | "help_requested"
  | "caregiver_notified"

export interface CareLoopEvent {
  id: string
  care_receiver_id: string
  type: EventType
  payload: Record<string, unknown>
  created_at: string
}

// ─── Device ───────────────────────────────────────────────────────────────────

export type DeviceActionKind =
  | "speak_reminder"
  | "propose_audio"
  | "propose_exercise"

export interface DeviceAction {
  id: string
  kind: DeviceActionKind
  text_to_speak: string
  audio_url?: string            // for audio_push: URL to play after TTS intro
  calendar_item_id?: string
  audio_content_id?: string
}

export type DeviceResponse = "yes" | "no" | "later"

export interface DeviceResponsePayload {
  action_id: string
  response: DeviceResponse
}

export interface HelpRequestPayload {
  type: "notify_caregiver"
  message?: string
}

// ─── Device state machine ─────────────────────────────────────────────────────

export type DeviceState = "idle" | "speaking" | "listening" | "processing"

// ─── UI helpers ───────────────────────────────────────────────────────────────

export interface SelectOption {
  value: string
  label: string
}
