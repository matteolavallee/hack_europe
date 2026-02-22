"use client"

import { useState, useMemo } from "react"
import { Clock, Music, BookOpen, Plus, Play, Trash2, Pencil } from "lucide-react"
import { cn } from "@/lib/utils"
import { Modal, ConfirmModal } from "@/components/ui/Modal"
import { Input, Select } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import {
  createAudioContent,
  sendAudioNow,
  deleteAudioContent,
  createCalendarItem,
  updateCalendarItem,
  CARE_RECEIVER_ID,
} from "@/lib/api"
import { useAudioContents } from "@/hooks/useAudioContents"
import { useCalendarItems } from "@/hooks/useCalendarItems"
import type { AudioContent, AudioContentKind } from "@/lib/types"

// Colors for music/audiobook cards
const CARD_COLORS = [
  "bg-rose-300",
  "bg-amber-200",
  "bg-sky-300",
  "bg-violet-200",
  "bg-emerald-300",
  "bg-slate-300",
]

function getCardColor(index: number) {
  return CARD_COLORS[index % CARD_COLORS.length]
}

function RoutineIcon({ icon }: { icon: string }) {
  if (icon === "book") return <BookOpen className="h-4 w-4 text-primary" aria-hidden />
  return <Music className="h-4 w-4 text-primary" aria-hidden />
}

type AddModalKind = "music" | "audiobook" | null
type RoutineAction = "music" | "audiobook"

function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function MediaPage() {
  const { contents, loading, refresh } = useAudioContents()
  const { items: calendarItems, loading: routinesLoading, refresh: refreshRoutines } = useCalendarItems()
  const routines = useMemo(() => {
    return calendarItems
      .filter((item) => item.type === "audio_push")
      .map((item) => {
        const d = new Date(item.scheduled_at)
        const timeStr = d.toTimeString().slice(0, 5)
        const msg = item.message_text ?? ""
        const isBook = /audiobook|livre|book/i.test(msg)
        return {
          id: item.id,
          time: `${timeStr} - ${item.title}`,
          action: msg || "Suggest content",
          icon: isBook ? "book" : "music",
          enabled: item.status !== "cancelled",
        }
      })
      .sort((a, b) => a.time.localeCompare(b.time))
  }, [calendarItems])

  const [addModalKind, setAddModalKind] = useState<AddModalKind>(null)
  const [routineModalOpen, setRoutineModalOpen] = useState(false)
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null)
  const [routineTime, setRoutineTime] = useState("09:00")
  const [routineMoment, setRoutineMoment] = useState("")
  const [routineAction, setRoutineAction] = useState<RoutineAction>("music")
  const [routineRepeat, setRoutineRepeat] = useState("daily")
  const [routineError, setRoutineError] = useState<string | null>(null)
  const [routineAdding, setRoutineAdding] = useState(false)
  const [addTitle, setAddTitle] = useState("")
  const [addUrl, setAddUrl] = useState("")
  const [addRecommendable, setAddRecommendable] = useState(false)
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AudioContent | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const musicContents = contents.filter((c) => c.kind === "other")
  const audiobookContents = contents.filter((c) => c.kind === "audiobook")

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const toggleRoutine = async (id: string) => {
    const r = routines.find((x) => x.id === id)
    if (!r) return
    const newEnabled = !r.enabled
    try {
      await updateCalendarItem(id, {
        status: newEnabled ? "scheduled" : "cancelled",
      })
      await refreshRoutines()
    } catch {
      showToast("Failed to update routine.")
    }
  }

  const openRoutineModal = () => {
    setEditingRoutineId(null)
    setRoutineModalOpen(true)
    setRoutineTime("09:00")
    setRoutineMoment("")
    setRoutineAction("music")
    setRoutineRepeat("daily")
    setRoutineError(null)
  }

  const openEditRoutineModal = (id: string) => {
    const item = calendarItems.find((i) => i.type === "audio_push" && i.id === id)
    if (!item) return
    const d = new Date(item.scheduled_at)
    setEditingRoutineId(id)
    setRoutineModalOpen(true)
    setRoutineTime(d.toTimeString().slice(0, 5))
    setRoutineMoment(item.title)
    setRoutineAction(/audiobook|livre|book/i.test(item.message_text ?? "") ? "audiobook" : "music")
    setRoutineRepeat(item.repeat_rule === "daily" ? "daily" : "none")
    setRoutineError(null)
  }

  const closeRoutineModal = () => {
    setRoutineModalOpen(false)
    setEditingRoutineId(null)
  }

  const handleSaveRoutine = async () => {
    const moment = routineMoment.trim()
    if (!moment) {
      setRoutineError("Moment is required (e.g. Coffee, Nap).")
      return
    }
    setRoutineAdding(true)
    setRoutineError(null)
    try {
      const today = getTodayDateString()
      const scheduledAt = new Date(`${today}T${routineTime}:00`).toISOString()
      const messageText =
        routineAction === "music" ? "Suggest music" : "Suggest an audiobook"
      const payload = {
        title: moment,
        message_text: messageText,
        scheduled_at: scheduledAt,
        repeat_rule: routineRepeat === "none" ? undefined : routineRepeat,
      }
      if (editingRoutineId) {
        await updateCalendarItem(editingRoutineId, payload)
        showToast("Routine updated!")
      } else {
        await createCalendarItem({
          care_receiver_id: CARE_RECEIVER_ID,
          type: "audio_push",
          ...payload,
        })
        showToast("Routine created!")
      }
      await refreshRoutines()
      closeRoutineModal()
    } catch {
      setRoutineError("Failed to create routine. Please try again.")
    } finally {
      setRoutineAdding(false)
    }
  }

  const openAddModal = (kind: AddModalKind) => {
    setAddModalKind(kind)
    setAddTitle("")
    setAddUrl("")
    setAddRecommendable(false)
    setAddError(null)
  }

  const closeAddModal = () => {
    setAddModalKind(null)
  }

  const handleAdd = async () => {
    if (!addModalKind || !addTitle.trim()) {
      setAddError("Title is required.")
      return
    }
    if (!addUrl.trim()) {
      setAddError("URL is required.")
      return
    }
    const kind: AudioContentKind = addModalKind === "music" ? "other" : "audiobook"
    setAdding(true)
    setAddError(null)
    try {
      await createAudioContent({
        care_receiver_id: CARE_RECEIVER_ID,
        title: addTitle.trim(),
        url: addUrl.trim(),
        kind,
        recommendable: addRecommendable,
      })
      showToast(addModalKind === "music" ? "Music added!" : "Audiobook added!")
      await refresh()
      closeAddModal()
    } catch {
      setAddError("Failed to add. Please try again.")
    } finally {
      setAdding(false)
    }
  }

  const handlePlay = async (item: AudioContent) => {
    setSendingId(item.id)
    try {
      await sendAudioNow(item.id)
      showToast(`Sent "${item.title}" to device!`)
    } catch {
      showToast("Failed to send.")
    } finally {
      setSendingId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteAudioContent(deleteTarget.id)
      showToast("Deleted.")
      await refresh()
      setDeleteTarget(null)
    } catch {
      showToast("Failed to delete.")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-semibold text-foreground">Media & Pleasure</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage music, audiobooks, and daily listening routines.
        </p>
      </header>

      {/* Toast */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-4 right-4 z-50 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg"
        >
          {toast}
        </div>
      )}

      <section aria-label="Listening routines">
        <h2 className="mb-3 text-sm font-semibold text-foreground">
          Listening routines
        </h2>
        {routinesLoading ? (
          <p className="text-sm text-muted-foreground">Loading routines...</p>
        ) : (
          <div className="space-y-3">
            {routines.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-4"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Clock className="h-4 w-4 text-primary" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{r.time}</p>
                <p className="text-xs text-muted-foreground">{r.action}</p>
              </div>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                <RoutineIcon icon={r.icon} />
              </span>
              <button
                type="button"
                onClick={() => openEditRoutineModal(r.id)}
                className="flex min-h-[40px] min-w-[40px] shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Edit routine"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <label className="relative inline-flex min-h-[48px] min-w-[72px] cursor-pointer items-center shrink-0 justify-end">
                <input
                  type="checkbox"
                  checked={r.enabled}
                  onChange={() => toggleRoutine(r.id)}
                  className="peer sr-only"
                />
                <div className="peer h-9 w-14 rounded-full bg-input after:absolute after:left-[3px] after:top-1/2 after:h-7 after:w-7 after:-translate-y-1/2 after:rounded-full after:bg-card after:shadow-sm after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-5" />
              </label>
            </div>
          ))}
          </div>
        )}
        <button
          type="button"
          onClick={openRoutineModal}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/80"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
          Create a routine
        </button>
      </section>

      {/* Create Routine Modal */}
      <Modal
        open={routineModalOpen}
        onClose={closeRoutineModal}
        title={editingRoutineId ? "Edit routine" : "Create a routine"}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={closeRoutineModal}>
              Cancel
            </Button>
            <Button onClick={handleSaveRoutine} loading={routineAdding}>
              {editingRoutineId ? "Save" : "Create"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {routineError && (
            <p className="text-sm font-medium text-destructive" role="alert">
              {routineError}
            </p>
          )}
          <Input
            label="Time"
            type="time"
            value={routineTime}
            onChange={(e) => setRoutineTime(e.target.value)}
          />
          <Input
            label="Moment"
            value={routineMoment}
            onChange={(e) => setRoutineMoment(e.target.value)}
            placeholder="e.g. Coffee, Nap, Dinner"
          />
          <Select
            label="Action"
            value={routineAction}
            options={[
              { value: "music", label: "Suggest music" },
              { value: "audiobook", label: "Suggest an audiobook" },
            ]}
            onChange={(e) => setRoutineAction(e.target.value as RoutineAction)}
          />
          <Select
            label="Repeat"
            value={routineRepeat}
            options={[
              { value: "daily", label: "Daily" },
              { value: "none", label: "Once" },
            ]}
            onChange={(e) => setRoutineRepeat(e.target.value)}
          />
        </div>
      </Modal>

      {/* Section 2: Music Library */}
      <section aria-label="Music">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Music</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : (
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <div className="flex gap-4 pb-2 sm:flex-wrap sm:pb-0">
              {musicContents.map((m, i) => (
                <div
                  key={m.id}
                  className="flex w-36 shrink-0 flex-col rounded-lg border border-border bg-card p-4 sm:w-40"
                >
                  <div
                    className={cn(
                      "aspect-square w-full rounded-xl flex items-center justify-center",
                      getCardColor(i),
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => handlePlay(m)}
                      disabled={!!sendingId}
                      className="rounded-full p-2 transition-opacity hover:opacity-90 disabled:opacity-50"
                      aria-label={`Play ${m.title}`}
                    >
                      <Play
                        className="h-10 w-10 text-white/90"
                        fill="currentColor"
                        aria-hidden
                      />
                    </button>
                  </div>
                  <p className="mt-3 truncate text-sm font-medium text-foreground">
                    {m.title}
                  </p>
                  <div className="mt-3 flex gap-3">
                    <button
                      type="button"
                      onClick={() => handlePlay(m)}
                      disabled={!!sendingId}
                      className="flex min-h-[48px] min-w-[48px] items-center justify-center rounded-xl text-foreground hover:bg-muted disabled:opacity-50"
                      aria-label="Send to device"
                    >
                      <Play className="h-6 w-6" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(m)}
                      className="flex min-h-[48px] min-w-[48px] items-center justify-center rounded-xl text-destructive hover:bg-destructive/20"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-6 w-6" />
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => openAddModal("music")}
                className="flex min-h-[72px] w-40 shrink-0 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted py-10 text-base font-semibold text-foreground transition-colors hover:bg-accent sm:w-44"
              >
                <Plus className="mb-2 h-12 w-12" strokeWidth={2} aria-hidden />
                Add music
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Section 3: Audiobooks */}
      <section aria-label="Audiobooks">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Audiobooks</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {audiobookContents.map((ab, i) => (
              <div
                key={ab.id}
                className="flex flex-col rounded-lg border border-border bg-card p-4"
              >
                <div className="flex gap-4">
                  <div
                    className={cn(
                      "h-24 w-20 shrink-0 rounded-xl flex items-center justify-center",
                      getCardColor(i),
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => handlePlay(ab)}
                      disabled={!!sendingId}
                      className="rounded-full p-2 transition-opacity hover:opacity-90 disabled:opacity-50"
                      aria-label={`Play ${ab.title}`}
                    >
                      <Play
                        className="h-8 w-8 text-white/90"
                        fill="currentColor"
                        aria-hidden
                      />
                    </button>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{ab.title}</p>
                  </div>
                </div>
                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => handlePlay(ab)}
                    disabled={!!sendingId}
                    className="flex min-h-[40px] flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-muted text-sm font-medium text-foreground transition-colors hover:bg-muted/80 disabled:opacity-50"
                  >
                    <Play className="h-4 w-4" />
                    Send to device
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(ab)}
                    className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl text-destructive hover:bg-destructive/20"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => openAddModal("audiobook")}
              className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted py-8 text-sm font-medium text-foreground transition-colors hover:bg-muted/80"
            >
              <Plus className="mb-2 h-12 w-12" strokeWidth={2} aria-hidden />
              Add audiobook
            </button>
          </div>
        )}
      </section>

      {/* Add Music / Audiobook Modal */}
      <Modal
        open={!!addModalKind}
        onClose={closeAddModal}
        title={addModalKind === "music" ? "Add music" : "Add audiobook"}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={closeAddModal}>
              Cancel
            </Button>
            <Button onClick={handleAdd} loading={adding}>
              Add
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {addError && (
            <p className="text-sm font-medium text-destructive" role="alert">
              {addError}
            </p>
          )}
          <Input
            label="Title"
            value={addTitle}
            onChange={(e) => setAddTitle(e.target.value)}
            placeholder={
              addModalKind === "music"
                ? "e.g. Édith Piaf Classics"
                : "e.g. The Little Prince"
            }
          />
          <Input
            label="URL"
            type="url"
            value={addUrl}
            onChange={(e) => setAddUrl(e.target.value)}
            placeholder="https://..."
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={addRecommendable}
              onChange={(e) => setAddRecommendable(e.target.checked)}
              className="h-4 w-4 rounded border-input text-primary"
            />
            <span className="text-sm font-medium text-foreground">
              Suggestable to the patient
            </span>
          </label>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete"
        description={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.title}"? This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        loading={deleting}
      />
    </div>
  )
}
