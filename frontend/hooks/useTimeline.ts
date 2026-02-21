"use client"

import useSWR from "swr"
import { getEvents, CARE_RECEIVER_ID } from "@/lib/api"
import type { CareLoopEvent } from "@/lib/types"

export function useTimeline(limit = 50) {
  const { data, error, mutate } = useSWR<CareLoopEvent[]>(
    ["events", CARE_RECEIVER_ID, limit],
    () => getEvents(CARE_RECEIVER_ID, limit),
    { refreshInterval: 5000 },   // refresh every 5s so dashboard stays live
  )

  return {
    events: data ?? [],
    loading: !data && !error,
    error,
    refresh: mutate,
  }
}
