"use client"

import { Search, CalendarDays } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

export type ViewMode = "month" | "week" | "day"

interface DayHeaderProps {
  selectedDate: string
  onToday: () => void
  onTomorrow: () => void
  onThisWeek: () => void
  searchQuery: string
  onSearchChange: (q: string) => void
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
}

export function DayHeader({
  onToday,
  onTomorrow,
  onThisWeek,
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
}: DayHeaderProps) {
  const shortcuts = [
    { label: "Today", onClick: onToday, id: "today" },
    { label: "Tomorrow", onClick: onTomorrow, id: "tomorrow" },
    { label: "This Week", onClick: onThisWeek, id: "this-week" },
  ]

  const views: { label: string; mode: ViewMode }[] = [
    { label: "Month", mode: "month" },
    { label: "Week", mode: "week" },
    { label: "Day", mode: "day" },
  ]

  return (
    <header
      className="sticky top-0 z-20 flex flex-col gap-3 border-b border-border bg-background px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:flex-wrap"
      aria-label="Calendar controls"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <CalendarDays className="h-4 w-4" aria-hidden />
        </span>
        {shortcuts.map(({ label, onClick, id }) => (
          <motion.button
            key={id}
            onClick={onClick}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "flex h-[44px] min-w-[52px] items-center justify-center rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors",
              "hover:border-primary/50 hover:bg-muted focus:outline-none focus:ring-[3px] focus:ring-primary/50",
            )}
            aria-label={`Go to ${label}`}
          >
            {label}
          </motion.button>
        ))}
      </div>

      <div className="relative flex-1 min-w-[200px] sm:max-w-[260px]">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search appointments..."
          aria-label="Search appointments"
          className={cn(
            "h-[44px] w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm text-foreground placeholder-muted-foreground",
            "focus:outline-none focus:ring-[3px] focus:ring-primary/50 focus:border-primary",
          )}
        />
      </div>

      <div className="flex rounded-lg border border-border p-1 bg-muted/50">
        {views.map(({ label, mode }) => (
          <motion.button
            key={mode}
            onClick={() => onViewModeChange(mode)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "h-[40px] min-w-[68px] rounded-md px-3 text-sm font-medium transition-colors",
              viewMode === mode
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
            aria-label={`${label} view`}
            aria-pressed={viewMode === mode}
          >
            {label}
          </motion.button>
        ))}
      </div>
    </header>
  )
}
