"use client"

import { useState } from "react"
import { useCalendarItems } from "@/hooks/useCalendarItems"
import {
  createCalendarItem,
  updateCalendarItem,
  deleteCalendarItem,
  triggerReminderNow,
  CARE_RECEIVER_ID,
} from "@/lib/api"
import type { CalendarItem, CalendarItemType, CalendarItemStatus } from "@/lib/types"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Modal, ConfirmModal } from "@/components/ui/Modal"
import { Input, Select, Textarea } from "@/components/ui/Input"
import { formatDateTime, toLocalDatetimeInput, fromLocalDatetimeInput } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

type StatusFilter = "all" | "scheduled" | "completed"

interface FormState {
  title: string
  type: CalendarItemType
  message_text: string
  scheduled_at: string
  repeat_rule: string
}

const defaultForm = (): FormState => ({
  title: "",
  type: "reminder",
  message_text: "",
  scheduled_at: toLocalDatetimeInput(),
  repeat_rule: "",
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusVariant(status: CalendarItemStatus): "success" | "neutral" | "info" | "default" | "warning" {
  if (status === "completed") return "success"
  if (status === "cancelled") return "neutral"
  if (status === "sent") return "info"
  return "default"
}

function statusLabel(status: CalendarItemStatus): string {
  if (status === "scheduled") return "Scheduled"
  if (status === "sent") return "Sent"
  if (status === "completed") return "Completed"
  if (status === "cancelled") return "Cancelled"
  return status
}

function repeatLabel(rule?: string): string {
  if (!rule) return "—"
  if (rule === "daily") return "Daily"
  if (rule === "weekly") return "Weekly"
  return rule
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const { items, loading, refresh } = useCalendarItems()

  const [filter, setFilter] = useState<StatusFilter>("all")
  const [formOpen, setFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<CalendarItem | null>(null)
  const [deleteItem, setDeleteItem] = useState<CalendarItem | null>(null)
  const [form, setForm] = useState<FormState>(defaultForm())
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [triggeringId, setTriggeringId] = useState<string | null>(null)

  // ── Derived ────────────────────────────────────────────────────────────────

  const filtered = [...items]
    .filter((item) => {
      if (filter === "scheduled") return item.status === "scheduled"
      if (filter === "completed") return item.status === "completed" || item.status === "sent"
      return true
    })
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())

  // ── Modal helpers ─────────────────────────────────────────────────────────

  function openAdd() {
    setEditingItem(null)
    setForm(defaultForm())
    setFormOpen(true)
  }

  function openEdit(item: CalendarItem) {
    setEditingItem(item)
    setForm({
      title: item.title,
      type: item.type,
      message_text: item.message_text ?? "",
      scheduled_at: toLocalDatetimeInput(item.scheduled_at),
      repeat_rule: item.repeat_rule ?? "",
    })
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditingItem(null)
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload = {
        title: form.title.trim(),
        type: form.type,
        message_text: form.type === "reminder" && form.message_text.trim() ? form.message_text.trim() : undefined,
        scheduled_at: fromLocalDatetimeInput(form.scheduled_at),
        repeat_rule: form.repeat_rule || undefined,
      }
      if (editingItem) {
        await updateCalendarItem(editingItem.id, payload)
      } else {
        await createCalendarItem({ ...payload, care_receiver_id: CARE_RECEIVER_ID })
      }
      await refresh()
      closeForm()
    } finally {
      setSubmitting(false)
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteItem) return
    setDeleting(true)
    try {
      await deleteCalendarItem(deleteItem.id)
      await refresh()
      setDeleteItem(null)
    } finally {
      setDeleting(false)
    }
  }

  // ── Send now ───────────────────────────────────────────────────────────────

  async function handleSendNow(item: CalendarItem) {
    setTriggeringId(item.id)
    try {
      await triggerReminderNow(CARE_RECEIVER_ID)
      await refresh()
    } finally {
      setTriggeringId(null)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const tabs: { label: string; value: StatusFilter }[] = [
    { label: "All", value: "all" },
    { label: "Upcoming", value: "scheduled" },
    { label: "Completed", value: "completed" },
  ]

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
          <p className="mt-1 text-gray-500">Scheduled reminders and audio pushes</p>
        </div>
        <Button onClick={openAdd}>+ Add Event</Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={
              filter === tab.value
                ? "px-4 py-1.5 text-sm font-medium rounded-md bg-white text-gray-900 shadow-sm"
                : "px-4 py-1.5 text-sm font-medium rounded-md text-gray-500 hover:text-gray-700 transition-colors"
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <Card padding="none">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <svg className="animate-spin h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900">No events found</p>
            <p className="text-sm text-gray-400 mt-1">
              {filter === "all"
                ? "Add your first event to get started."
                : "No events match this filter."}
            </p>
            {filter === "all" && (
              <Button size="sm" className="mt-4" onClick={openAdd}>
                + Add Event
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Event</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Scheduled</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Repeat</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">{item.title}</p>
                    {item.message_text && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{item.message_text}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={item.type === "reminder" ? "info" : "default"}>
                      {item.type === "reminder" ? "Reminder" : "Audio push"}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                    {formatDateTime(item.scheduled_at)}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {repeatLabel(item.repeat_rule)}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={statusVariant(item.status)}>
                      {statusLabel(item.status)}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {item.status === "scheduled" && item.type === "reminder" && (
                        <Button
                          size="sm"
                          variant="success"
                          loading={triggeringId === item.id}
                          onClick={() => handleSendNow(item)}
                        >
                          Send now
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => openEdit(item)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => setDeleteItem(item)}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </Card>

      {/* Add / Edit modal */}
      <Modal
        open={formOpen}
        onClose={closeForm}
        title={editingItem ? "Edit Event" : "Add Event"}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={closeForm} disabled={submitting}>
              Cancel
            </Button>
            <Button form="calendar-event-form" type="submit" loading={submitting}>
              {editingItem ? "Save changes" : "Create event"}
            </Button>
          </>
        }
      >
        <form id="calendar-event-form" onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Title"
            required
            placeholder="e.g. Morning medication"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />

          <Select
            label="Type"
            value={form.type}
            options={[
              { value: "reminder", label: "Reminder" },
              { value: "audio_push", label: "Audio push" },
            ]}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as CalendarItemType }))}
          />

          {form.type === "reminder" && (
            <Textarea
              label="Message"
              placeholder="What should be said to the care receiver?"
              value={form.message_text}
              onChange={(e) => setForm((f) => ({ ...f, message_text: e.target.value }))}
            />
          )}

          <Input
            label="Scheduled at"
            type="datetime-local"
            required
            value={form.scheduled_at}
            onChange={(e) => setForm((f) => ({ ...f, scheduled_at: e.target.value }))}
          />

          <Select
            label="Repeat"
            value={form.repeat_rule}
            options={[
              { value: "", label: "None" },
              { value: "daily", label: "Daily" },
              { value: "weekly", label: "Weekly" },
            ]}
            onChange={(e) => setForm((f) => ({ ...f, repeat_rule: e.target.value }))}
          />
        </form>
      </Modal>

      {/* Delete confirm modal */}
      <ConfirmModal
        open={deleteItem !== null}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        title="Delete event"
        description={`Are you sure you want to delete "${deleteItem?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        loading={deleting}
      />
    </div>
  )
}
