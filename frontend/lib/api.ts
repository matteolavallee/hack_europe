import type {
  Caregiver,
  CareReceiver,
  CalendarItem,
  AudioContent,
  CareLoopEvent,
  DeviceAction,
  CreateCalendarItemPayload,
  UpdateCalendarItemPayload,
  CreateAudioContentPayload,
  DeviceResponsePayload,
  HelpRequestPayload,
} from "@/lib/types"

import {
  mockCaregiver,
  mockCareReceiver,
  mockCalendarItems,
  mockAudioContents,
  mockEvents,
  mockNextActions,
  MOCK_CARE_RECEIVER_ID,
} from "@/lib/mocks"

// ─── Config ───────────────────────────────────────────────────────────────────

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true"
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
const TOKEN = process.env.NEXT_PUBLIC_API_TOKEN ?? "demo-token"

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
    },
    ...options,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API ${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

// ─── Caregiver ────────────────────────────────────────────────────────────────

export async function getCaregiver(id: string): Promise<Caregiver> {
  if (USE_MOCK) return mockCaregiver
  return request<Caregiver>(`/api/caregivers/${id}`)
}

export async function createCaregiver(data: Omit<Caregiver, "id" | "created_at">): Promise<Caregiver> {
  if (USE_MOCK) return { ...mockCaregiver, ...data }
  return request<Caregiver>("/api/caregivers", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function updateCaregiver(id: string, data: Partial<Caregiver>): Promise<Caregiver> {
  if (USE_MOCK) return { ...mockCaregiver, ...data }
  return request<Caregiver>(`/api/caregivers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

// ─── Care receiver ────────────────────────────────────────────────────────────

export async function getCareReceiver(id: string): Promise<CareReceiver> {
  if (USE_MOCK) return mockCareReceiver
  return request<CareReceiver>(`/api/care-receivers/${id}`)
}

export async function createCareReceiver(data: Omit<CareReceiver, "id" | "created_at">): Promise<CareReceiver> {
  if (USE_MOCK) return { ...mockCareReceiver, ...data }
  return request<CareReceiver>("/api/care-receivers", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function updateCareReceiver(id: string, data: Partial<CareReceiver>): Promise<CareReceiver> {
  if (USE_MOCK) return { ...mockCareReceiver, ...data }
  return request<CareReceiver>(`/api/care-receivers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

// ─── Calendar items ───────────────────────────────────────────────────────────

export async function getCalendarItems(careReceiverId: string): Promise<CalendarItem[]> {
  if (USE_MOCK) return mockCalendarItems
  return request<CalendarItem[]>(`/api/calendar-items?care_receiver_id=${careReceiverId}`)
}

export async function createCalendarItem(data: CreateCalendarItemPayload): Promise<CalendarItem> {
  if (USE_MOCK) {
    const item: CalendarItem = {
      id: `ci-${Date.now()}`,
      ...data,
      status: "scheduled",
      created_at: new Date().toISOString(),
    }
    mockCalendarItems.unshift(item)
    return item
  }
  return request<CalendarItem>("/api/calendar-items", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function updateCalendarItem(id: string, data: UpdateCalendarItemPayload): Promise<CalendarItem> {
  if (USE_MOCK) {
    const item = mockCalendarItems.find((i) => i.id === id)
    if (!item) throw new Error("Not found")
    Object.assign(item, data)
    return item
  }
  return request<CalendarItem>(`/api/calendar-items/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

export async function deleteCalendarItem(id: string): Promise<void> {
  if (USE_MOCK) {
    const idx = mockCalendarItems.findIndex((i) => i.id === id)
    if (idx !== -1) mockCalendarItems.splice(idx, 1)
    return
  }
  await request<void>(`/api/calendar-items/${id}`, { method: "DELETE" })
}

// ─── Audio content ────────────────────────────────────────────────────────────

export async function getAudioContents(careReceiverId: string): Promise<AudioContent[]> {
  if (USE_MOCK) return mockAudioContents
  return request<AudioContent[]>(`/api/audio-contents?care_receiver_id=${careReceiverId}`)
}

export async function createAudioContent(data: CreateAudioContentPayload): Promise<AudioContent> {
  if (USE_MOCK) {
    const item: AudioContent = {
      id: `ac-${Date.now()}`,
      ...data,
      recommendable: data.recommendable ?? false,
      created_at: new Date().toISOString(),
    }
    mockAudioContents.unshift(item)
    return item
  }
  return request<AudioContent>("/api/audio-contents", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function sendAudioNow(id: string): Promise<void> {
  if (USE_MOCK) { console.log("[mock] sendAudioNow", id); return }
  await request<void>(`/api/audio-contents/${id}/send-now`, { method: "POST" })
}

export async function scheduleAudio(id: string, scheduledAt: string): Promise<void> {
  if (USE_MOCK) { console.log("[mock] scheduleAudio", id, scheduledAt); return }
  await request<void>(`/api/audio-contents/${id}/schedule`, {
    method: "POST",
    body: JSON.stringify({ scheduled_at: scheduledAt }),
  })
}

export async function toggleRecommendable(id: string, recommendable: boolean): Promise<AudioContent> {
  if (USE_MOCK) {
    const item = mockAudioContents.find((a) => a.id === id)
    if (!item) throw new Error("Not found")
    item.recommendable = recommendable
    return item
  }
  return request<AudioContent>(`/api/audio-contents/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ recommendable }),
  })
}

export async function deleteAudioContent(id: string): Promise<void> {
  if (USE_MOCK) {
    const idx = mockAudioContents.findIndex((a) => a.id === id)
    if (idx !== -1) mockAudioContents.splice(idx, 1)
    return
  }
  await request<void>(`/api/audio-contents/${id}`, { method: "DELETE" })
}

// ─── Timeline / events ────────────────────────────────────────────────────────

export async function getEvents(careReceiverId: string, limit = 50): Promise<CareLoopEvent[]> {
  if (USE_MOCK) return mockEvents.slice(0, limit)
  return request<CareLoopEvent[]>(
    `/api/events?care_receiver_id=${careReceiverId}&limit=${limit}`,
  )
}

// ─── Demo triggers ────────────────────────────────────────────────────────────

export async function triggerReminderNow(careReceiverId: string): Promise<void> {
  if (USE_MOCK) { console.log("[mock] triggerReminderNow"); return }
  await request<void>("/api/demo/trigger-reminder-now", {
    method: "POST",
    body: JSON.stringify({ care_receiver_id: careReceiverId }),
  })
}

export async function triggerSuggestion(careReceiverId: string, kind: "exercise" | "message"): Promise<void> {
  if (USE_MOCK) { console.log("[mock] triggerSuggestion", kind); return }
  await request<void>("/api/demo/trigger-suggestion", {
    method: "POST",
    body: JSON.stringify({ care_receiver_id: careReceiverId, kind }),
  })
}

// ─── Device ───────────────────────────────────────────────────────────────────

export async function getNextActions(careReceiverId: string): Promise<DeviceAction[]> {
  if (USE_MOCK) return mockNextActions
  return request<DeviceAction[]>(
    `/api/device/next-actions?care_receiver_id=${careReceiverId}`,
  )
}

export async function submitDeviceResponse(payload: DeviceResponsePayload): Promise<void> {
  if (USE_MOCK) { console.log("[mock] submitDeviceResponse", payload); return }
  await request<void>("/api/device/response", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function submitHelpRequest(payload: HelpRequestPayload): Promise<void> {
  if (USE_MOCK) { console.log("[mock] submitHelpRequest", payload); return }
  await request<void>("/api/device/help-request", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

// ─── Shared constant (demo care receiver id) ──────────────────────────────────

export const CARE_RECEIVER_ID =
  process.env.NEXT_PUBLIC_CARE_RECEIVER_ID ?? MOCK_CARE_RECEIVER_ID
