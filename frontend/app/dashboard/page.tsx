"use client"

import Link from "next/link"
import { Mic, Brain, Music, Check, Calendar, Wifi } from "lucide-react"

// Mock data — English, realistic
const MOCK = {
  careReceiverName: "Sophie",
  deviceStatus: "connected" as const,
  lastActivity: "Listened to the weather",
  lastActivityAgo: "15 min ago",
  nextEvent: {
    in: "45 min",
    label: "Take midday medication",
    icon: "pill",
  },
  daySummary: {
    stimulation: { label: "Played Bridge", detail: "15 min" },
    entertainment: { label: "Listened to Édith Piaf", detail: "" },
    routines: { done: 2, total: 3, label: "reminders completed" },
  },
}

export default function DashboardHome() {
  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-semibold text-foreground">
          {greeting}, {MOCK.careReceiverName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s how things are going right now.
        </p>
      </header>

      <section
        className="rounded-lg border border-border bg-card p-4"
        aria-label="Device status"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span
              className="flex h-2.5 w-2.5 shrink-0 rounded-full bg-primary"
              aria-hidden
            />
            <div>
              <p className="text-sm font-medium text-foreground">Device connected</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {MOCK.lastActivity} {MOCK.lastActivityAgo}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-primary text-sm font-medium sm:shrink-0">
            <Wifi className="h-4 w-4" aria-hidden />
            Online
          </div>
        </div>
      </section>

      <section aria-label="Quick actions">
        <Link
          href="/dashboard/calendar"
          className="flex items-center justify-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-foreground transition-colors hover:bg-muted"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Mic className="h-4 w-4" strokeWidth={2} aria-hidden />
          </span>
          <span className="text-sm font-medium">Direct voice message</span>
        </Link>
      </section>

      <section aria-label="Next event">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Next event
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                <Calendar className="h-4 w-4 text-primary" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">
                  In {MOCK.nextEvent.in}: {MOCK.nextEvent.label}
                </p>
                <p className="text-xs text-muted-foreground">Scheduled for today</p>
              </div>
            </div>
            <Link
              href="/dashboard/calendar"
              className="ml-auto flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              View agenda
            </Link>
          </div>
        </div>
      </section>

      {/* Day summary — high contrast */}
      <section aria-label="Day summary">
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
                <p className="text-sm font-medium text-foreground">
                  {MOCK.daySummary.stimulation.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {MOCK.daySummary.stimulation.detail}
                </p>
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
                <p className="text-sm font-medium text-foreground">
                  {MOCK.daySummary.entertainment.label}
                </p>
                {MOCK.daySummary.entertainment.detail && (
                  <p className="text-xs text-muted-foreground">
                    {MOCK.daySummary.entertainment.detail}
                  </p>
                )}
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
                <p className="text-sm font-medium text-foreground">
                  {MOCK.daySummary.routines.done}/{MOCK.daySummary.routines.total}{" "}
                  {MOCK.daySummary.routines.label}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
