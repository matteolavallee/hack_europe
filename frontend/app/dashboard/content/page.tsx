"use client"

import { useState } from "react"
import { Clock, Music, BookOpen, Plus, Play, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

// Mock data — realistic
const MOCK = {
  routines: [
    { id: "1", time: "14:00 - Nap", action: "Suggest an audiobook", icon: "book", enabled: true },
    { id: "2", time: "09:00 - Coffee", action: "Suggest music", icon: "music", enabled: true },
    { id: "3", time: "19:00 - Dinner", action: "Suggest soft music", icon: "music", enabled: false },
  ],
  music: [
    { id: "1", title: "Édith Piaf Classics", color: "bg-rose-300" },
    { id: "2", title: "Gentle Piano", color: "bg-amber-200" },
    { id: "3", title: "French Songs 60s", color: "bg-sky-300" },
    { id: "4", title: "Bach - Concertos", color: "bg-violet-200" },
  ],
  audiobooks: [
    { id: "1", title: "The Little Prince", color: "bg-amber-400", chapter: 3, progress: 45 },
    { id: "2", title: "The Count of Monte Cristo", color: "bg-slate-400", chapter: 12, progress: 78 },
    { id: "3", title: "Les Misérables", color: "bg-emerald-400", chapter: 1, progress: 5 },
  ],
}

function RoutineIcon({ icon }: { icon: string }) {
  if (icon === "book") return <BookOpen className="h-4 w-4 text-primary" aria-hidden />
  return <Music className="h-4 w-4 text-primary" aria-hidden />
}

export default function MediaPage() {
  const [routines, setRoutines] = useState(MOCK.routines)

  const toggleRoutine = (id: string) => {
    setRoutines((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)),
    )
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-semibold text-foreground">
          Media & Pleasure
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage music, audiobooks, and daily listening routines.
        </p>
      </header>

      <section aria-label="Listening routines">
        <h2 className="mb-3 text-sm font-semibold text-foreground">
          Listening routines
        </h2>
        <div className="space-y-3">
          {routines.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-4"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Clock className="h-4 w-4 text-primary" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{r.time}</p>
                <p className="text-xs text-muted-foreground">{r.action}</p>
              </div>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                <RoutineIcon icon={r.icon} />
              </span>
              <label className="relative inline-flex min-h-[48px] min-w-[72px] cursor-pointer items-center shrink-0 justify-end">
                <input
                  type="checkbox"
                  checked={r.enabled}
                  onChange={() => toggleRoutine(r.id)}
                  className="peer sr-only"
                />
                <div className="peer h-9 w-14 rounded-full bg-input after:absolute after:left-[3px] after:top-1/2 after:h-7 after:w-7 after:-translate-y-1/2 after:rounded-full after:bg-card after:shadow-sm after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-5" />
              </label>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/80"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
          Create a routine
        </button>
      </section>

      {/* Section 2: Music Library */}
      <section aria-label="Music">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Music</h2>
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <div className="flex gap-4 pb-2 sm:flex-wrap sm:pb-0">
            {MOCK.music.map((m) => (
              <div
                key={m.id}
                className="flex w-36 shrink-0 flex-col rounded-lg border border-border bg-card p-4 sm:w-40"
              >
                <div
                  className={cn(
                    "aspect-square w-full rounded-xl flex items-center justify-center",
                    m.color,
                  )}
                >
                  <Play className="h-10 w-10 text-white/90" fill="currentColor" aria-hidden />
                </div>
                <p className="mt-3 truncate text-sm font-medium text-foreground">
                  {m.title}
                </p>
                <div className="mt-3 flex gap-3">
                  <button
                    type="button"
                    className="flex min-h-[48px] min-w-[48px] items-center justify-center rounded-xl text-foreground hover:bg-muted"
                    aria-label="Play"
                  >
                    <Play className="h-6 w-6" />
                  </button>
                  <button
                    type="button"
                    className="flex min-h-[48px] min-w-[48px] items-center justify-center rounded-xl text-destructive hover:bg-destructive/20"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-6 w-6" />
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              className="flex min-h-[72px] w-40 shrink-0 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted py-10 text-base font-semibold text-foreground transition-colors hover:bg-accent sm:w-44"
            >
              <Plus className="h-12 w-12 mb-2" strokeWidth={2} aria-hidden />
              Add music
            </button>
          </div>
        </div>
      </section>

      {/* Section 3: Audiobooks */}
      <section aria-label="Audiobooks">
        <h2 className="mb-3 text-sm font-semibold text-foreground">
          Audiobooks
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {MOCK.audiobooks.map((ab) => (
            <div
              key={ab.id}
              className="rounded-lg border border-border bg-card p-4"
            >
              <div className="flex gap-4">
                <div
                  className={cn(
                    "h-24 w-20 shrink-0 rounded-xl",
                    ab.color,
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{ab.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Chapter {ab.chapter} - {ab.progress}%
                  </p>
                  <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${ab.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
          <button
            type="button"
            className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted py-8 text-sm font-medium text-foreground transition-colors hover:bg-muted/80"
          >
            <Plus className="h-12 w-12 mb-2" strokeWidth={2} aria-hidden />
            Add audiobook
          </button>
        </div>
      </section>
    </div>
  )
}
