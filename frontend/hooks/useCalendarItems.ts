"use client"

import useSWR from "swr"
import { getCalendarItems, CARE_RECEIVER_ID } from "@/lib/api"
import type { CalendarItem } from "@/lib/types"

export function useCalendarItems() {
  const { data, error, mutate } = useSWR<CalendarItem[]>(
    ["calendar-items", CARE_RECEIVER_ID],
    () => getCalendarItems(CARE_RECEIVER_ID),
    { refreshInterval: 10000 },
  )

  return {
    items: data ?? [],
    loading: !data && !error,
    error,
    refresh: mutate,
  }
}
