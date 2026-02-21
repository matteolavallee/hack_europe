"use client"

import { useState, useMemo } from "react"
import { motion } from "framer-motion"
import { ChevronLeft, ChevronRight, PanelRightClose, PanelRightOpen } from "lucide-react"
import { cn } from "@/lib/utils"
import { DayHeader } from "@/components/calendar/DayHeader"
import { CalendarGrid } from "@/components/calendar/CalendarGrid"
import { EventSidebar } from "@/components/calendar/EventSidebar"
import type { CalendarEvent, ViewMode } from "@/lib/calendar-types"

// Demo data: doctor appointments, family events, shopping
const DEMO_EVENTS: CalendarEvent[] = [
  { id: "1", title: "Doctor appointment", date: "2026-02-23", time: "10:00", category: "appointment", member: "doctor", note: "Annual checkup" },
  { id: "2", title: "Take medication", date: "2026-02-22", time: "08:00", category: "medication", member: "mom" },
  { id: "3", title: "Family visit", date: "2026-02-22", time: "14:00", category: "visit", member: "family", note: "Sophie coming" },
  { id: "4", title: "Grocery shopping", date: "2026-02-24", time: "09:30", category: "shopping", member: "dad" },
  { id: "5", title: "Physiotherapy", date: "2026-02-25", time: "11:00", category: "appointment", member: "doctor" },
  { id: "6", title: "Voice message from Dad", date: "2026-02-21", time: "18:00", category: "voice_message", member: "dad", isDone: true },
  { id: "7", title: "Medication reminder", date: "2026-02-21", time: "12:00", category: "medication", member: "mom", isDone: true },
]

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

interface SeniorCareCalendarProps {
  className?: string
  events?: CalendarEvent[]
  onAddEvent?: (event: Omit<CalendarEvent, "id">) => void
}

export function SeniorCareCalendar({
  className,
  events: externalEvents,
  onAddEvent,
}: SeniorCareCalendarProps) {
  const [events, setEvents] = useState<CalendarEvent[]>(externalEvents ?? DEMO_EVENTS)
  const [selectedDate, setSelectedDate] = useState(getTodayDate())
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<ViewMode>("month")
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const handleAddEvent = (event: Omit<CalendarEvent, "id">) => {
    const newEvent: CalendarEvent = {
      ...event,
      id: `ev-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    }
    setEvents((prev) => [...prev, newEvent])
    onAddEvent?.(event)
  }

  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return events
    const q = searchQuery.toLowerCase()
    return events.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (e.note?.toLowerCase().includes(q) ?? false)
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn("flex flex-col bg-background", className)}
      role="application"
      aria-label={`Family Calendar - ${headerLabel}`}
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

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col overflow-auto p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground" id="calendar-title">
              {headerLabel}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={goPrev}
                className="flex h-[52px] w-[52px] items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-muted focus:outline-none focus:ring-[3px] focus:ring-primary/50"
                aria-label={
                  viewMode === "month"
                    ? "Previous month"
                    : viewMode === "week"
                      ? "Previous week"
                      : "Previous day"
                }
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={goNext}
                className="flex h-[52px] w-[52px] items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-muted focus:outline-none focus:ring-[3px] focus:ring-primary/50"
                aria-label={
                  viewMode === "month"
                    ? "Next month"
                    : viewMode === "week"
                      ? "Next week"
                      : "Next day"
                }
              >
                <ChevronRight className="h-6 w-6" />
              </button>
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="flex h-[52px] w-[52px] items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-muted focus:outline-none focus:ring-[3px] focus:ring-primary/50"
                aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
              >
                {sidebarOpen ? (
                  <PanelRightClose className="h-6 w-6" aria-hidden />
                ) : (
                  <PanelRightOpen className="h-6 w-6" aria-hidden />
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

        {sidebarOpen && (
          <EventSidebar
            selectedDate={selectedDate}
            events={selectedDateEvents}
            onAddEvent={handleAddEvent}
            onClose={() => setSidebarOpen(false)}
            isMobile={false}
          />
        )}
      </div>
    </motion.div>
  )
}
