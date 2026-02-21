"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Home, Calendar, Brain, Music, Settings } from "lucide-react"

// 4 main sections (Zero stress, lifeline)
const MAIN_NAV = [
  {
    label: "Home",
    labelShort: "Home",
    href: "/dashboard",
    icon: Home,
    description: "Overview & reassurance",
  },
  {
    label: "Calendar & Alerts",
    labelShort: "Calendar",
    href: "/dashboard/calendar",
    icon: Calendar,
    description: "Reminders, appointments, routines",
  },
  {
    label: "Health & Stimulation",
    labelShort: "Health",
    href: "/dashboard/health",
    icon: Brain,
    description: "Games, cognitive follow-up",
  },
  {
    label: "Media & Family",
    labelShort: "Media",
    href: "/dashboard/content",
    icon: Music,
    description: "Music, family messages",
  },
]

export function DashboardNav() {
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href)

  return (
    <nav className="flex flex-col gap-0.5 px-2">
      {MAIN_NAV.map((item) => {
        const active = isActive(item.href)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-muted text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
            <span className="hidden lg:inline">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

export function BottomNav() {
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href)

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-border bg-background/95 py-3 backdrop-blur-sm md:hidden"
      aria-label="Main navigation"
    >
      {MAIN_NAV.map((item) => {
        const active = isActive(item.href)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center gap-1 min-h-[56px] min-w-[56px] px-3 py-2 transition-colors rounded-lg",
              active ? "text-primary font-medium" : "text-muted-foreground",
            )}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
            <span className="text-xs">{item.labelShort}</span>
          </Link>
        )
      })}
    </nav>
  )
}

export { MAIN_NAV }