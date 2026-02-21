"use client"

import { useState } from "react"
import { useTimeline } from "@/hooks/useTimeline"
import { Badge, eventLabel, eventVariant } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { relativeTime, formatDateTime } from "@/lib/utils"
import type { CareLoopEvent } from "@/lib/types"

// ─── Filter config ─────────────────────────────────────────────────────────────

type FilterTab = "all" | "reminders" | "audio" | "exercise" | "escalations"

const TABS: { id: FilterTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "reminders", label: "Reminders" },
  { id: "audio", label: "Audio" },
  { id: "exercise", label: "Exercise" },
  { id: "escalations", label: "Escalations" },
]

const ESCALATION_TYPES = new Set(["reminder_escalated", "caregiver_notified", "help_requested"])

function matchesFilter(event: CareLoopEvent, filter: FilterTab): boolean {
  switch (filter) {
    case "all":
      return true
    case "reminders":
      return event.type.startsWith("reminder_")
    case "audio":
      return event.type.startsWith("audio_")
    case "exercise":
      return event.type.startsWith("exercise_")
    case "escalations":
      return ESCALATION_TYPES.has(event.type)
    default:
      return true
  }
}

// ─── Dot colour per badge variant ─────────────────────────────────────────────

const DOT_COLOR: Record<string, string> = {
  success: "bg-green-500",
  warning: "bg-amber-400",
  danger: "bg-red-500",
  info: "bg-blue-400",
  default: "bg-indigo-400",
  neutral: "bg-gray-400",
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function TimelinePage() {
  const { events, loading, error, refresh } = useTimeline(100)
  const [filter, setFilter] = useState<FilterTab>("all")
  const [refreshing, setRefreshing] = useState(false)

  const sorted = [...events].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
  const filtered = sorted.filter((ev) => matchesFilter(ev, filter))

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await refresh()
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Timeline</h1>
          <p className="mt-1 text-gray-500">Full event history — updates every 5 seconds</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Live pill */}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Live
          </span>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            loading={refreshing}
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-0 border-b border-gray-200 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={[
              "px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px",
              filter === tab.id
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <svg className="animate-spin h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <svg
                className="w-4 h-4 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            </div>
            <p className="text-sm text-red-600">Failed to load timeline events. Please refresh.</p>
          </div>
        </Card>
      )}

      {/* Event list */}
      {!loading && !error && (
        <Card padding="none">
          {filtered.length === 0 ? (
            <div className="text-center py-16 px-6">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gray-50 flex items-center justify-center">
                <svg
                  className="w-7 h-7 text-gray-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p className="text-gray-500 font-medium">No events yet</p>
              <p className="text-sm text-gray-400 mt-1">
                {filter === "all"
                  ? "Events will appear here as Simone interacts with her device"
                  : `No ${filter} events recorded yet`}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {filtered.map((ev) => {
                const variant = eventVariant(ev.type)
                const dotColor = DOT_COLOR[variant ?? "info"] ?? DOT_COLOR.info

                return (
                  <li
                    key={ev.id}
                    className="flex items-start gap-4 px-6 py-4 hover:bg-gray-50/70 transition-colors"
                  >
                    {/* Coloured dot */}
                    <div className="mt-[5px] shrink-0">
                      <div className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={variant}>{eventLabel(ev.type)}</Badge>
                        {ev.payload.title && (
                          <span className="text-sm text-gray-600">
                            — {String(ev.payload.title)}
                          </span>
                        )}
                        {ev.payload.score !== undefined && (
                          <span className="text-sm text-gray-600">
                            Score: {String(ev.payload.score)}/{String(ev.payload.total)}
                          </span>
                        )}
                        {ev.payload.channel && (
                          <span className="text-sm text-gray-500">
                            via {String(ev.payload.channel)}
                          </span>
                        )}
                        {ev.payload.attempts !== undefined && (
                          <span className="text-sm text-gray-500">
                            {String(ev.payload.attempts)} attempt
                            {Number(ev.payload.attempts) !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Time */}
                    <time
                      className="shrink-0 text-xs text-gray-400 cursor-default pt-0.5"
                      dateTime={ev.created_at}
                      title={formatDateTime(ev.created_at)}
                    >
                      {relativeTime(ev.created_at)}
                    </time>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      )}
    </div>
  )
}
