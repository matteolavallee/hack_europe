"use client"

import { KioskShell } from "@/components/device/KioskShell"

/**
 * Vue Kiosk — appareil du bénéficiaire.
 * Poll les next-actions (rappels, musique, exercices) et les joue.
 * Ouverture: /device/kiosk (ou via "Device view" dans la sidebar).
 */
export default function KioskPage() {
  return <KioskShell />
}
