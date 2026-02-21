"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import type { CalendarEvent } from "@/lib/calendar-types"
import { FAMILY_CONFIG } from "@/lib/calendar-types"

interface EventCardProps {
  event: CalendarEvent
  onSelect?: (event: CalendarEvent) => void
}

export function EventCard({ event, onSelect }: EventCardProps) {
  const memberConfig = FAMILY_CONFIG[event.member]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      whileHover={{ scale: 1.02, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.08)" }}
      className={cn(
        "flex min-h-[48px] cursor-pointer items-center gap-3 rounded-lg border border-border bg-card p-3",
        "transition-colors hover:border-primary/50 focus-within:ring-[3px] focus-within:ring-primary/50"
      )}
      onClick={() => onSelect?.(event)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onSelect?.(event)
        }
      }}
      aria-label={`${event.title}, ${event.time}, ${memberConfig.label}`}
    >
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm",
          memberConfig.color
        )}
        aria-hidden
      >
        {memberConfig.emoji}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{event.title}</p>
        <p className="text-xs text-muted-foreground">{event.time}</p>
      </div>
      {event.note && (
        <span className="text-xs text-muted-foreground truncate max-w-[80px]" title={event.note}>
          {event.note}
        </span>
      )}
    </motion.div>
  )
}
