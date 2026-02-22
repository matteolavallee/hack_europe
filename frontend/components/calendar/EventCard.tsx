"use client"

import { motion } from "framer-motion"
import { Pill, Stethoscope, Users, MessageCircle, ShoppingCart, Calendar, Check, Send, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"
import type { CalendarEvent, EventCategory } from "@/lib/calendar-types"
import { CATEGORY_CONFIG } from "@/lib/calendar-types"

const CATEGORY_ICON: Record<EventCategory, React.ElementType> = {
  medication: Pill,
  appointment: Stethoscope,
  visit: Users,
  voice_message: MessageCircle,
  shopping: ShoppingCart,
  other: Calendar,
}

interface EventCardProps {
  event: CalendarEvent
  onSelect?: (event: CalendarEvent) => void
  onTriggerNow?: (eventId: string) => void
  onDelete?: (eventId: string) => void
  isTriggering?: boolean
}

export function EventCard({ event, onSelect, onTriggerNow, onDelete, isTriggering = false }: EventCardProps) {
  const config = CATEGORY_CONFIG[event.category]
  const Icon = CATEGORY_ICON[event.category]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      whileHover={{ scale: 1.02, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.08)" }}
      className={cn(
        "flex min-h-[56px] cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors",
        "focus-within:ring-[3px] focus-within:ring-primary/50",
        event.isDone
          ? "border-border bg-muted/50 opacity-70"
          : cn("border-border bg-card hover:border-primary/40", config.bg),
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
      aria-label={`${event.title}, ${event.time}, ${config.label}`}
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm",
          event.isDone ? "bg-muted text-muted-foreground" : config.iconBg,
        )}
        aria-hidden
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm font-medium", event.isDone ? "text-muted-foreground line-through" : config.text)}>
          {event.title}
        </p>
        <p className="text-xs text-muted-foreground">{event.time} · {config.label}</p>
        {event.note && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{event.note}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {onTriggerNow && (
          <Button
            size="sm"
            variant="secondary"
            className="h-8 w-8 p-0"
            disabled={isTriggering}
            onClick={(e) => {
              e.stopPropagation()
              onTriggerNow(event.id)
            }}
            aria-label={`Send ${event.title} now`}
            title="Send to device"
          >
            {isTriggering ? (
              <span className="text-[10px]">…</span>
            ) : (
              <Send className="h-3.5 w-3.5" aria-hidden />
            )}
          </Button>
        )}
        {onDelete && (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(event.id)
            }}
            aria-label={`Delete ${event.title}`}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </Button>
        )}
      </div>
      {event.isDone && (
        <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary" aria-label="Done">
          <Check className="h-3.5 w-3.5" aria-hidden />
        </span>
      )}
    </motion.div>
  )
}
