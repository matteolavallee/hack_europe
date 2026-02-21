"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import type { CalendarEvent, ViewMode } from "@/lib/calendar-types"
import { FAMILY_CONFIG } from "@/lib/calendar-types"
import { EventCard } from "./EventCard"

interface CalendarGridProps {
  viewMode: ViewMode
  selectedDate: string
  eventsByDate: Record<string, CalendarEvent[]>
  onSelectDate: (date: string) => void
  onSelectEvent?: (event: CalendarEvent) => void
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

function getDaysInMonth(dateStr: string): Array<{ date: string; isCurrentMonth: boolean }> {
  const d = new Date(dateStr + "T12:00:00")
  const year = d.getFullYear()
  const month = d.getMonth()
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const startPad = (first.getDay() + 6) % 7
  const endPad = 6 - last.getDay()
  const days: Array<{ date: string; isCurrentMonth: boolean }> = []

  for (let i = 0; i < startPad; i++) {
    const prev = new Date(year, month, -startPad + i + 1)
    const y = prev.getFullYear()
    const m = String(prev.getMonth() + 1).padStart(2, "0")
    const day = String(prev.getDate()).padStart(2, "0")
    days.push({ date: `${y}-${m}-${day}`, isCurrentMonth: false })
  }
  for (let i = 1; i <= last.getDate(); i++) {
    const padded = String(i).padStart(2, "0")
    const monthPadded = String(month + 1).padStart(2, "0")
    days.push({ date: `${year}-${monthPadded}-${padded}`, isCurrentMonth: true })
  }
  for (let i = 0; i < endPad; i++) {
    const next = new Date(year, month + 1, i + 1)
    const y = next.getFullYear()
    const m = String(next.getMonth() + 1).padStart(2, "0")
    const day = String(next.getDate()).padStart(2, "0")
    days.push({ date: `${y}-${m}-${day}`, isCurrentMonth: false })
  }
  return days
}

function isToday(dateStr: string): boolean {
  return dateStr === new Date().toISOString().slice(0, 10)
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
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-2">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-7">
        {days.map(({ date, isCurrentMonth }, idx) => {
          const events = eventsByDate[date] ?? []
          const selected = date === selectedDate
          return (
            <motion.div
              key={`${idx}-${date}`}
              role="gridcell"
              aria-selected={selected}
              whileHover={{ scale: 1.02 }}
              className={cn(
                "flex min-h-[90px] flex-col rounded-lg border p-2.5 transition-colors sm:min-h-[110px]",
                selected
                  ? "border-primary bg-primary/5 ring-[3px] ring-primary/30"
                  : "border-border bg-card hover:border-primary/30 hover:bg-muted/50"
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
                  "text-sm font-medium",
                  isCurrentMonth ? "text-foreground" : "text-muted-foreground",
                  isToday(date) && "text-primary font-semibold"
                )}
              >
                {new Date(date + "T12:00:00").getDate()}
              </span>
              <div className="mt-1 flex flex-col gap-1 overflow-hidden">
                {events.slice(0, 2).map((ev) => (
                  <span
                    key={ev.id}
                    className={cn("truncate rounded px-1 py-0.5 text-[10px] font-medium", FAMILY_CONFIG[ev.member].color)}
                    title={ev.title}
                  >
                    {ev.title}
                  </span>
                ))}
                {events.length > 2 && (
                  <span className="text-[10px] text-muted-foreground">+{events.length - 2}</span>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </>
  )
}

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
    <div className="grid grid-cols-7 gap-2">
      {WEEKDAYS.map((dayName, i) => (
        <div key={dayName} className="text-center text-xs font-medium text-muted-foreground">
          {dayName}
        </div>
      ))}
      {weekDays.map((date) => {
        const events = eventsByDate[date] ?? []
        const selected = date === selectedDate
        const dayNum = new Date(date + "T12:00:00").getDate()
        return (
          <motion.div
            key={date}
            role="gridcell"
            aria-selected={selected}
            whileHover={{ scale: 1.01 }}
            className={cn(
              "flex min-h-[140px] flex-col rounded-lg border p-3 transition-colors",
              selected
                ? "border-primary bg-primary/5 ring-[3px] ring-primary/30"
                : "border-border bg-card hover:border-primary/30 hover:bg-muted/50"
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
                "text-sm font-semibold",
                isToday(date) && "text-primary"
              )}
            >
              {dayNum}
            </span>
            <div className="mt-2 flex flex-col gap-1.5 overflow-y-auto">
              {events.slice(0, 4).map((ev) => (
                <span
                  key={ev.id}
                  className={cn(
                    "truncate rounded px-1.5 py-1 text-[11px] font-medium",
                    FAMILY_CONFIG[ev.member].color
                  )}
                  title={ev.title}
                >
                  {ev.time} {ev.title}
                </span>
              ))}
              {events.length > 4 && (
                <span className="text-[10px] text-muted-foreground">+{events.length - 4}</span>
              )}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

function DayView({
  selectedDate,
  eventsByDate,
}: {
  selectedDate: string
  eventsByDate: Record<string, CalendarEvent[]>
}) {
  const events = [...(eventsByDate[selectedDate] ?? [])].sort((a, b) =>
    a.time.localeCompare(b.time)
  )
  const dayLabel = new Date(selectedDate + "T12:00:00").toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-4 text-base font-semibold text-foreground">{dayLabel}</h3>
      {events.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No activities scheduled for this day.
        </p>
      ) : (
        <div className="space-y-2">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  )
}

export function CalendarGrid({
  viewMode,
  selectedDate,
  eventsByDate,
  onSelectDate,
}: CalendarGridProps) {
  const ariaLabel =
    viewMode === "month"
      ? `Calendar for ${new Date(selectedDate + "T12:00:00").toLocaleDateString("en-GB", { month: "long", year: "numeric" })}`
      : viewMode === "week"
        ? `Week view`
        : `Day view - ${new Date(selectedDate + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long" })}`

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
