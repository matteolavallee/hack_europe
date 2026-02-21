"use client"

import { useState } from "react"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Modal } from "@/components/ui/Modal"
import { Input } from "@/components/ui/Input"
import { formatDate, toLocalDatetimeInput, fromLocalDatetimeInput } from "@/lib/utils"
import { sendAudioNow, scheduleAudio, toggleRecommendable, deleteAudioContent } from "@/lib/api"
import { ConfirmModal } from "@/components/ui/Modal"
import type { AudioContent } from "@/lib/types"

const KIND_LABELS: Record<string, string> = {
  family_message: "Family message",
  audiobook: "Audiobook",
  other: "Other",
}

interface Props {
  item: AudioContent
  onDeleted?: (id: string) => void
}

export function AudioContentCard({ item, onDeleted }: Props) {
  const [isRecommendable, setIsRecommendable] = useState(item.recommendable)
  const [toast, setToast] = useState<string | null>(null)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [scheduledAt, setScheduledAt] = useState(toLocalDatetimeInput())
  const [scheduling, setScheduling] = useState(false)
  const [sending, setSending] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const handleSendNow = async () => {
    setSending(true)
    try {
      await sendAudioNow(item.id)
      showToast("Sent to Simone's device!")
    } catch {
      showToast("Failed to send.")
    } finally {
      setSending(false)
    }
  }

  const handleSchedule = async () => {
    setScheduling(true)
    try {
      await scheduleAudio(item.id, fromLocalDatetimeInput(scheduledAt))
      setScheduleOpen(false)
      showToast("Audio scheduled!")
    } catch {
      showToast("Failed to schedule.")
    } finally {
      setScheduling(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteAudioContent(item.id)
      showToast("Deleted.")
      setDeleteOpen(false)
      if (onDeleted) onDeleted(item.id)
    } catch {
      showToast("Failed to delete.")
    } finally {
      setDeleting(false)
    }
  }

  const handleToggle = async () => {
    const next = !isRecommendable
    setIsRecommendable(next)
    setToggling(true)
    try {
      await toggleRecommendable(item.id, next)
    } catch {
      setIsRecommendable(!next)
      showToast("Failed to update.")
    } finally {
      setToggling(false)
    }
  }

  return (
    <>
      <Card padding="sm">
        <div className="flex items-center gap-4">
          {/* Music icon */}
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
            <svg
              className="w-6 h-6 text-indigo-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
              />
            </svg>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-gray-900 truncate">{item.title}</p>
              <Badge variant="neutral">{KIND_LABELS[item.kind] ?? item.kind}</Badge>
              {isRecommendable && <Badge variant="success">Recommendable</Badge>}
            </div>
            <p className="mt-0.5 text-xs text-gray-400">Added {formatDate(item.created_at)}</p>
          </div>

          {/* Toast */}
          {toast && (
            <span className="hidden sm:block text-xs font-medium text-green-600 shrink-0 max-w-[140px] text-right">
              {toast}
            </span>
          )}

          {/* Recommendable toggle */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleToggle}
              disabled={toggling}
              title={isRecommendable ? "Disable recommendable" : "Enable recommendable"}
              className={[
                "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1",
                "disabled:opacity-50",
                isRecommendable ? "bg-indigo-600" : "bg-gray-200",
              ].join(" ")}
            >
              <span
                className={[
                  "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform",
                  isRecommendable ? "translate-x-[19px]" : "translate-x-[2px]",
                ].join(" ")}
              />
            </button>

            {/* Action buttons */}
            <Button variant="secondary" size="sm" onClick={handleSendNow} loading={sending}>
              Send Now
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setScheduleOpen(true)}>
              Schedule
            </Button>
            <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => setDeleteOpen(true)}>
              Delete
            </Button>
          </div>
        </div>

        {/* Mobile toast */}
        {toast && (
          <p className="sm:hidden mt-2 text-xs font-medium text-green-600">{toast}</p>
        )}
      </Card>

      {/* Delete confirm modal */}
      <ConfirmModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete audio"
        description={`Are you sure you want to delete "${item.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleting}
      />

      {/* Schedule modal */}
      <Modal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        title={`Schedule "${item.title}"`}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setScheduleOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSchedule} loading={scheduling}>
              Schedule
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-500 mb-4">
          Choose when to send this audio to Simone&apos;s device.
        </p>
        <Input
          label="Send at"
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
        />
      </Modal>
    </>
  )
}
