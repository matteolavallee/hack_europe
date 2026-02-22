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
  appointment: "Appointment",
  visit: "Visit",
  voice_message: "Voice message",
  shopping: "Shopping",
  other: "Other",
}

export const CATEGORY_CONFIG: Record<
  EventCategory,
  { label: string; pill: string; bg: string; iconBg: string; text: string }
> = {
  medication: {
    label: "Medication",
    pill: "bg-red-100 text-red-800",
    bg: "bg-[#FEE2E2]",
    iconBg: "bg-[#FCA5A5] text-[#991B1B]",
    text: "text-[#7F1D1D]",
  },
  appointment: {
    label: "Appointment",
    pill: "bg-blue-100 text-blue-800",
    bg: "bg-[#DBEAFE]",
    iconBg: "bg-[#93C5FD] text-[#1E3A8A]",
    text: "text-[#1E3A8A]",
  },
  visit: {
    label: "Visit",
    pill: "bg-green-100 text-green-800",
    bg: "bg-[#DCFCE7]",
    iconBg: "bg-[#86EFAC] text-[#166534]",
    text: "text-[#166534]",
  },
  voice_message: {
    label: "Voice message",
    pill: "bg-purple-100 text-purple-800",
    bg: "bg-[#EDE9FE]",
    iconBg: "bg-[#C4B5FD] text-[#4C1D95]",
    text: "text-[#4C1D95]",
  },
  shopping: {
    label: "Shopping",
    pill: "bg-orange-100 text-orange-800",
    bg: "bg-[#FEF3C7]",
    iconBg: "bg-[#FDE68A] text-[#92400E]",
    text: "text-[#92400E]",
  },
  other: {
    label: "Other",
    pill: "bg-muted text-muted-foreground",
    bg: "bg-muted/50",
    iconBg: "bg-muted-foreground/20 text-muted-foreground",
    text: "text-muted-foreground",
  },
}
