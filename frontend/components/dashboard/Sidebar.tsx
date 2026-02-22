"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Heart, Settings, Smartphone } from "lucide-react"
import { DashboardNav } from "./DashboardNav"

export function Sidebar() {
  const pathname = usePathname()
  const isSettingsActive = pathname.startsWith("/dashboard/settings")

  return (
    <aside
      className="hidden md:flex w-56 shrink-0 flex-col border-r border-border bg-background"
      style={{ minHeight: "100dvh" }}
    >
      <div className="px-4 py-5 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="flex items-center justify-center">
            <img src="/logo.svg" alt="Ancrage Logo" className="h-8 w-auto" />
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">Ancrage</p>
            <p className="text-xs text-muted-foreground">Cognitive Compass</p>
          </div>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto py-3">
        <DashboardNav />
      </div>

      <div className="space-y-0.5 border-t border-border px-2 py-3">
        <Link
          href="/dashboard/settings"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            isSettingsActive
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <Settings className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
          <span className="hidden lg:inline">Settings</span>
        </Link>
        <a
          href="/device"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title="Ouvre l'appareil du bénéficiaire (rappels, musique)"
        >
          <Smartphone className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
          <span className="hidden lg:inline">Device view ↗</span>
        </a>
      </div>
    </aside>
  )
}