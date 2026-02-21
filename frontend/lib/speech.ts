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

// Returns a promise that resolves when the user speaks (or rejects on timeout / error)
export function listenOnce(timeoutMs = 6000): Promise<SpeechResult> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SrCtor: (new () => any) | undefined =
      w.SpeechRecognition ?? w.webkitSpeechRecognition;

    if (!SrCtor) {
      reject(new Error("SpeechRecognition not supported in this browser"))
      return
    }

    const recognition = new SrCtor()
    recognition.lang = "en-US"
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    const timeout = setTimeout(() => {
      recognition.stop()
      reject(new Error("timeout"))
    }, timeoutMs)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      clearTimeout(timeout)
      const transcript = event.results[0][0].transcript
      resolve({ transcript, intent: parseIntent(transcript) })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      clearTimeout(timeout)
      reject(new Error(event.error))
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
