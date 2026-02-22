"use client"

import { useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import type { CalendarEvent, ViewMode } from "@/lib/calendar-types"
import { CATEGORY_CONFIG } from "@/lib/calendar-types"
import { EventCard } from "./EventCard"

interface CalendarGridProps {
  viewMode: ViewMode
  selectedDate: string
  eventsByDate: Record<string, CalendarEvent[]>
  onSelectDate: (date: string) => void
  onSelectEvent?: (event: CalendarEvent) => void
}

const WEEKDAYS_FR = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function isToday(dateStr: string): boolean {
  return dateStr === getTodayDate()
}

function getMondayOfWeek(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00")
  const day = d.getDay()
  const diff = (day + 6) % 7
  d.setDate(d.getDate() - diff)
  return d.toISOString().slice(0, 10)
}

function getWeekDays(dateStr: string): string[] {
  const monday = getMondayOfWeek(dateStr)
  const days: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday + "T12:00:00")
    d.setDate(d.getDate() + i)
    days.push(d.toISOString().slice(0, 10))
  }
  return days
}

function getDaysInMonth(dateStr: string): Array<{ date: string; isCurrentMonth: boolean }> {
  const d = new Date(dateStr + "T12:00:00")
  const year = d.getFullYear()
  const month = d.getMonth()
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const startPad = (first.getDay() + 6) % 7
  const endPad = (7 - ((startPad + last.getDate()) % 7)) % 7
  const days: Array<{ date: string; isCurrentMonth: boolean }> = []

  for (let i = 0; i < startPad; i++) {
    const prev = new Date(year, month, -startPad + i + 1)
    days.push({
      date: prev.toISOString().slice(0, 10),
      isCurrentMonth: false,
    })
  }
  for (let i = 1; i <= last.getDate(); i++) {
    const day = new Date(year, month, i)
    days.push({ date: day.toISOString().slice(0, 10), isCurrentMonth: true })
  }
  for (let i = 0; i < endPad; i++) {
    const next = new Date(year, month + 1, i + 1)
    days.push({ date: next.toISOString().slice(0, 10), isCurrentMonth: false })
  }
  return days
}

// ─── Month View ───────────────────────────────────────────────────────────────

function MonthView({
  selectedDate,
  eventsByDate,
  onSelectDate,
}: {
  selectedDate: string
  eventsByDate: Record<string, CalendarEvent[]>
  onSelectDate: (date: string) => void
}) {
  const days = getDaysInMonth(selectedDate)
  return (
    <>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
        {WEEKDAYS_FR.map((d) => (
          <div key={d} className="py-2">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map(({ date, isCurrentMonth }, idx) => {
          const events = eventsByDate[date] ?? []
          const selected = date === selectedDate
          const today = isToday(date)
          return (
            <motion.div
              key={`${idx}-${date}`}
              role="gridcell"
              aria-selected={selected}
              whileHover={{ scale: 1.02 }}
              className={cn(
                "flex min-h-[80px] flex-col rounded-lg border p-2 transition-colors cursor-pointer sm:min-h-[100px]",
                selected
                  ? "border-primary bg-primary/5 ring-[2px] ring-primary/30"
                  : today
                    ? "border-primary/50 bg-primary/5"
                    : "border-border bg-card hover:border-primary/30 hover:bg-muted/50",
                !isCurrentMonth && "opacity-40",
              )}
              tabIndex={0}
              onClick={() => onSelectDate(date)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  onSelectDate(date)
                }
              }}
            >
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                  today
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground",
                )}
              >
                {new Date(date + "T12:00:00").getDate()}
              </span>
              <div className="mt-1 flex flex-col gap-0.5 overflow-hidden">
                {events.slice(0, 2).map((ev) => (
                  <span
                    key={ev.id}
                    className={cn(
                      "truncate rounded px-1 py-0.5 text-[10px] font-medium",
                      CATEGORY_CONFIG[ev.category].pill,
                    )}
                    title={ev.title}
                  >
                    {ev.title}
                  </span>
                ))}
                {events.length > 2 && (
                  <span className="text-[10px] font-medium text-muted-foreground">
                    +{events.length - 2} more
                  </span>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </>
  )
}

// ─── Week View ────────────────────────────────────────────────────────────────

function WeekView({
  selectedDate,
  eventsByDate,
  onSelectDate,
}: {
  selectedDate: string
  eventsByDate: Record<string, CalendarEvent[]>
  onSelectDate: (date: string) => void
}) {
  const weekDays = getWeekDays(selectedDate)
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAYS_FR.map((dayName) => (
          <div key={dayName} className="text-center text-xs font-medium text-muted-foreground py-1">
            {dayName}
          </div>
        ))}
        {weekDays.map((date) => {
          const events = eventsByDate[date] ?? []
          const selected = date === selectedDate
          const today = isToday(date)
          const dayNum = new Date(date + "T12:00:00").getDate()
          return (
            <motion.div
              key={date}
              role="gridcell"
              aria-selected={selected}
              whileHover={{ scale: 1.01 }}
              className={cn(
                "flex min-h-[130px] flex-col rounded-lg border p-2.5 transition-colors cursor-pointer",
                selected
                  ? "border-primary bg-primary/5 ring-[2px] ring-primary/30"
                  : today
                    ? "border-primary/50 bg-primary/5"
                    : "border-border bg-card hover:border-primary/30 hover:bg-muted/50",
              )}
              tabIndex={0}
              onClick={() => onSelectDate(date)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  onSelectDate(date)
                }
              }}
            >
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold",
                  today ? "bg-primary text-primary-foreground" : "text-foreground",
                )}
              >
                {dayNum}
              </span>
              <div className="mt-1.5 flex flex-col gap-1 overflow-y-auto">
                {events.slice(0, 3).map((ev) => (
                  <span
                    key={ev.id}
                    className={cn(
                      "truncate rounded px-1.5 py-0.5 text-[10px] font-medium",
                      CATEGORY_CONFIG[ev.category].pill,
                    )}
                    title={ev.title}
                  >
                    {ev.time} {ev.title}
                  </span>
                ))}
                {events.length > 3 && (
                  <span className="text-[10px] text-muted-foreground">+{events.length - 3}</span>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Day View (timeline horaire) ─────────────────────────────────────────────

const HOUR_START = 7
const HOUR_END = 22

function DayView({
  selectedDate,
  eventsByDate,
}: {
  selectedDate: string
  eventsByDate: Record<string, CalendarEvent[]>
}) {
  const events = [...(eventsByDate[selectedDate] ?? [])].sort((a, b) =>
    a.time.localeCompare(b.time),
  )
  const nowRef = useRef<HTMLDivElement>(null)
  const today = isToday(selectedDate)
  const now = new Date()
  const nowHour = now.getHours()
  const nowMin = now.getMinutes()

  useEffect(() => {
    if (today && nowRef.current) {
      nowRef.current.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }, [today, selectedDate])

  const dayLabel = new Date(selectedDate + "T12:00:00").toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i)

  function getEventsForHour(hour: number): CalendarEvent[] {
    return events.filter((ev) => {
      const h = parseInt(ev.time.split(":")[0], 10)
      return h === hour
    })
  }

  const hasAnyEvent = events.length > 0
  const nowIsInRange = today && nowHour >= HOUR_START && nowHour < HOUR_END

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="border-b border-border bg-muted/30 px-4 py-3">
        <h3 className="text-sm font-semibold capitalize text-foreground">{dayLabel}</h3>
        {!hasAnyEvent && (
          <p className="mt-0.5 text-xs text-muted-foreground">No events scheduled</p>
        )}
      </div>

      <div className="relative divide-y divide-border/50">
        {hours.map((hour) => {
          const hourEvents = getEventsForHour(hour)
          const isNowHour = today && nowHour === hour
          const showNowLine = nowIsInRange && isNowHour
          const nowPct = (nowMin / 60) * 100

          return (
            <div key={hour} className="relative flex min-h-[52px] gap-3 px-4 py-2">
              {/* Heure */}
              <div className="w-12 shrink-0 pt-0.5">
                <span className={cn("text-xs font-medium tabular-nums", isNowHour ? "text-primary font-semibold" : "text-muted-foreground")}>
                  {String(hour).padStart(2, "0")}:00
                </span>
              </div>

              {/* Ligne "maintenant" */}
              {showNowLine && (
                <div
                  ref={nowRef}
                  className="pointer-events-none absolute left-0 right-0 z-10 flex items-center gap-1"
                  style={{ top: `${nowPct}%` }}
                >
                  <div className="h-2 w-2 shrink-0 rounded-full bg-red-500 ml-14" />
                  <div className="h-px flex-1 bg-red-400" />
                  <span className="pr-3 text-[10px] font-semibold text-red-500">
                    {String(nowHour).padStart(2, "0")}:{String(nowMin).padStart(2, "0")}
                  </span>
                </div>
              )}

              {/* Événements */}
              <div className="flex flex-1 flex-col gap-1.5">
                {hourEvents.map((ev) => {
                  const config = CATEGORY_CONFIG[ev.category]
                  return (
                    <div
                      key={ev.id}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-3 py-2",
                        ev.isDone ? "bg-muted/60 opacity-70" : config.bg,
                      )}
                    >
                      <span className={cn("shrink-0 text-xs font-semibold tabular-nums", ev.isDone ? "text-muted-foreground" : config.text)}>
                        {ev.time}
                      </span>
                      <span className={cn("flex-1 truncate text-sm font-medium", ev.isDone ? "text-muted-foreground line-through" : config.text)}>
                        {ev.title}
                      </span>
                      {ev.isDone && (
                        <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                          Done
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────

export function CalendarGrid({
  viewMode,
  selectedDate,
  eventsByDate,
  onSelectDate,
}: CalendarGridProps) {
  const ariaLabel =
    viewMode === "month"
      ? `Calendar — ${new Date(selectedDate + "T12:00:00").toLocaleDateString("en-GB", { month: "long", year: "numeric" })}`
      : viewMode === "week"
        ? "Week view"
        : `Day view — ${new Date(selectedDate + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long" })}`

  return (
    <motion.div
      key={viewMode}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col gap-2"
      role="grid"
      aria-label={ariaLabel}
    >
      {viewMode === "month" && (
        <MonthView selectedDate={selectedDate} eventsByDate={eventsByDate} onSelectDate={onSelectDate} />
      )}
      {viewMode === "week" && (
        <WeekView selectedDate={selectedDate} eventsByDate={eventsByDate} onSelectDate={onSelectDate} />
      )}
      {viewMode === "day" && (
        <DayView selectedDate={selectedDate} eventsByDate={eventsByDate} />
      )}
    </motion.div>
  )
}
