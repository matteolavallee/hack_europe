"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import {
  getCareReceiver,
  updateCareReceiver,
  getCaregiver,
  updateCaregiver,
  CARE_RECEIVER_ID,
} from "@/lib/api"
import { Card, CardHeader } from "@/components/ui/Card"
import { Input, Select } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import type { CareReceiver } from "@/lib/types"

function FieldSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="h-4 w-12 bg-gray-200 rounded animate-pulse" />
        <div className="h-9 bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="space-y-1">
        <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
        <div className="h-9 bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="h-9 w-32 bg-gray-200 rounded animate-pulse" />
    </div>
  )
}

type SaveStatus = "idle" | "success" | "error"

export default function SettingsPage() {
  // ── Care receiver ────────────────────────────────────────────────────────────
  const { data: careReceiver, error: crError } = useSWR(
    "care-receiver",
    () => getCareReceiver(CARE_RECEIVER_ID),
  )

  const [crName, setCrName] = useState("")
  const [crTone, setCrTone] = useState<CareReceiver["tone"]>("warm")
  const [crLanguage, setCrLanguage] = useState("en")
  const [crSaving, setCrSaving] = useState(false)
  const [crStatus, setCrStatus] = useState<SaveStatus>("idle")

  useEffect(() => {
    if (careReceiver) {
      setCrName(careReceiver.name)
      setCrTone(careReceiver.tone)
      setCrLanguage(careReceiver.language)
    }
  }, [careReceiver])

  async function handleCrSubmit(e: React.FormEvent) {
    e.preventDefault()
    setCrSaving(true)
    setCrStatus("idle")
    try {
      await updateCareReceiver(CARE_RECEIVER_ID, {
        name: crName,
        tone: crTone,
        language: crLanguage,
      })
      setCrStatus("success")
      setTimeout(() => setCrStatus("idle"), 2000)
    } catch {
      setCrStatus("error")
    } finally {
      setCrSaving(false)
    }
  }

  // ── Caregiver ────────────────────────────────────────────────────────────────
  const { data: caregiver, error: cgError } = useSWR(
    careReceiver ? ["caregiver", careReceiver.caregiver_id] : null,
    () => getCaregiver(careReceiver!.caregiver_id),
  )

  const [cgName, setCgName] = useState("")
  const [cgTelegramId, setCgTelegramId] = useState("")
  const [cgSaving, setCgSaving] = useState(false)
  const [cgStatus, setCgStatus] = useState<SaveStatus>("idle")

  useEffect(() => {
    if (caregiver) {
      setCgName(caregiver.name)
      setCgTelegramId(caregiver.telegram_chat_id)
    }
  }, [caregiver])

  async function handleCgSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!caregiver) return
    setCgSaving(true)
    setCgStatus("idle")
    try {
      await updateCaregiver(caregiver.id, {
        name: cgName,
        telegram_chat_id: cgTelegramId,
      })
      setCgStatus("success")
      setTimeout(() => setCgStatus("idle"), 2000)
    } catch {
      setCgStatus("error")
    } finally {
      setCgSaving(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-gray-500">Manage profiles and preferences</p>
      </div>

      {/* Care receiver */}
      <Card>
        <CardHeader title="Care Receiver" subtitle="The person being cared for" />

        {crError ? (
          <p className="text-sm text-red-500">Failed to load care receiver data.</p>
        ) : !careReceiver ? (
          <FieldSkeleton />
        ) : (
          <form onSubmit={handleCrSubmit} className="space-y-4">
            <Input
              label="Name"
              value={crName}
              onChange={(e) => setCrName(e.target.value)}
              placeholder="e.g. Simone"
              required
            />
            <Select
              label="Tone"
              value={crTone}
              onChange={(e) => setCrTone(e.target.value as CareReceiver["tone"])}
              options={[
                { value: "warm", label: "Warm & friendly" },
                { value: "professional", label: "Professional" },
                { value: "playful", label: "Playful" },
              ]}
            />
            <Select
              label="Language"
              value={crLanguage}
              onChange={(e) => setCrLanguage(e.target.value)}
              options={[{ value: "en", label: "English" }]}
            />
            <div className="flex items-center gap-3">
              <Button type="submit" loading={crSaving}>
                Save Changes
              </Button>
              {crStatus === "success" && (
                <span className="text-sm text-green-600 font-medium">Saved!</span>
              )}
              {crStatus === "error" && (
                <span className="text-sm text-red-600">Failed to save. Try again.</span>
              )}
            </div>
          </form>
        )}
      </Card>

      {/* Caregiver */}
      <Card>
        <CardHeader title="Caregiver" subtitle="Your profile and contact info" />

        {cgError ? (
          <p className="text-sm text-red-500">Failed to load caregiver data.</p>
        ) : !caregiver ? (
          <FieldSkeleton />
        ) : (
          <form onSubmit={handleCgSubmit} className="space-y-4">
            <Input
              label="Name"
              value={cgName}
              onChange={(e) => setCgName(e.target.value)}
              placeholder="e.g. Marie"
              required
            />
            <Input
              label="Telegram Chat ID"
              value={cgTelegramId}
              onChange={(e) => setCgTelegramId(e.target.value)}
              placeholder="e.g. 123456789"
              hint="Get this by messaging @userinfobot on Telegram"
            />
            <div className="flex items-center gap-3">
              <Button type="submit" loading={cgSaving}>
                Save Changes
              </Button>
              {cgStatus === "success" && (
                <span className="text-sm text-green-600 font-medium">Saved!</span>
              )}
              {cgStatus === "error" && (
                <span className="text-sm text-red-600">Failed to save. Try again.</span>
              )}
            </div>
          </form>
        )}
      </Card>
    </div>
  )
}
