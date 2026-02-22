"use client"

import { useState, useMemo } from "react"
import useSWR from "swr"
import {
  Brain,
  Ear,
  Heart,
  Smile,
  Plus,
  Sparkles,
  ChevronRight,
  Gamepad2,
  MessageCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/Button"
import {
  getCareReceiver,
  triggerSuggestion,
  CARE_RECEIVER_ID,
} from "@/lib/api"
import { useTimeline } from "@/hooks/useTimeline"
import type { CareLoopEvent } from "@/lib/types"

const FALLBACK_ACTIVITIES = [
  { id: "f1", title: "The Parrot Game", subtitle: "Short-term memory", icon: "ear" as const },
  { id: "f2", title: "Family Trivia", subtitle: "Reminiscence", icon: "heart" as const },
  { id: "f3", title: "Word Association", subtitle: "Fluency", icon: "brain" as const },
]

const DIFFICULTY_OPTIONS = [
  { value: "relaxed", label: "Relaxed", emoji: "😌", description: "Gentle pace, no pressure" },
  { value: "normal", label: "Normal", emoji: "🙂", description: "Balanced challenge" },
  { value: "stimulating", label: "Stimulating", emoji: "💪", description: "More engaging activities" },
] as const

const GAME_EVENT_TYPES = ["exercise_completed", "exercise_started", "audio_played"] as const

const PERSONALIZED_FACTS = [
  { id: "1", label: "Great-grandson's name", value: "Léo" },
  { id: "2", label: "Door code", value: "1234" },
  { id: "3", label: "Favorite singer", value: "Edith Piaf" },
  { id: "4", label: "Pet's name", value: "Minou" },
  { id: "5", label: "Hometown", value: "Lyon" },
]

function eventToActivity(ev: CareLoopEvent): {
  id: string
  title: string
  subtitle: string
  time: string
  score: string | null
  icon: "ear" | "heart" | "brain"
} {
  const d = new Date(ev.created_at)
  const time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
  if (ev.type === "exercise_completed" || ev.type === "exercise_started") {
    const score = ev.payload?.score != null && ev.payload?.total != null
      ? `${ev.payload.score}/${ev.payload.total}`
      : null
    return {
      id: ev.id,
      title: "Brain exercise",
      subtitle: ev.type === "exercise_completed" ? "Completed" : "Started",
      time,
      score,
      icon: "brain",
    }
  }
  if (ev.type === "audio_played") {
    const title = (ev.payload?.title as string) || "Audio message"
    return {
      id: ev.id,
      title,
      subtitle: "Listening",
      time,
      score: null,
      icon: "heart",
    }
  }
  return {
    id: ev.id,
    title: "Activity",
    subtitle: ev.type,
    time,
    score: null,
    icon: "brain",
  }
}

function getActivityIcon(icon: string) {
  switch (icon) {
    case "ear":
      return Ear
    case "heart":
      return Heart
    default:
      return Brain
  }
}

export default function HealthPage() {
  const [selectedDifficulty, setSelectedDifficulty] = useState<
    "relaxed" | "normal" | "stimulating"
  >("normal")
  const [triggerLoading, setTriggerLoading] = useState<"exercise" | "message" | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const { data: careReceiver } = useSWR(["care-receiver", CARE_RECEIVER_ID], () =>
    getCareReceiver(CARE_RECEIVER_ID),
  )
  const { events, loading: eventsLoading, refresh } = useTimeline(30)

  const careReceiverName = careReceiver?.name ?? "Your loved one"
  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const gameEvents = useMemo(
    () =>
      events.filter((e) =>
        GAME_EVENT_TYPES.includes(e.type as (typeof GAME_EVENT_TYPES)[number]),
      ),
    [events],
  )
  const exercisesToday = useMemo(
    () =>
      gameEvents.filter(
        (e) =>
          e.type === "exercise_completed" &&
          e.created_at.startsWith(today),
      ).length,
    [gameEvents, today],
  )
  const recentActivities = useMemo(() => {
    const fromEvents = gameEvents.slice(0, 6).map(eventToActivity)
    if (fromEvents.length >= 3) return fromEvents
    return [
      ...fromEvents,
      ...FALLBACK_ACTIVITIES.slice(0, 3 - fromEvents.length).map((f) => ({
        id: `fallback-${f.id}`,
        title: f.title,
        subtitle: f.subtitle,
        time: "—",
        score: null as string | null,
        icon: f.icon,
      })),
    ]
  }, [gameEvents])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const handleTriggerExercise = async () => {
    setTriggerLoading("exercise")
    try {
      await triggerSuggestion(CARE_RECEIVER_ID, "exercise")
      showToast("Exercise suggested on device!")
      refresh()
    } catch {
      showToast("Failed to send. Try again.")
    } finally {
      setTriggerLoading(null)
    }
  }

  const handleTriggerMessage = async () => {
    setTriggerLoading("message")
    try {
      await triggerSuggestion(CARE_RECEIVER_ID, "message")
      showToast("Audio message suggested on device!")
      refresh()
    } catch {
      showToast("Failed to send. Try again.")
    } finally {
      setTriggerLoading(null)
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-semibold text-foreground">
          Cognitive & Health
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitor stimulation and send games or messages to the device.
        </p>
      </header>

      {toast && (
        <div
          role="status"
          className="fixed bottom-4 right-4 z-50 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg"
        >
          {toast}
        </div>
      )}

      {/* Quick actions — send to device */}
      <section aria-label="Quick actions">
        <h2 className="mb-3 text-sm font-semibold text-foreground">
          Send to device
        </h2>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="primary"
            size="md"
            onClick={handleTriggerExercise}
            loading={triggerLoading === "exercise"}
            className="min-h-[48px] gap-2"
          >
            <Gamepad2 className="h-5 w-5 shrink-0" aria-hidden />
            Suggest an exercise
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={handleTriggerMessage}
            loading={triggerLoading === "message"}
            className="min-h-[48px] gap-2"
          >
            <MessageCircle className="h-5 w-5 shrink-0" aria-hidden />
            Suggest an audio message
          </Button>
        </div>
      </section>

      <div
        className="rounded-lg border border-border bg-card px-4 py-4"
        aria-label="Reassurance"
      >
        <div className="flex items-start gap-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Smile className="h-4 w-4 text-primary" aria-hidden />
          </span>
          <div>
            <p className="text-lg font-semibold text-foreground">
              {careReceiverName} is doing great!
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {exercisesToday > 0
                ? `${exercisesToday} memory exercise${exercisesToday !== 1 ? "s" : ""} completed today.`
                : "No exercises completed today yet. Send one from above!"}
            </p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <section aria-label="Recent activity">
        <h2 className="mb-3 text-sm font-semibold text-foreground">
          Recent activity
        </h2>
        {eventsLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recentActivities.map((activity) => {
              const Icon = getActivityIcon(activity.icon)
              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 rounded-lg border border-border bg-card p-4"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Icon className="h-4 w-4 text-primary" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{activity.title}</p>
                    <p className="text-xs text-muted-foreground">{activity.subtitle}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {activity.time}
                      </span>
                      {activity.score && (
                        <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-semibold text-primary">
                          {activity.score}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* 3. Difficulty & Pacing Control — min 48px touch targets */}
      <section aria-label="Difficulty and pacing">
        <h2 className="mb-3 text-sm font-semibold text-foreground">
          Difficulty & Pacing
        </h2>
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
          {DIFFICULTY_OPTIONS.map((option) => {
            const isSelected = selectedDifficulty === option.value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setSelectedDifficulty(option.value)}
                className={cn(
                  "flex flex-1 items-center gap-3 rounded-lg border border-border px-4 py-3 text-left transition-colors sm:min-w-[140px]",
                  isSelected
                    ? "border-primary bg-primary/5 text-foreground"
                    : "bg-card text-foreground hover:bg-muted",
                )}
              >
                <span className="text-2xl" aria-hidden>
                  {option.emoji}
                </span>
                <div>
                  <p className="text-sm font-medium">{option.label}</p>
                  <p className="text-xs text-muted-foreground">{option.description}</p>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* 4. Personalization Hub */}
      <section aria-label="Customize memory games">
        <h2 className="mb-3 text-sm font-semibold text-foreground">
          Customize the Memory Games
        </h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Add personal facts so the AI can use them in Reminiscence Therapy and
          Spaced Retrieval games.
        </p>

        <div className="space-y-4">
          {PERSONALIZED_FACTS.map((fact) => (
            <div
              key={fact.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Sparkles className="h-4 w-4 text-primary" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{fact.label}</p>
                <p className="text-xs text-muted-foreground">{fact.value}</p>
              </div>
              <ChevronRight className="h-6 w-6 shrink-0 text-muted-foreground" aria-hidden />
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => showToast("Personalization coming soon.")}
          className="mt-4 flex w-full min-h-[48px] items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/80"
        >
          <Plus className="h-6 w-6" strokeWidth={2.5} aria-hidden />
          Add a new memory or fact
        </button>
      </section>
    </div>
  )
}
