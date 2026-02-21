import { cn } from "@/lib/utils"
import type { EventType } from "@/lib/types"

interface BadgeProps {
  children: React.ReactNode
  variant?: "default" | "success" | "warning" | "danger" | "info" | "neutral"
  className?: string
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  const variants = {
    default: "bg-muted text-foreground",
    success: "bg-accent text-accent-foreground",
    warning: "bg-muted text-accent-foreground",
    danger: "bg-destructive/20 text-destructive",
    info: "bg-accent/50 text-accent-foreground",
    neutral: "bg-muted text-muted-foreground",
  }

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}

// Maps event type → badge variant for the timeline
export function eventVariant(type: EventType): BadgeProps["variant"] {
  if (
    type === "reminder_confirmed" ||
    type === "audio_played" ||
    type === "exercise_completed"
  )
    return "success"
  if (
    type === "reminder_postponed" ||
    type === "audio_postponed" ||
    type === "reminder_no_response"
  )
    return "warning"
  if (type === "reminder_escalated" || type === "help_requested")
    return "danger"
  if (type === "caregiver_notified") return "danger"
  return "info"
}

// Human-readable event label
export function eventLabel(type: EventType): string {
  const labels: Record<EventType, string> = {
    reminder_created: "Reminder created",
    reminder_delivered: "Reminder delivered",
    reminder_confirmed: "Confirmed ✓",
    reminder_postponed: "Postponed",
    reminder_no_response: "No response",
    reminder_escalated: "Escalated ⚠",
    audio_uploaded: "Audio uploaded",
    audio_queued: "Audio queued",
    audio_played: "Audio played ✓",
    audio_postponed: "Audio postponed",
    exercise_started: "Exercise started",
    exercise_completed: "Exercise completed ✓",
    help_requested: "Help requested",
    caregiver_notified: "Caregiver notified 🔔",
  }
  return labels[type] ?? type
}
