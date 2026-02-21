"use client"

import useSWR from "swr"
import { getAudioContents, CARE_RECEIVER_ID } from "@/lib/api"
import type { AudioContent } from "@/lib/types"

export function useAudioContents() {
  const { data, error, mutate } = useSWR<AudioContent[]>(
    ["audio-contents", CARE_RECEIVER_ID],
    () => getAudioContents(CARE_RECEIVER_ID),
  )

  return {
    contents: data ?? [],
    loading: !data && !error,
    error,
    refresh: mutate,
  }
}
