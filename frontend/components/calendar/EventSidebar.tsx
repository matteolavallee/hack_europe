"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/Button"
import { Input, Select } from "@/components/ui/Input"
import { EventCard } from "./EventCard"
import type { CalendarEvent, FamilyMember, EventCategory } from "@/lib/calendar-types"
import { FAMILY_CONFIG, CATEGORY_LABELS } from "@/lib/calendar-types"

interface EventSidebarProps {
  selectedDate: string
  events: CalendarEvent[]
  onAddEvent: (event: Omit<CalendarEvent, "id">) => void
  onClose?: () => void
  isMobile?: boolean
}

const MEMBER_OPTIONS: { value: FamilyMember; label: string }[] = [
  { value: "mom", label: "Mom" },
  { value: "dad", label: "Dad" },
  { value: "doctor", label: "Doctor" },
  { value: "family", label: "Family" },
]

const CATEGORY_OPTIONS: { value: EventCategory; label: string }[] = [
  { value: "appointment", label: "Doctor" },
  { value: "medication", label: "Medication" },
  { value: "visit", label: "Visit" },
  { value: "shopping", label: "Shopping" },
  { value: "voice_message", label: "Voice message" },
  { value: "other", label: "Other" },
]

function formatSidebarDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
}

export function EventSidebar({
  selectedDate,
  events,
  onAddEvent,
  onClose,
  isMobile = false,
}: EventSidebarProps) {
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState("")
  const [note, setNote] = useState("")
  const [time, setTime] = useState("09:00")
  const [category, setCategory] = useState<EventCategory>("appointment")
  const [member, setMember] = useState<FamilyMember>("mom")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    onAddEvent({
      title: title.trim(),
      note: note.trim() || undefined,
      date: selectedDate,
      time,
      category,
      member,
    })
    setTitle("")
    setNote("")
    setTime("09:00")
    setCategory("appointment")
    setMember("mom")
    setShowForm(false)
  }

  const sortedEvents = [...events].sort((a, b) => a.time.localeCompare(b.time))

  return (
    <motion.aside
      initial={isMobile ? { x: "100%" } : false}
      animate={{ x: 0 }}
      exit={isMobile ? { x: "100%" } : undefined}
      className={cn(
        "flex flex-col border-l border-border bg-card",
        isMobile ? "fixed inset-y-0 right-0 z-30 w-full max-w-md" : "w-80 shrink-0"
      )}
      aria-label={`Events for ${formatSidebarDate(selectedDate)}`}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-base font-semibold text-foreground">
          {formatSidebarDate(selectedDate)}
        </h2>
        {isMobile && onClose && (
          <button
            onClick={onClose}
            className="flex h-[52px] w-[52px] items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-[3px] focus:ring-primary/50"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="popLayout">
          {sortedEvents.length === 0 && !showForm ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-muted-foreground"
            >
              No events for this day.
            </motion.p>
          ) : (
            <div className="space-y-2">
              {sortedEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </AnimatePresence>

        {showForm ? (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSubmit}
            className="mt-4 space-y-3 rounded-lg border border-border bg-muted/50 p-4"
          >
            <h3 className="text-sm font-semibold text-foreground">New Appointment</h3>
            <Input
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Doctor visit"
              required
            />
            <Select
              label="Type"
              options={CATEGORY_OPTIONS}
              value={category}
              onChange={(e) => setCategory(e.target.value as EventCategory)}
            />
            <Select
              label="Member"
              options={MEMBER_OPTIONS}
              value={member}
              onChange={(e) => setMember(e.target.value as FamilyMember)}
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="h-10 w-full rounded-lg border border-input px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <Input
              label="Note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note..."
            />
            <div className="flex gap-2">
              <Button type="submit" size="md">
                Add
              </Button>
              <Button type="button" variant="secondary" size="md" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </motion.form>
        ) : (
          <Button
            variant="secondary"
            size="md"
            className="mt-4 w-full"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-5 w-5 shrink-0" aria-hidden />
            New Appointment
          </Button>
        )}
      </div>
    </motion.aside>
  )
}
