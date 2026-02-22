"use client"

import Link from "next/link"
import { Mic, Brain, Music, Check, Calendar, Wifi, WifiOff, Loader2, Pill, Stethoscope, Users, MessageCircle } from "lucide-react"
import { useCalendarItems } from "@/hooks/useCalendarItems"
import type { CalendarItem } from "@/lib/types"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

function getNextEvent(items: CalendarItem[]): CalendarItem | null {
  const now = new Date()
  const upcoming = items
    .filter((item) => item.status === "scheduled" && new Date(item.scheduled_at) > now)
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
  return upcoming[0] ?? null
}

function formatRelativeTime(iso: string): string {
  const now = new Date()
  const target = new Date(iso)
  const diffMs = target.getTime() - now.getTime()
  const diffMin = Math.round(diffMs / 60000)
  const diffHrs = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHrs / 24)

  if (diffMin < 1) return "now"
  if (diffMin < 60) return `in ${diffMin} min`
  if (diffHrs < 24) return `in ${diffHrs}h`
  if (diffDays === 1) return "tomorrow"
  return `in ${diffDays} days`
}

function getCategoryFromItem(item: CalendarItem): { label: string; Icon: React.ElementType; colorClass: string } {
  if (item.type === "audio_push") return { label: "Voice message", Icon: MessageCircle, colorClass: "text-purple-600" }
  if (item.type === "whatsapp_prompt") return { label: "WhatsApp", Icon: MessageCircle, colorClass: "text-green-600" }
  if (item.message_text) {
    if (item.message_text.includes("[medication]")) return { label: "Medication", Icon: Pill, colorClass: "text-red-600" }
    if (item.message_text.includes("[appointment]")) return { label: "Appointment", Icon: Stethoscope, colorClass: "text-blue-600" }
    if (item.message_text.includes("[visit]")) return { label: "Visit", Icon: Users, colorClass: "text-green-600" }
  }
  return { label: "Reminder", Icon: Calendar, colorClass: "text-primary" }
}

function formatEventTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
}

function formatEventDate(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  if (d.toDateString() === today.toDateString()) return "Today"
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow"
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })
}

// ─── Composant ───────────────────────────────────────────────────────────────

const PATIENT_NAME = "Sophie"

export default function DashboardHome() {
  const { items, loading } = useCalendarItems()
  const nextEvent = getNextEvent(items)

  return (
    <div className="space-y-5">
      {/* Header */}
      <header>
        <h1 className="text-xl font-semibold text-foreground">
          {getGreeting()} — {PATIENT_NAME}&apos;s care
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s how things are going right now.
        </p>
      </header>

      {/* Device status */}
      <section
        className="rounded-lg border border-border bg-card p-4"
        aria-label="Device status"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-2.5 w-2.5 shrink-0 rounded-full bg-primary animate-pulse" aria-hidden />
            <div>
              <p className="text-sm font-medium text-foreground">Device connected</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Last activity 15 min ago
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-primary text-sm font-medium sm:shrink-0">
            <Wifi className="h-4 w-4" aria-hidden />
            Online
          </div>
        </div>
      </section>

      {/* Quick action */}
      <section aria-label="Quick action">
        <Link
          href="/dashboard/calendar"
          className="flex items-center justify-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-foreground transition-colors hover:bg-muted"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Mic className="h-4 w-4" strokeWidth={2} aria-hidden />
          </span>
          <span className="text-sm font-medium">Send a voice message now</span>
        </Link>
      </section>

      {/* Next event */}
      <section aria-label="Next event">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Next event
          </p>

          {loading ? (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Loading…
            </div>
          ) : nextEvent ? (() => {
            const { label, Icon, colorClass } = getCategoryFromItem(nextEvent)
            return (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                    <Icon className={`h-4 w-4 ${colorClass}`} aria-hidden />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {formatRelativeTime(nextEvent.scheduled_at)} — {nextEvent.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatEventDate(nextEvent.scheduled_at)} at {formatEventTime(nextEvent.scheduled_at)} · {label}
                    </p>
                  </div>
                </div>
                <Link
                  href="/dashboard/calendar"
                  className="ml-auto flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  View agenda
                </Link>
              </div>
            )
          })() : (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">No upcoming events.</p>
              <Link
                href="/dashboard/calendar"
                className="flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Schedule
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Daily summary */}
      <section aria-label="Daily summary">
        <h2 className="mb-3 text-sm font-semibold text-foreground">
          Today&apos;s summary
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                <Brain className="h-4 w-4 text-primary" aria-hidden />
              </span>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Stimulation
                </p>
                <p className="text-sm font-medium text-foreground">Played Bridge</p>
                <p className="text-xs text-muted-foreground">15 min</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                <Music className="h-4 w-4 text-primary" aria-hidden />
              </span>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Entertainment
                </p>
                <p className="text-sm font-medium text-foreground">Listened to Édith Piaf</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                <Check className="h-4 w-4 text-primary" aria-hidden />
              </span>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Routines
                </p>
                {loading ? (
                  <p className="text-sm text-muted-foreground">…</p>
                ) : (
                  <p className="text-sm font-medium text-foreground">
                    {items.filter(i => i.status !== "scheduled").length}/{items.length} reminders done
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
