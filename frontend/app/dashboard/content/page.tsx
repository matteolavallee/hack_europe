"use client"

import { useState } from "react"
import useSWR from "swr"
import { useAudioContents } from "@/hooks/useAudioContents"
import { createAudioContent, getCareReceiver, CARE_RECEIVER_ID } from "@/lib/api"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Modal } from "@/components/ui/Modal"
import { Input, Select } from "@/components/ui/Input"
import { AudioContentCard } from "@/components/dashboard/AudioContentCard"
import type { AudioContent, AudioContentKind } from "@/lib/types"

const KIND_OPTIONS = [
  { value: "family_message", label: "Family message" },
  { value: "audiobook", label: "Audiobook" },
  { value: "other", label: "Other" },
]

const EMPTY_FORM = {
  title: "",
  kind: "family_message" as AudioContentKind,
  url: "",
  recommendable: false,
}

export default function ContentPage() {
  const { contents, loading, error, refresh } = useAudioContents()
  const { data: careReceiver } = useSWR("care-receiver", () => getCareReceiver(CARE_RECEIVER_ID))
  const [added, setAdded] = useState<AudioContent[]>([])

  const [uploadOpen, setUploadOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const allContents = [
    ...added,
    ...contents.filter((c) => !added.some((a) => a.id === c.id)),
  ]

  const closeUploadModal = () => {
    setUploadOpen(false)
    setForm(EMPTY_FORM)
    setFormError(null)
  }

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      setFormError("Title is required.")
      return
    }
    if (!form.url.trim()) {
      setFormError("Audio URL is required.")
      return
    }
    setFormError(null)
    setSubmitting(true)
    try {
      const newItem = await createAudioContent({
        care_receiver_id: CARE_RECEIVER_ID,
        title: form.title.trim(),
        url: form.url.trim(),
        kind: form.kind,
        recommendable: form.recommendable,
      })
      setAdded((prev) => [newItem, ...prev])
      void refresh()
      closeUploadModal()
    } catch {
      setFormError("Failed to upload. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Content Library</h1>
          <p className="mt-1 text-gray-500">Audio messages and content for {careReceiver?.name ?? "your loved one"}</p>
        </div>
        <Button onClick={() => setUploadOpen(true)}>
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Upload Audio
        </Button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <svg className="animate-spin h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <p className="text-sm text-red-600">Failed to load audio content. Please try refreshing.</p>
          </div>
        </Card>
      )}

      {/* Content list */}
      {!loading && !error && (
        <div className="grid gap-4">
          {allContents.map((item) => (
            <AudioContentCard
              key={item.id}
              item={item}
              onDeleted={(id) => { setAdded(prev => prev.filter(a => a.id !== id)); void refresh() }}
            />
          ))}

          {allContents.length === 0 && (
            <Card>
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-indigo-50 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-indigo-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                    />
                  </svg>
                </div>
                <p className="text-gray-700 font-medium">No audio content yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  Upload a family message or audiobook for Simone
                </p>
                <Button className="mt-5" onClick={() => setUploadOpen(true)}>
                  Upload your first audio
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Upload modal */}
      <Modal
        open={uploadOpen}
        onClose={closeUploadModal}
        title="Upload Audio"
        footer={
          <>
            <Button variant="secondary" onClick={closeUploadModal}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={submitting}>
              Upload
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Title"
            placeholder="e.g. Message from Marie"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
          <Select
            label="Kind"
            options={KIND_OPTIONS}
            value={form.kind}
            onChange={(e) =>
              setForm((f) => ({ ...f, kind: e.target.value as AudioContentKind }))
            }
          />
          <Input
            label="Audio URL"
            placeholder="https://example.com/audio.mp3"
            value={form.url}
            onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
          />
          <div className="flex items-center gap-3 pt-1">
            <input
              type="checkbox"
              id="recommendable"
              checked={form.recommendable}
              onChange={(e) =>
                setForm((f) => ({ ...f, recommendable: e.target.checked }))
              }
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="recommendable" className="text-sm font-medium text-gray-700">
              Recommendable — AI can suggest this to Simone
            </label>
          </div>
          {formError && (
            <p className="text-sm text-red-600">{formError}</p>
          )}
        </div>
      </Modal>
    </div>
  )
}
