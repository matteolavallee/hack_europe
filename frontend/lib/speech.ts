import type { DeviceResponse } from "@/lib/types"

// ─── Browser Speech Recognition wrapper ───────────────────────────────────────

export type SpeechIntent =
  | DeviceResponse          // "yes" | "no" | "later"
  | "help"
  | "exercise"
  | "play_message"
  | "unknown"

const YES_WORDS = ["yes", "yeah", "yep", "done", "okay", "ok", "sure", "taken", "did"]
const NO_WORDS = ["no", "nope", "not", "haven't", "didn't"]
const LATER_WORDS = ["later", "wait", "minute", "soon", "remind", "after"]
const HELP_WORDS = ["help", "contact", "call", "notify", "caregiver", "someone"]
const EXERCISE_WORDS = ["exercise", "activity", "workout", "quiz", "game"]
const PLAY_WORDS = ["message", "play", "listen", "audio", "music"]

function parseIntent(transcript: string): SpeechIntent {
  const lower = transcript.toLowerCase()
  if (YES_WORDS.some((w) => lower.includes(w))) return "yes"
  if (NO_WORDS.some((w) => lower.includes(w))) return "no"
  if (LATER_WORDS.some((w) => lower.includes(w))) return "later"
  if (HELP_WORDS.some((w) => lower.includes(w))) return "help"
  if (EXERCISE_WORDS.some((w) => lower.includes(w))) return "exercise"
  if (PLAY_WORDS.some((w) => lower.includes(w))) return "play_message"
  return "unknown"
}

export interface SpeechResult {
  transcript: string
  intent: SpeechIntent
}

// Web Speech API - types vary by environment
interface WindowWithSpeech {
  SpeechRecognition?: new () => Record<string, unknown>
  webkitSpeechRecognition?: new () => Record<string, unknown>
}

// Returns a promise that resolves when the user speaks (or rejects on timeout / error)
export function listenOnce(timeoutMs = 6000): Promise<SpeechResult> {
  return new Promise((resolve, reject) => {
    const win = window as unknown as WindowWithSpeech
    const SpeechRecognition = win.SpeechRecognition ?? win.webkitSpeechRecognition

    if (!SpeechRecognition) {
      reject(new Error("SpeechRecognition not supported in this browser"))
      return
    }

    const recognition = new SpeechRecognition() as {
      lang: string
      interimResults: boolean
      maxAlternatives: number
      onresult: ((e: unknown) => void) | null
      onerror: ((e: unknown) => void) | null
      onend: (() => void) | null
      stop: () => void
      start: () => void
    }
    recognition.lang = "en-US"
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    const timeout = setTimeout(() => {
      recognition.stop()
      reject(new Error("timeout"))
    }, timeoutMs)

    recognition.onresult = (event: unknown) => {
      clearTimeout(timeout)
      const e = event as { results: { [i: number]: { [j: number]: { transcript: string } } } }
      const transcript = e.results[0][0].transcript
      resolve({ transcript, intent: parseIntent(transcript) })
    }

    recognition.onerror = (event: unknown) => {
      clearTimeout(timeout)
      const err = event as { error?: string }
      reject(new Error(err.error ?? "unknown"))
    }

    recognition.onend = () => {
      clearTimeout(timeout)
    }

    recognition.start()
  })
}

export function isSpeechSupported(): boolean {
  if (typeof window === "undefined") return false
  const w = window as unknown as {
    SpeechRecognition?: unknown
    webkitSpeechRecognition?: unknown
  }
  return !!(w.SpeechRecognition ?? w.webkitSpeechRecognition)
}
