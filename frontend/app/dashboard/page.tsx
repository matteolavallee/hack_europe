"use client"

import useSWR from "swr"
import { DemoPanel } from "@/components/dashboard/DemoPanel"
import { Card, CardHeader } from "@/components/ui/Card"
import { Badge, eventLabel, eventVariant } from "@/components/ui/Badge"
import { Skeleton } from "@/components/ui/Skeleton"
import { relativeTime, formatTime } from "@/lib/utils"
import { useCalendarItems } from "@/hooks/useCalendarItems"
import { useTimeline } from "@/hooks/useTimeline"
import { getCareReceiver, CARE_RECEIVER_ID } from "@/lib/api"

export default function DashboardHome() {
  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"

  const { items, loading: itemsLoading } = useCalendarItems()
  const { events, loading: eventsLoading } = useTimeline(50)
  const { data: careReceiver } = useSWR(
    "care-receiver",
    () => getCareReceiver(CARE_RECEIVER_ID),
  )

  const upcoming = items
    .filter((i) => i.status === "scheduled")
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
    .slice(0, 3)

  const lastConfirmed = events.find((e) => e.type === "reminder_confirmed")

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{greeting} 👋</h1>
        <p className="mt-1 text-gray-500">
          Monitoring{" "}
          {careReceiver ? (
            <span className="font-medium text-gray-700">{careReceiver.name}</span>
          ) : (
            <Skeleton className="inline-block w-16 h-4 align-middle" />
          )}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card padding="sm">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
            Upcoming today
          </p>
          {itemsLoading ? (
            <Skeleton className="mt-1 h-8 w-12" />
          ) : (
            <p className="mt-1 text-3xl font-bold text-gray-900">{upcoming.length}</p>
          )}
        </Card>

        <Card padding="sm">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
            Events logged
          </p>
          {eventsLoading ? (
            <Skeleton className="mt-1 h-8 w-12" />
          ) : (
            <p className="mt-1 text-3xl font-bold text-gray-900">{events.length}</p>
          )}
        </Card>

        <Card padding="sm">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
            Last confirmed
          </p>
          {eventsLoading ? (
            <Skeleton className="mt-1 h-5 w-20" />
          ) : (
            <p className="mt-1 text-sm font-semibold text-green-600">
              {relativeTime(
                lastConfirmed?.created_at ?? new Date().toISOString(),
              )}
            </p>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Upcoming events */}
        <Card>
          <CardHeader title="Upcoming" subtitle="Next scheduled events" />

          {itemsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="flex items-start gap-3">
                  <Skeleton className="w-8 h-8 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : upcoming.length === 0 ? (
            <p className="text-sm text-gray-400">Nothing scheduled</p>
          ) : (
            <ul className="space-y-3">
              {upcoming.map((item) => (
                <li key={item.id} className="flex items-start gap-3">
                  <div className="mt-0.5 w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                    {item.type === "reminder" ? (
                      <svg
                        className="w-4 h-4 text-indigo-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-4 h-4 text-indigo-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                        />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{item.title}</p>
                    <p className="text-xs text-gray-400">{formatTime(item.scheduled_at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Recent activity */}
        <Card>
          <CardHeader title="Recent Activity" subtitle="Last logged events" />

          {eventsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="flex items-center gap-3">
                  <Skeleton className="h-5 w-28 rounded-full" />
                  <Skeleton className="h-3 w-12 ml-auto" />
                </div>
              ))}
            </div>
          ) : events.length === 0 ? (
            <p className="text-sm text-gray-400">No events yet</p>
          ) : (
            <ul className="space-y-3">
              {events.map((ev) => (
                <li key={ev.id} className="flex items-center gap-3">
                  <Badge variant={eventVariant(ev.type)}>{eventLabel(ev.type)}</Badge>
                  <span className="text-xs text-gray-400 ml-auto shrink-0">
                    {relativeTime(ev.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Demo panel */}
      <DemoPanel />
    </div>
  )
}
