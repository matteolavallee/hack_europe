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
  const list = await request<Caregiver[]>("/api/caregivers")
  const found = list.find((c) => c.id === id)
  if (!found) throw new Error(`Caregiver ${id} not found`)
  return found
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
  return request<CareReceiver>(`/api/caregivers/receivers/${id}`)
}

export async function createCareReceiver(data: Omit<CareReceiver, "id" | "created_at">): Promise<CareReceiver> {
  if (USE_MOCK) return { ...mockCareReceiver, ...data }
  return request<CareReceiver>("/api/caregivers/receivers", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function updateCareReceiver(id: string, data: Partial<CareReceiver>): Promise<CareReceiver> {
  if (USE_MOCK) return { ...mockCareReceiver, ...data }
  return request<CareReceiver>(`/api/caregivers/receivers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

// ─── Calendar items ───────────────────────────────────────────────────────────

function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError) return err.message === "Failed to fetch"
  return false
}

export async function getCalendarItems(careReceiverId: string): Promise<CalendarItem[]> {
  if (USE_MOCK) return mockCalendarItems
  try {
    return await request<CalendarItem[]>(`/api/reminders?care_receiver_id=${careReceiverId}`)
  } catch (err) {
    if (isNetworkError(err)) return mockCalendarItems
    throw err
  }
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
  try {
    return await request<CalendarItem>("/api/reminders", {
      method: "POST",
      body: JSON.stringify(data),
    })
  } catch (err) {
    if (isNetworkError(err)) {
      const item: CalendarItem = {
        id: `ci-${Date.now()}`,
        ...data,
        status: "scheduled",
        created_at: new Date().toISOString(),
      }
      mockCalendarItems.unshift(item)
      return item
    }
    throw err
  }
}

export async function updateCalendarItem(id: string, data: UpdateCalendarItemPayload): Promise<CalendarItem> {
  if (USE_MOCK) {
    const item = mockCalendarItems.find((i) => i.id === id)
    if (!item) throw new Error("Not found")
    Object.assign(item, data)
    return item
  }
  return request<CalendarItem>(`/api/reminders/${id}`, {
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
  await request<void>(`/api/reminders/${id}`, { method: "DELETE" })
}

// ─── Audio content ────────────────────────────────────────────────────────────

export async function getAudioContents(careReceiverId: string): Promise<AudioContent[]> {
  if (USE_MOCK) return mockAudioContents
  return request<AudioContent[]>(`/api/chat/audio?care_receiver_id=${careReceiverId}`)
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
  return request<AudioContent>("/api/chat/audio", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function sendAudioNow(id: string): Promise<void> {
  if (USE_MOCK) { console.log("[mock] sendAudioNow", id); return }
  await request<void>(`/api/chat/audio/${id}/send-now`, { method: "POST" })
}

export async function scheduleAudio(id: string, scheduledAt: string): Promise<void> {
  if (USE_MOCK) { console.log("[mock] scheduleAudio", id, scheduledAt); return }
  await request<void>(`/api/chat/audio/${id}/schedule`, {
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
  return request<AudioContent>(`/api/chat/audio/${id}`, {
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
  await request<void>(`/api/chat/audio/${id}`, { method: "DELETE" })
}

// ─── Timeline / events ────────────────────────────────────────────────────────

export async function getEvents(careReceiverId: string, limit = 50): Promise<CareLoopEvent[]> {
  if (USE_MOCK) return mockEvents.slice(0, limit)
  return request<CareLoopEvent[]>(
    `/api/health/events?care_receiver_id=${careReceiverId}&limit=${limit}`,
  )
}

// ─── Demo triggers ────────────────────────────────────────────────────────────

export async function triggerReminderNow(careReceiverId: string): Promise<void> {
  if (USE_MOCK) { console.log("[mock] triggerReminderNow"); return }
  await request<void>("/api/reminders/demo/trigger-reminder-now", {
    method: "POST",
    body: JSON.stringify({ care_receiver_id: careReceiverId }),
  })
}

export async function triggerSuggestion(careReceiverId: string, kind: "exercise" | "message"): Promise<void> {
  if (USE_MOCK) { console.log("[mock] triggerSuggestion", kind); return }
  await request<void>("/api/chat/demo/trigger-suggestion", {
    method: "POST",
    body: JSON.stringify({ care_receiver_id: careReceiverId, kind }),
  })
}

// ─── Device ───────────────────────────────────────────────────────────────────

export async function getNextActions(careReceiverId: string): Promise<DeviceAction[]> {
  if (USE_MOCK) return mockNextActions
  return request<DeviceAction[]>(
    `/api/chat/device/next-actions?care_receiver_id=${careReceiverId}`,
  )
}

export async function submitDeviceResponse(payload: DeviceResponsePayload): Promise<void> {
  if (USE_MOCK) { console.log("[mock] submitDeviceResponse", payload); return }
  await request<void>("/api/chat/device/response", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function submitHelpRequest(payload: HelpRequestPayload): Promise<void> {
  if (USE_MOCK) { console.log("[mock] submitHelpRequest", payload); return }
  await request<void>("/api/chat/device/help-request", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

// ─── Shared constant (demo care receiver id) ──────────────────────────────────

export const CARE_RECEIVER_ID =
  process.env.NEXT_PUBLIC_CARE_RECEIVER_ID ?? MOCK_CARE_RECEIVER_ID
