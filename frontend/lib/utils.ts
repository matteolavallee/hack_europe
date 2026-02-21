export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ")
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function relativeTime(iso: string): string {
  const now = Date.now()
  const then = new Date(iso).getTime()
  const diffMs = now - then
  const diffMin = Math.round(diffMs / 60000)
  const diffHrs = Math.round(diffMs / 3600000)

  if (Math.abs(diffMs) < 60000) return "just now"
  if (diffMin > 0 && diffMin < 60) return `${diffMin}m ago`
  if (diffMin < 0 && diffMin > -60) return `in ${Math.abs(diffMin)}m`
  if (diffHrs > 0 && diffHrs < 24) return `${diffHrs}h ago`
  if (diffHrs < 0 && diffHrs > -24) return `in ${Math.abs(diffHrs)}h`
  return formatDate(iso)
}

export function toLocalDatetimeInput(iso?: string): string {
  const d = iso ? new Date(iso) : new Date()
  // format: YYYY-MM-DDTHH:mm
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function fromLocalDatetimeInput(localStr: string): string {
  return new Date(localStr).toISOString()
}
