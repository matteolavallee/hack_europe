/**
 * SeniorCareCalendar - Types
 * Uses site design tokens (primary, muted, border, etc.)
 */

export type FamilyMember = "mom" | "dad" | "doctor" | "family"

export type EventCategory =
  | "medication"
  | "appointment"
  | "visit"
  | "voice_message"
  | "shopping"
  | "other"

export type ViewMode = "month" | "week" | "day"

export interface CalendarEvent {
  id: string
  title: string
  note?: string
  date: string // YYYY-MM-DD
  time: string // HH:mm
  category: EventCategory
  member: FamilyMember
  isDone?: boolean
}

export const FAMILY_CONFIG: Record<
  FamilyMember,
  { label: string; emoji: string; color: string }
> = {
  mom: { label: "Mom", emoji: "💙", color: "bg-blue-100 text-blue-800" },
  dad: { label: "Dad", emoji: "❤️", color: "bg-red-100 text-red-800" },
  doctor: { label: "Doctor", emoji: "🟢", color: "bg-green-100 text-green-800" },
  family: { label: "Family", emoji: "👨‍👩‍👧", color: "bg-muted text-muted-foreground" },
}

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  medication: "Medication",
  appointment: "Doctor",
  visit: "Visit",
  voice_message: "Voice message",
  shopping: "Shopping",
  other: "Other",
}
