"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, X, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/Button"
import { Input, Select } from "@/components/ui/Input"
import { EventCard } from "./EventCard"
import { createCalendarItem, CARE_RECEIVER_ID } from "@/lib/api"
import type { CalendarEvent, FamilyMember, EventCategory } from "@/lib/calendar-types"
import { CATEGORY_LABELS } from "@/lib/calendar-types"
import type { CalendarItemType } from "@/lib/types"

interface EventSidebarProps {
  selectedDate: string
  events: CalendarEvent[]
  onAddEvent: (event: Omit<CalendarEvent, "id">) => void
  onEventAdded?: () => void
  onTriggerNow?: (eventId: string) => void
  onDelete?: (eventId: string) => void
  onClose?: () => void
  isMobile?: boolean
  triggeringId?: string | null
  sendFeedback?: "success" | "error" | null
}

const MEMBER_OPTIONS: { value: FamilyMember; label: string }[] = [
  { value: "mom", label: "Mom" },
  { value: "dad", label: "Dad" },
  { value: "doctor", label: "Doctor" },
  { value: "family", label: "Family" },
]

const CATEGORY_OPTIONS: { value: EventCategory; label: string }[] = [
  { value: "medication", label: CATEGORY_LABELS.medication },
  { value: "appointment", label: CATEGORY_LABELS.appointment },
  { value: "visit", label: CATEGORY_LABELS.visit },
  { value: "voice_message", label: CATEGORY_LABELS.voice_message },
  { value: "shopping", label: CATEGORY_LABELS.shopping },
  { value: "other", label: CATEGORY_LABELS.other },
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
  onEventAdded,
  onTriggerNow,
  onDelete,
  onClose,
  isMobile = false,
  triggeringId = null,
  sendFeedback = null,
}: EventSidebarProps) {
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState("")
  const [note, setNote] = useState("")
  const [time, setTime] = useState("09:00")
  const [category, setCategory] = useState<EventCategory>("appointment")
  const [member, setMember] = useState<FamilyMember>("family")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setSubmitting(true)
    setError(null)

    try {
      const scheduledAt = new Date(`${selectedDate}T${time}:00`).toISOString()
      const messageText = note.trim() ? `[${category}] ${note.trim()}` : `[${category}]`
      const itemType: CalendarItemType =
        category === "voice_message" ? "audio_push" : "reminder"

      await createCalendarItem({
        care_receiver_id: CARE_RECEIVER_ID,
        type: itemType,
        title: title.trim(),
        message_text: messageText,
        scheduled_at: scheduledAt,
      })

      onAddEvent({ title: title.trim(), note: note.trim() || undefined, date: selectedDate, time, category, member })
      onEventAdded?.()

      setTitle("")
      setNote("")
      setTime("09:00")
      setCategory("appointment")
      setMember("family")
      setShowForm(false)
    } catch {
      setError("Failed to add event. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const sortedEvents = [...events].sort((a, b) => a.time.localeCompare(b.time))

  return (
    <motion.aside
      initial={isMobile ? { x: "100%" } : false}
      animate={{ x: 0 }}
      exit={isMobile ? { x: "100%" } : undefined}
      className={cn(
        "flex flex-col border-l border-border bg-card",
        isMobile ? "fixed inset-y-0 right-0 z-30 w-full max-w-md" : "w-80 shrink-0",
      )}
      aria-label={`Events — ${formatSidebarDate(selectedDate)}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold capitalize text-foreground">
            {formatSidebarDate(selectedDate)}
          </h2>
          <p className="text-xs text-muted-foreground">
            {sortedEvents.length === 0 ? "No events" : `${sortedEvents.length} event${sortedEvents.length > 1 ? "s" : ""}`}
          </p>
        </div>
        {isMobile && onClose && (
          <button
            onClick={onClose}
            className="flex h-[44px] w-[44px] items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-[3px] focus:ring-primary/50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="popLayout">
          {sortedEvents.length === 0 && !showForm ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-4 text-center text-sm text-muted-foreground"
            >
              No events for this day.
              <br />
              <span className="text-xs">Click &quot;Add&quot; to schedule one.</span>
            </motion.p>
          ) : (
            <div className="space-y-2">
              {sendFeedback === "success" && (
                <p className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-foreground">
                  Sent to device.{" "}
                  <a href="/device" target="_blank" rel="noopener noreferrer" className="underline">
                    Open Device view ↗
                  </a>
                </p>
              )}
              {sendFeedback === "error" && (
                <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  Failed to send. Check the backend.
                </p>
              )}
              {sortedEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onTriggerNow={onTriggerNow}
                  onDelete={onDelete}
                  isTriggering={triggeringId === event.id}
                />
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
            <h3 className="text-sm font-semibold text-foreground">New Event</h3>

            <Input
              label="Title *"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Doctor visit"
              required
            />

            <Select
              label="Category"
              options={CATEGORY_OPTIONS}
              value={category}
              onChange={(e) => setCategory(e.target.value as EventCategory)}
            />

            <Select
              label="Person"
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

            {error && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            )}

            <div className="flex gap-2">
              <Button type="submit" size="md" disabled={submitting || !title.trim()}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Adding…
                  </>
                ) : (
                  "Add"
                )}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => { setShowForm(false); setError(null) }}
                disabled={submitting}
              >
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
            <Plus className="h-4 w-4 shrink-0" aria-hidden />
            Add Event
          </Button>
        )}
      </div>
    </motion.aside>
  )
}
