"use client"

import useSWR from "swr"
import { getNextActions, CARE_RECEIVER_ID } from "@/lib/api"
import type { DeviceAction } from "@/lib/types"

export function useNextActions() {
  const { data, error, mutate } = useSWR<DeviceAction[]>(
    ["next-actions", CARE_RECEIVER_ID],
    () => getNextActions(CARE_RECEIVER_ID),
    {
      refreshInterval: 3000,      // poll every 3 seconds
      revalidateOnFocus: false,
      dedupingInterval: 2000,
    },
  )

  return {
    actions: data ?? [],
    loading: !data && !error,
    error,
    refresh: mutate,
  }
}
