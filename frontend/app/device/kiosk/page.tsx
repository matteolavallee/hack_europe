"use client"

import { KioskShell } from "@/components/device/KioskShell"

/**
 * Kiosk View — care receiver's device.
 * Polls next-actions (reminders, music, exercises) and plays them.
 * Open at: /device/kiosk (or via "Device view" in the sidebar).
 */
export default function KioskPage() {
  return <KioskShell />
}
