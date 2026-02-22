"use client"

import { useState, useMemo } from "react"
import {
  Mic,
  CalendarPlus,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Pill,
  Stethoscope,
  Users,
  MessageCircle,
  Check,
  Clock,
  Send,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/Button"
import { SeniorCareCalendar } from "@/components/ui/SeniorCareCalendar"
import { Modal } from "@/components/ui/Modal"
import { Input, Select, Textarea } from "@/components/ui/Input"
import { cn, formatTime } from "@/lib/utils"
import { useCalendarItems } from "@/hooks/useCalendarItems"
import { createCalendarItem, sendVoiceMessageNow, triggerCalendarItemNow, deleteCalendarItem, CARE_RECEIVER_ID } from "@/lib/api"
import type { CalendarItem, CalendarItemType } from "@/lib/types"

// ─── Types & Mock data ───────────────────────────────────────────────────────

export type EventCategory = "medication" | "appointment" | "visit" | "voice_message" | "whatsapp_message"


export interface TimelineEvent {
  id: string
  title: string
  subtitle?: string
  time: string // "HH:mm"
  category: EventCategory
  isDone?: boolean // for past events: sent/done
}

function getTodayDateString(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function addDays(dateStr: string, delta: number): string {
  const d = new Date(dateStr + "T12:00:00")
  d.setDate(d.getDate() + delta)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function isToday(dateStr: string): boolean {
  return dateStr === getTodayDateString()
}

function formatDayLabel(dateStr: string): string {
  if (isToday(dateStr)) return "Today"
  const d = new Date(dateStr + "T12:00:00")
  const yesterday = addDays(getTodayDateString(), -1)
  const tomorrow = addDays(getTodayDateString(), 1)
  if (dateStr === yesterday) return "Yesterday"
  if (dateStr === tomorrow) return "Tomorrow"
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
}

function formatLongDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
}

// Map API CalendarItem to timeline event for display; parse category from message_text prefix [medication] etc.
function calendarItemToTimelineEvent(item: CalendarItem): TimelineEvent {
  let category: EventCategory = "voice_message"
  let subtitle: string | undefined = item.message_text
  if (item.message_text) {
    const match = item.message_text.match(/^\[(medication|appointment|visit|voice_message)\]\s*/i)
    if (match) {
      category = match[1].toLowerCase() as EventCategory
      subtitle = item.message_text.slice(match[0].length).trim() || undefined
    }
  }
  if (item.type === "audio_push") category = "voice_message"
  if (item.type === "whatsapp_prompt") category = "whatsapp_message"
  const time = formatTime(item.scheduled_at)
  const isDone = item.status !== "scheduled"
  return {
    id: item.id,
    title: item.title,
    subtitle,
    time,
    category,
    isDone,
  }
}

function getDateFromScheduledAt(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" })
}

/* High contrast — AAA WCAG, semantic colors with icons/labels */
const CATEGORY_CONFIG: Record<
  EventCategory,
  { label: string; icon: typeof Pill; bg: string; border: string; iconBg: string; text: string }
> = {
  medication: {
    label: "Medication",
    icon: Pill,
    bg: "bg-[#FEE2E2]",
    border: "border-2 border-destructive/50",
    iconBg: "bg-[#FCA5A5] text-[#991B1B]",
    text: "text-[#7F1D1D]",
  },
  appointment: {
    label: "Medical appointment",
    icon: Stethoscope,
    bg: "bg-[#DBEAFE]",
    border: "border-2 border-[#2563EB]/50",
    iconBg: "bg-[#93C5FD] text-[#1E3A8A]",
    text: "text-[#1E3A8A]",
  },
  visit: {
    label: "Visit",
    icon: Users,
    bg: "bg-[#DCFCE7]",
    border: "border-2 border-primary/50",
    iconBg: "bg-[#86EFAC] text-[#166534]",
    text: "text-[#166534]",
  },
  voice_message: {
    label: "Voice message",
    icon: MessageCircle,
    bg: "bg-[#EDE9FE]",
    border: "border-2 border-[#6D28D9]/50",
    iconBg: "bg-[#C4B5FD] text-[#4C1D95]",
    text: "text-[#4C1D95]",
  },
  whatsapp_message: {
    label: "Message WhatsApp",
    icon: MessageCircle,
    bg: "bg-[#DCFCE7]",
    border: "border-2 border-[#22C55E]/50",
    iconBg: "bg-[#86EFAC] text-[#166534]",
    text: "text-[#166534]",
  },
}

// Current time for displayed day: real if today, else noon for demo
function getNowTimeForDay(selectedDate: string): { hour: number; minute: number } {
  if (isToday(selectedDate)) {
    const now = new Date()
    return { hour: now.getHours(), minute: now.getMinutes() }
  }
  return { hour: 12, minute: 0 }
}

function isEventPast(eventTime: string, selectedDate: string): boolean {
  const [h, m] = eventTime.split(":").map(Number)
  const { hour, minute } = getNowTimeForDay(selectedDate)
  return h < hour || (h === hour && m <= minute)
}

function formatCurrentTime(selectedDate: string): string {
  const { hour, minute } = getNowTimeForDay(selectedDate)
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
}

// ─── Composant Timeline ───────────────────────────────────────────────────────

function TimelineEventCard({
  event,
  isPast,
  selectedDate,
  onTriggerNow,
  onDelete,
  isTriggering,
}: {
  event: TimelineEvent
  isPast: boolean
  selectedDate: string
  onTriggerNow?: (eventId: string) => void
  onDelete?: (eventId: string) => void
  isTriggering?: boolean
}) {
  const config = CATEGORY_CONFIG[event.category]
  const Icon = config.icon

  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg border border-border bg-card p-4",
        isPast && "opacity-70",
      )}
    >
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", config.iconBg)}>
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-medium", config.text)}>{event.title}</p>
        {event.subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{event.subtitle}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">{event.time}</span>
          {isPast ? (
            <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
              <Check className="h-3 w-3" aria-hidden /> Sent
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              <Clock className="h-3 w-3" aria-hidden /> Upcoming
            </span>
          )}
          <div className="ml-auto flex shrink-0 items-center gap-1">
            {onTriggerNow && (
              <Button
                size="sm"
                variant="secondary"
                disabled={isTriggering}
                onClick={(e) => {
                  e.stopPropagation()
                  onTriggerNow(event.id)
                }}
                aria-label={`Send ${event.title} now to device`}
              >
                {isTriggering ? (
                  <span className="text-xs">Envoi…</span>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" aria-hidden />
                    Send now
                  </>
                )}
              </Button>
            )}
            {onDelete && (
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(event.id)
                }}
                aria-label={`Delete ${event.title}`}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

type RepeatRule = "none" | "daily" | "weekly" | "monthly" | "custom"

const WEEKDAYS: { value: string; label: string }[] = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
]

const MONTHLY_OCCURRENCES: { value: string; label: string }[] = [
  { value: "1", label: "First" },
  { value: "2", label: "Second" },
  { value: "3", label: "Third" },
  { value: "4", label: "Fourth" },
  { value: "last", label: "Last" },
]

function getDefaultReminderDate(): string {
  return getTodayDateString()
}

function getDefaultReminderTime(): string {
  const now = new Date()
  const h = now.getHours()
  const m = now.getMinutes()
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

type CalendarView = "timeline" | "calendar"

export default function CalendarPage() {
  const { items, loading, refresh } = useCalendarItems()
  const [view, setView] = useState<CalendarView>("calendar")
  const [selectedDate, setSelectedDate] = useState(getTodayDateString())
  const [voiceModalOpen, setVoiceModalOpen] = useState(false)
  const [reminderModalOpen, setReminderModalOpen] = useState(false)
  const [voiceMessage, setVoiceMessage] = useState("")
  const [voiceSenderName, setVoiceSenderName] = useState("")
  const [voiceSendMode, setVoiceSendMode] = useState<"now" | "scheduled">("now")
  const [voiceScheduleDate, setVoiceScheduleDate] = useState(() => getDefaultReminderDate())
  const [voiceScheduleTime, setVoiceScheduleTime] = useState(() => getDefaultReminderTime())
  const [voiceSending, setVoiceSending] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [triggeringId, setTriggeringId] = useState<string | null>(null)
  const [sendFeedback, setSendFeedback] = useState<"success" | "error" | null>(null)

  // Reminder form state
  const [reminderDate, setReminderDate] = useState(() => getDefaultReminderDate())
  const [reminderTitle, setReminderTitle] = useState("")
  const [reminderType, setReminderType] = useState<EventCategory>("medication")
  const [reminderTime, setReminderTime] = useState(() => getDefaultReminderTime())
  const [reminderMessage, setReminderMessage] = useState("")
  const [repeatRule, setRepeatRule] = useState<RepeatRule>("none")
  const [repeatOnDay, setRepeatOnDay] = useState<string>("2") // Tuesday by default for "weekly"
  const [repeatInterval, setRepeatInterval] = useState(1) // every 1 day/week/month
  const [monthlyKind, setMonthlyKind] = useState<"same_date" | "same_weekday">("same_date")
  const [monthlyOccurrence, setMonthlyOccurrence] = useState<string>("1") // first, second, ... last
  const [customRepeatDays, setCustomRepeatDays] = useState(2) // for "custom": every X days

  const nowTime = formatCurrentTime(selectedDate)
  const showNowSeparator = isToday(selectedDate)

  const eventsForDay = useMemo(() => {
    const dayEvents = items
      .filter((item) => getDateFromScheduledAt(item.scheduled_at) === selectedDate)
      .map(calendarItemToTimelineEvent)
      .sort((a, b) => a.time.localeCompare(b.time))
    return dayEvents
  }, [items, selectedDate])

  const { pastEvents, futureEvents } = useMemo(() => {
    const past: TimelineEvent[] = []
    const future: TimelineEvent[] = []
    for (const e of eventsForDay) {
      if (isEventPast(e.time, selectedDate)) past.push(e)
      else future.push(e)
    }
    return { pastEvents: past, futureEvents: future }
  }, [eventsForDay, selectedDate])

  const goPrev = () => setSelectedDate((d) => addDays(d, -1))
  const goNext = () => setSelectedDate((d) => addDays(d, 1))
  const goToday = () => setSelectedDate(getTodayDateString())

  function buildRepeatRuleString(): string | undefined {
    if (repeatRule === "none") return undefined
    if (repeatRule === "daily") return repeatInterval === 1 ? "daily" : `daily:${repeatInterval}`
    if (repeatRule === "weekly") return repeatInterval === 1 ? `weekly:${repeatOnDay}` : `weekly:${repeatOnDay}:${repeatInterval}`
    if (repeatRule === "monthly") {
      if (monthlyKind === "same_date") return repeatInterval === 1 ? "monthly" : `monthly:${repeatInterval}`
      return `monthly:same_weekday:${monthlyOccurrence}:${repeatOnDay}`
    }
    if (repeatRule === "custom") return `custom:${customRepeatDays}`
    return undefined
  }

  function resetReminderForm() {
    setReminderDate(getDefaultReminderDate())
    setReminderTitle("")
    setReminderType("medication")
    setReminderTime(getDefaultReminderTime())
    setReminderMessage("")
    setRepeatRule("none")
    setRepeatOnDay("2")
    setRepeatInterval(1)
    setMonthlyKind("same_date")
    setMonthlyOccurrence("1")
    setCustomRepeatDays(2)
  }

  async function handleTriggerNow(eventId: string) {
    setTriggeringId(eventId)
    setSendFeedback(null)
    try {
      await triggerCalendarItemNow(eventId, CARE_RECEIVER_ID)
      await refresh()
      setSendFeedback("success")
      setTimeout(() => setSendFeedback(null), 4000)
    } catch (err) {
      setSendFeedback("error")
      setTimeout(() => setSendFeedback(null), 4000)
      console.error("Send now failed:", err)
    } finally {
      setTriggeringId(null)
    }
  }

  async function handleDelete(eventId: string) {
    try {
      await deleteCalendarItem(eventId)
      await refresh()
    } catch {
      // Error feedback could be added
    }
  }

  async function handleCreateReminder() {
    const title = reminderTitle.trim()
    if (!title) return
    setSubmitting(true)
    try {
      const scheduledAt = new Date(`${reminderDate}T${reminderTime}:00`).toISOString()
      const messageText = `[${reminderType}] ${reminderMessage.trim()}`.trim()
      const repeat_rule = buildRepeatRuleString()
      const itemType: CalendarItemType = reminderType === "whatsapp_message" ? "whatsapp_prompt" : "reminder"
      await createCalendarItem({
        care_receiver_id: CARE_RECEIVER_ID,
        type: itemType,
        title,
        message_text: messageText || undefined,
        scheduled_at: scheduledAt,
        repeat_rule,
      })
      await refresh()
      setReminderModalOpen(false)
      resetReminderForm()
    } finally {
      setSubmitting(false)
    }
  }

  function closeVoiceModal() {
    setVoiceModalOpen(false)
    setVoiceMessage("")
    setVoiceSenderName("")
    setVoiceSendMode("now")
    setVoiceScheduleDate(getDefaultReminderDate())
    setVoiceScheduleTime(getDefaultReminderTime())
  }

  async function handleSendVoiceMessage() {
    const sender = voiceSenderName.trim() || "A family member"
    const message = voiceMessage.trim()
    if (!message) return
    setVoiceSending(true)
    try {
      if (voiceSendMode === "now") {
        await sendVoiceMessageNow(CARE_RECEIVER_ID, sender, message)
        closeVoiceModal()
        return
      }
      const scheduledAt = new Date(`${voiceScheduleDate}T${voiceScheduleTime}:00`).toISOString()
      const messageText = `[voice_message] From ${sender}: ${message}`
      await createCalendarItem({
        care_receiver_id: CARE_RECEIVER_ID,
        type: "reminder",
        title: `Voice message from ${sender}`,
        message_text: messageText,
        scheduled_at: scheduledAt,
      })
      await refresh()
      closeVoiceModal()
    } finally {
      setVoiceSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-background pb-6">
      <div className="sticky top-0 z-10 flex flex-col gap-3 border-b border-border bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-foreground">Calendar & Alerts</h1>
          {view === "calendar" && (
            <div className="hidden gap-2 sm:flex">
              <Button size="sm" variant="secondary" onClick={() => setVoiceModalOpen(true)}>
                <Mic className="h-4 w-4 shrink-0" aria-hidden />
                Voice
              </Button>
              <Button size="sm" variant="primary" onClick={() => setReminderModalOpen(true)}>
                <CalendarPlus className="h-4 w-4 shrink-0" aria-hidden />
                Reminder
              </Button>
            </div>
          )}
        </div>
        <div className="flex rounded-lg border border-border p-1 bg-muted/50">
          <button
            onClick={() => setView("calendar")}
            className={cn(
              "h-[44px] min-w-[80px] rounded-md px-3 text-sm font-medium transition-colors",
              view === "calendar" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
            aria-pressed={view === "calendar"}
            aria-label="Grid view"
          >
            Grid
          </button>
          <button
            onClick={() => setView("timeline")}
            className={cn(
              "h-[44px] min-w-[80px] rounded-md px-3 text-sm font-medium transition-colors",
              view === "timeline" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
            aria-pressed={view === "timeline"}
            aria-label="Timeline view"
          >
            Timeline
          </button>
        </div>
      </div>

      {view === "calendar" ? (
        <SeniorCareCalendar className="min-h-[calc(100vh-6rem)]" />
      ) : (
      <div className="mx-auto max-w-2xl px-4 pt-6 sm:px-6">
        <header className="mb-5">
          <p className="text-sm text-muted-foreground">
            {formatLongDate(selectedDate)}
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Button
              size="md"
              variant="secondary"
              className="w-full"
              onClick={() => setVoiceModalOpen(true)}
            >
              <Mic className="h-4 w-4 shrink-0" aria-hidden />
              Direct voice message
            </Button>
            <Button
              size="md"
              variant="primary"
              className="w-full"
              onClick={() => setReminderModalOpen(true)}
            >
              <CalendarPlus className="h-4 w-4 shrink-0" aria-hidden />
              Schedule a reminder
            </Button>
          </div>
        </header>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" aria-hidden />
            <span className="hidden sm:inline">Go to date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-9 rounded-lg border border-input px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>
          <nav className="flex items-center justify-center gap-1 rounded-lg border border-border bg-card p-2 sm:gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelectedDate((d) => addDays(d, -7))} className="shrink-0 gap-1" title="Previous week">
              <ChevronLeft className="h-4 w-4" aria-hidden /> <span className="hidden sm:inline">Week</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={goPrev} className="shrink-0 gap-1" title="Previous day">
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </Button>
            <div
              className={cn(
                "flex min-w-0 max-w-[120px] shrink flex-col items-center justify-center overflow-hidden rounded-lg px-4 py-3 text-center sm:max-w-[140px]",
                isToday(selectedDate)
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground",
              )}
              aria-live="polite"
              aria-label={`Viewing ${formatDayLabel(selectedDate)}`}
              title={formatDayLabel(selectedDate)}
            >
              <span className="w-full truncate text-[10px] font-medium uppercase tracking-wider opacity-80">
                Viewing
              </span>
              <span className="mt-0.5 w-full truncate text-sm font-semibold sm:text-base">
                {formatDayLabel(selectedDate)}
              </span>
              {!isToday(selectedDate) && (
                <button
                  type="button"
                  onClick={goToday}
                  className="mt-2 shrink-0 text-xs font-medium underline hover:no-underline"
                  aria-label="Go to today"
                >
                  Go to today
                </button>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={goNext} className="shrink-0 gap-1" title="Next day">
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedDate((d) => addDays(d, 7))} className="shrink-0 gap-1" title="Next week">
              <span className="hidden sm:inline">Week</span> <ChevronRight className="h-4 w-4" aria-hidden />
            </Button>
          </nav>
        </div>

        {/* Feedback Send now */}
        {sendFeedback === "success" && (
          <div className="mb-4 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-foreground">
            <span className="font-medium">Rappel envoyé au device.</span>{" "}
            <a href="/device" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">
              Ouvrez la vue Device ↗
            </a>{" "}
            pour l&apos;écouter.
          </div>
        )}
        {sendFeedback === "error" && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Échec de l&apos;envoi. Vérifiez que le backend tourne sur {process.env.NEXT_PUBLIC_API_URL ?? "localhost:8000"}.
          </div>
        )}

        {/* Timeline */}
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border sm:left-5" aria-hidden />

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <svg className="h-10 w-10 animate-spin text-primary" fill="none" viewBox="0 0 24 24" aria-hidden>
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            </div>
          ) : (
          <div className="space-y-6">
            {/* Past events */}
            {pastEvents.map((event) => (
              <div key={event.id} className="relative flex gap-4 pl-2 sm:pl-3">
                <div className="absolute left-0 top-6 h-4 w-4 shrink-0 rounded-full bg-muted-foreground sm:left-1" aria-hidden />
                <div className="flex-1 pt-0">
                  <TimelineEventCard
                    event={event}
                    isPast
                    selectedDate={selectedDate}
                    onTriggerNow={handleTriggerNow}
                    onDelete={handleDelete}
                    isTriggering={triggeringId === event.id}
                  />
                </div>
              </div>
            ))}

            {/* Separator: current time */}
            {showNowSeparator && (
              <div className="relative flex gap-3 pl-2 sm:pl-3">
                <div className="absolute left-0 top-4 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-primary bg-card" />
                <div className="flex-1 pt-0">
                  <div className="rounded-lg border border-border bg-muted px-3 py-2">
                    <span className="text-xs font-medium text-foreground">
                      Current time: {nowTime}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Upcoming events */}
            {futureEvents.map((event) => (
              <div key={event.id} className="relative flex gap-4 pl-2 sm:pl-3">
                <div className="absolute left-0 top-6 h-4 w-4 shrink-0 rounded-full bg-primary sm:left-1" aria-hidden />
                <div className="flex-1 pt-0">
                  <TimelineEventCard
                    event={event}
                    isPast={false}
                    selectedDate={selectedDate}
                    onTriggerNow={handleTriggerNow}
                    onDelete={handleDelete}
                    isTriggering={triggeringId === event.id}
                  />
                </div>
              </div>
            ))}

            {pastEvents.length === 0 && futureEvents.length === 0 && (
              <div className="rounded-lg border border-dashed border-border bg-card p-6 text-center">
                <CalendarPlus className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden />
                <p className="mt-3 text-sm font-medium text-foreground">No events on this day</p>
                <p className="mt-1 text-xs text-muted-foreground">Schedule a reminder to keep your loved one reassured.</p>
                <Button size="md" className="mt-4" onClick={() => setReminderModalOpen(true)}>
                  Schedule a reminder
                </Button>
              </div>
            )}
          </div>
          )}
        </div>
      </div>
      )}

      {/* Modal: Direct voice message */}
      <Modal
        open={voiceModalOpen}
        onClose={closeVoiceModal}
        title="Direct voice message"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeVoiceModal}>
              Cancel
            </Button>
            <Button
              onClick={handleSendVoiceMessage}
              loading={voiceSending}
              disabled={!voiceMessage.trim()}
            >
              {voiceSendMode === "now" ? "Send now" : "Schedule message"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {voiceSendMode === "now"
              ? "Your message will be played immediately on your loved one's device. The speaker will say who the message is from."
              : "Schedule a voice message to be played at a specific date and time. The speaker will announce the sender's name before the message."}
          </p>

          <Input
            label="Sender name (read aloud by the device)"
            placeholder="e.g. Marie, Dad, Sophie"
            value={voiceSenderName}
            onChange={(e) => setVoiceSenderName(e.target.value)}
          />

          <Textarea
            label="Message"
            placeholder="e.g. Don't forget to take your pill..."
            value={voiceMessage}
            onChange={(e) => setVoiceMessage(e.target.value)}
            rows={4}
          />

          <div className="space-y-3 rounded-lg border border-gray-200 p-3">
            <span className="text-sm font-medium text-gray-700">When to play</span>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="voiceSendMode"
                  checked={voiceSendMode === "now"}
                  onChange={() => setVoiceSendMode("now")}
                  className="border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">Send now (play immediately)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="voiceSendMode"
                  checked={voiceSendMode === "scheduled"}
                  onChange={() => setVoiceSendMode("scheduled")}
                  className="border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">Schedule for later</span>
              </label>
            </div>
            {voiceSendMode === "scheduled" && (
              <div className="mt-3 flex flex-wrap gap-3">
                <Input
                  label="Date"
                  type="date"
                  value={voiceScheduleDate}
                  onChange={(e) => setVoiceScheduleDate(e.target.value)}
                />
                <Input
                  label="Time"
                  type="time"
                  value={voiceScheduleTime}
                  onChange={(e) => setVoiceScheduleTime(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Modal: Schedule a reminder */}
      <Modal
        open={reminderModalOpen}
        onClose={() => setReminderModalOpen(false)}
        title="Schedule a reminder"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setReminderModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateReminder}
              loading={submitting}
              disabled={!reminderTitle.trim()}
            >
              Create reminder
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Date"
            type="date"
            value={reminderDate}
            onChange={(e) => setReminderDate(e.target.value)}
          />
          <Input
            label="Title"
            placeholder="e.g. Morning medication"
            value={reminderTitle}
            onChange={(e) => setReminderTitle(e.target.value)}
          />
          <Select
            label="Type"
            value={reminderType}
            options={[
              { value: "medication", label: "Medication" },
              { value: "appointment", label: "Medical appointment" },
              { value: "visit", label: "Visit" },
              { value: "voice_message", label: "Voice message" },
              { value: "whatsapp_message", label: "Message WhatsApp" },
            ]}
            onChange={(e) => setReminderType(e.target.value as EventCategory)}
          />
          <Input
            label="Time"
            type="time"
            value={reminderTime}
            onChange={(e) => setReminderTime(e.target.value)}
          />

          {/* Recurrence – customizable */}
          <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-medium text-gray-700">Repeat</label>
              <span className="text-xs text-gray-500">Customize pattern</span>
            </div>
            <Select
              value={repeatRule}
              options={[
                { value: "none", label: "Never (one-time)" },
                { value: "daily", label: "Daily" },
                { value: "weekly", label: "Weekly" },
                { value: "monthly", label: "Monthly" },
                { value: "custom", label: "Custom (every X days)" },
              ]}
              onChange={(e) => setRepeatRule(e.target.value as RepeatRule)}
            />

            {repeatRule === "daily" && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-gray-600">Every</span>
                <select
                  value={repeatInterval}
                  onChange={(e) => setRepeatInterval(Number(e.target.value))}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                    <option key={n} value={n}>{n} {n === 1 ? "day" : "days"}</option>
                  ))}
                </select>
              </div>
            )}

            {repeatRule === "weekly" && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-gray-600">Every</span>
                <select
                  value={repeatInterval}
                  onChange={(e) => setRepeatInterval(Number(e.target.value))}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>{n} {n === 1 ? "week" : "weeks"}</option>
                  ))}
                </select>
                </div>
                <Select
                  label="On weekday"
                  value={repeatOnDay}
                  options={WEEKDAYS}
                  onChange={(e) => setRepeatOnDay(e.target.value)}
                />
              </div>
            )}

            {repeatRule === "monthly" && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-gray-600">Every</span>
                <select
                  value={repeatInterval}
                  onChange={(e) => setRepeatInterval(Number(e.target.value))}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {[1, 2, 3].map((n) => (
                    <option key={n} value={n}>{n} {n === 1 ? "month" : "months"}</option>
                  ))}
                </select>
                </div>
                <div className="space-y-2">
                  <span className="text-sm font-medium text-gray-700">On</span>
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="monthlyKind"
                        checked={monthlyKind === "same_date"}
                        onChange={() => setMonthlyKind("same_date")}
                        className="border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">Same date (e.g. 15th)</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="monthlyKind"
                        checked={monthlyKind === "same_weekday"}
                        onChange={() => setMonthlyKind("same_weekday")}
                        className="border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">Same weekday (e.g. 2nd Tuesday)</span>
                    </label>
                  </div>
                  {monthlyKind === "same_weekday" && (
                    <div className="mt-2 flex flex-wrap gap-3">
                      <Select
                        label="Occurrence in month"
                        value={monthlyOccurrence}
                        options={MONTHLY_OCCURRENCES}
                        onChange={(e) => setMonthlyOccurrence(e.target.value)}
                      />
                      <Select
                        label="Weekday"
                        value={repeatOnDay}
                        options={WEEKDAYS}
                        onChange={(e) => setRepeatOnDay(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {repeatRule === "custom" && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-gray-600">Every</span>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={customRepeatDays}
                  onChange={(e) => setCustomRepeatDays(Math.max(1, Math.min(365, Number(e.target.value) || 1)))}
                  className="w-16 rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-600">day{customRepeatDays !== 1 ? "s" : ""}</span>
              </div>
            )}
          </div>

          <Textarea
            label="Message (optional)"
            placeholder="What will be said when the reminder plays..."
            value={reminderMessage}
            onChange={(e) => setReminderMessage(e.target.value)}
            rows={3}
          />
        </div>
      </Modal>
    </div>
  )
}
