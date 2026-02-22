"use client"

import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { Card, CardHeader } from "@/components/ui/Card"
import { triggerReminderNow, triggerSuggestion, CARE_RECEIVER_ID } from "@/lib/api"

export function DemoPanel() {
  const [loading, setLoading] = useState<string | null>(null)
  const [lastAction, setLastAction] = useState<string | null>(null)

  async function run(label: string, fn: () => Promise<void>) {
    setLoading(label)
    try {
      await fn()
      setLastAction(`✓ ${label} triggered`)
    } catch {
      setLastAction(`✗ Failed: ${label}`)
    } finally {
      setLoading(null)
    }
  }

  return (
    <Card>
      <CardHeader
        title="Demo Triggers"
        subtitle="Fire events instantly for demo purposes"
      />

      <div className="flex flex-wrap gap-3">
        <Button
          variant="secondary"
          size="sm"
          loading={loading === "Reminder"}
          onClick={() =>
            run("Reminder", async () => {
              await triggerReminderNow(CARE_RECEIVER_ID)
            })
          }
        >
          🔔 Trigger Reminder Now
        </Button>

        <Button
          variant="secondary"
          size="sm"
          loading={loading === "Exercise"}
          onClick={() =>
            run("Exercise", async () => {
              await triggerSuggestion(CARE_RECEIVER_ID, "exercise")
            })
          }
        >
          🧠 Suggest Exercise
        </Button>

        <Button
          variant="secondary"
          size="sm"
          loading={loading === "Message"}
          onClick={() =>
            run("Message", async () => {
              await triggerSuggestion(CARE_RECEIVER_ID, "message")
            })
          }
        >
          🎵 Suggest Audio Message
        </Button>
      </div>

      {lastAction && (
        <p className="mt-4 text-xs text-gray-500">{lastAction}</p>
      )}

      {process.env.NEXT_PUBLIC_USE_MOCK === "true" && (
        <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mt-2">
          Mock mode — actions are logged to console only. Set NEXT_PUBLIC_USE_MOCK=false to use live backend.
        </p>
      )}
    </Card>
  )
}
