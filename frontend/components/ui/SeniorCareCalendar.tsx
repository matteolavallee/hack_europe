"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"
import { ChevronLeft, ChevronRight, PanelRightClose, PanelRightOpen } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { DayHeader } from "@/components/calendar/DayHeader"
import { CalendarGrid } from "@/components/calendar/CalendarGrid"
import { EventSidebar } from "@/components/calendar/EventSidebar"
import { useCalendarItems } from "@/hooks/useCalendarItems"
import { triggerCalendarItemNow, deleteCalendarItem, CARE_RECEIVER_ID } from "@/lib/api"
import type { CalendarEvent, ViewMode, EventCategory } from "@/lib/calendar-types"
import type { CalendarItem } from "@/lib/types"

// ─── Mapping API → CalendarEvent ─────────────────────────────────────────────

function calendarItemToEvent(item: CalendarItem): CalendarEvent {
  let category: EventCategory = "other"

  if (item.type === "audio_push") {
    category = "voice_message"
  } else if (item.type === "whatsapp_prompt") {
    category = "voice_message"
  } else if (item.message_text) {
    const match = item.message_text.match(/^\[(medication|appointment|visit|voice_message|shopping)\]/i)
    if (match) category = match[1].toLowerCase() as EventCategory
  }

  const d = new Date(item.scheduled_at)
  const date = d.toLocaleDateString("en-CA") // YYYY-MM-DD
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })

  const rawNote = item.message_text?.replace(/^\[[\w_]+\]\s*/, "").trim()

  return {
    id: item.id,
    title: item.title,
    note: rawNote || undefined,
    date,
    time,
    category,
    member: "family",
    isDone: item.status !== "scheduled",
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function addDays(dateStr: string, delta: number): string {
  const d = new Date(dateStr + "T12:00:00")
  d.setDate(d.getDate() + delta)
  return d.toISOString().slice(0, 10)
}

function getMondayOfWeek(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00")
  const day = d.getDay()
  const diff = (day + 6) % 7
  d.setDate(d.getDate() - diff)
  return d.toISOString().slice(0, 10)
}

// ─── Component ────────────────────────────────────────────────────────────────

interface SeniorCareCalendarProps {
  className?: string
}

export function SeniorCareCalendar({ className }: SeniorCareCalendarProps) {
  const { items, loading, refresh } = useCalendarItems()
  const [selectedDate, setSelectedDate] = useState(getTodayDate())
  const [triggeringId, setTriggeringId] = useState<string | null>(null)

  const [sendFeedback, setSendFeedback] = useState<"success" | "error" | null>(null)

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
      // Error handled by UI feedback if needed
    }
  }
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<ViewMode>("day")
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const events: CalendarEvent[] = useMemo(() => items.map(calendarItemToEvent), [items])

  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return events
    const q = searchQuery.toLowerCase()
    return events.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (e.note?.toLowerCase().includes(q) ?? false),
    )
  }, [events, searchQuery])

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {}
    filteredEvents.forEach((e) => {
      if (!map[e.date]) map[e.date] = []
      map[e.date].push(e)
    })
    return map
  }, [filteredEvents])

  const selectedDateEvents = eventsByDate[selectedDate] ?? []

  const goToday = () => setSelectedDate(getTodayDate())
  const goTomorrow = () => setSelectedDate(addDays(getTodayDate(), 1))
  const goThisWeek = () => setSelectedDate(getMondayOfWeek(getTodayDate()))

  const goPrev = () => {
    if (viewMode === "month") {
      const d = new Date(selectedDate + "T12:00:00")
      d.setMonth(d.getMonth() - 1)
      setSelectedDate(d.toISOString().slice(0, 10))
    } else if (viewMode === "week") {
      setSelectedDate(addDays(selectedDate, -7))
    } else {
      setSelectedDate(addDays(selectedDate, -1))
    }
  }

  const goNext = () => {
    if (viewMode === "month") {
      const d = new Date(selectedDate + "T12:00:00")
      d.setMonth(d.getMonth() + 1)
      setSelectedDate(d.toISOString().slice(0, 10))
    } else if (viewMode === "week") {
      setSelectedDate(addDays(selectedDate, 7))
    } else {
      setSelectedDate(addDays(selectedDate, 1))
    }
  }

  const headerLabel =
    viewMode === "month"
      ? new Date(selectedDate + "T12:00:00").toLocaleDateString("en-GB", {
          month: "long",
          year: "numeric",
        })
      : viewMode === "week"
        ? (() => {
            const monday = getMondayOfWeek(selectedDate)
            const sunday = addDays(monday, 6)
            const monD = new Date(monday + "T12:00:00")
            const sunD = new Date(sunday + "T12:00:00")
            return `${monD.getDate()}–${sunD.getDate()} ${sunD.toLocaleDateString("en-GB", { month: "short" })} ${sunD.getFullYear()}`
          })()
        : new Date(selectedDate + "T12:00:00").toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })

  const navLabel =
    viewMode === "month"
      ? { prev: "Previous month", next: "Next month" }
      : viewMode === "week"
        ? { prev: "Previous week", next: "Next week" }
        : { prev: "Previous day", next: "Next day" }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn("flex flex-col bg-background", className)}
      role="application"
      aria-label={`Family Calendar — ${headerLabel}`}
    >
      <DayHeader
        selectedDate={selectedDate}
        onToday={goToday}
        onTomorrow={goTomorrow}
        onThisWeek={goThisWeek}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Chargement initial */}
      {loading && (
        <div className="flex items-center justify-center py-10">
          <svg className="h-8 w-8 animate-spin text-primary" fill="none" viewBox="0 0 24 24" aria-hidden>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span className="ml-3 text-sm text-muted-foreground">Loading…</span>
        </div>
      )}

      {!loading && (
        <div className="flex flex-1 overflow-hidden">
          {/* Grille principale */}
          <div className="flex flex-1 flex-col overflow-auto p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold capitalize text-foreground" id="calendar-title">
                {headerLabel}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={goPrev}
                  className="flex h-[44px] w-[44px] items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-muted focus:outline-none focus:ring-[3px] focus:ring-primary/50"
                  aria-label={navLabel.prev}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={goNext}
                  className="flex h-[44px] w-[44px] items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-muted focus:outline-none focus:ring-[3px] focus:ring-primary/50"
                  aria-label={navLabel.next}
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="flex h-[44px] w-[44px] items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-muted focus:outline-none focus:ring-[3px] focus:ring-primary/50"
                  aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
                >
                  {sidebarOpen ? (
                    <PanelRightClose className="h-5 w-5" aria-hidden />
                  ) : (
                    <PanelRightOpen className="h-5 w-5" aria-hidden />
                  )}
                </button>
              </div>
            </div>

            <CalendarGrid
              viewMode={viewMode}
              selectedDate={selectedDate}
              eventsByDate={eventsByDate}
              onSelectDate={setSelectedDate}
            />
          </div>

          {/* Panneau latéral */}
          {sidebarOpen && (
            <EventSidebar
              selectedDate={selectedDate}
              events={selectedDateEvents}
              onAddEvent={() => {}}
              onEventAdded={refresh}
              onTriggerNow={handleTriggerNow}
              onDelete={handleDelete}
              onClose={() => setSidebarOpen(false)}
              isMobile={false}
              triggeringId={triggeringId}
              sendFeedback={sendFeedback}
            />
          )}
        </div>
      )}
    </motion.div>
  )
}
