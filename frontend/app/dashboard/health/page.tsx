"use client"

import { useState } from "react"
import {
  Brain,
  Ear,
  Heart,
  Smile,
  Plus,
  Sparkles,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"

// Mock data — realistic, warm
const MOCK = {
  careReceiverName: "Mizou",
  exercisesToday: 2,
  recentActivities: [
    {
      id: "1",
      title: "The Parrot Game",
      subtitle: "Short-term memory",
      time: "10:00 AM",
      score: null,
      icon: "ear",
      badge: "Great",
    },
    {
      id: "2",
      title: "Family Trivia",
      subtitle: "Reminiscence",
      time: "2:30 PM",
      score: "4/5 correct",
      icon: "heart",
      badge: "Great",
    },
    {
      id: "3",
      title: "Word Association",
      subtitle: "Fluency",
      time: "4:15 PM",
      score: null,
      icon: "brain",
      badge: "Nice",
    },
  ],
  difficultyLevel: "normal" as "relaxed" | "normal" | "stimulating",
  personalizedFacts: [
    { id: "1", label: "Great-grandson's name", value: "Léo" },
    { id: "2", label: "Door code", value: "1234" },
    { id: "3", label: "Favorite singer", value: "Edith Piaf" },
    { id: "4", label: "Pet's name", value: "Minou" },
    { id: "5", label: "Hometown", value: "Lyon" },
  ],
}

const DIFFICULTY_OPTIONS = [
  { value: "relaxed", label: "Relaxed", emoji: "😌", description: "Gentle pace, no pressure" },
  { value: "normal", label: "Normal", emoji: "🙂", description: "Balanced challenge" },
  { value: "stimulating", label: "Stimulating", emoji: "💪", description: "More engaging activities" },
] as const

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
  >(MOCK.difficultyLevel)

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-semibold text-foreground">
          Cognitive & Health
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitor stimulation and personalize the AI&apos;s knowledge.
        </p>
      </header>

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
              {MOCK.careReceiverName} is doing great!
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              She completed {MOCK.exercisesToday} memory exercise
              {MOCK.exercisesToday !== 1 ? "s" : ""} today.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Recent Activity Summary */}
      <section aria-label="Recent activity">
        <h2 className="mb-3 text-sm font-semibold text-foreground">
          Recent Activity
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MOCK.recentActivities.map((activity) => {
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
                    <span className="text-base font-medium text-muted-foreground">
                      Played at {activity.time}
                    </span>
                    {activity.score && (
                      <span className="rounded-full bg-primary/20 px-3 py-1 text-sm font-semibold text-primary">
                        {activity.score}
                      </span>
                    )}
                    <span className="rounded-full bg-muted px-3 py-1 text-sm font-semibold text-foreground">
                      {activity.badge}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
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
          {MOCK.personalizedFacts.map((fact) => (
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
          className="mt-4 flex w-full items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/80"
        >
          <Plus className="h-6 w-6" strokeWidth={2.5} aria-hidden />
          Add a new memory or fact
        </button>
      </section>
    </div>
  )
}
