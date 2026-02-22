import type { DeviceResponse } from "@/lib/types"

// ─── Browser Speech Recognition wrapper ───────────────────────────────────────

export type SpeechIntent =
  | DeviceResponse          // "yes" | "no" | "later"
  | "help"
  | "exercise"
  | "play_message"
  | "unknown"

const YES_WORDS = [
  // English
  "yes", "yeah", "yep", "done", "okay", "ok", "sure", "taken", "did",
  // French
  "oui", "ouais", "ouaip", "d'accord", "bien sûr", "volontiers", "avec plaisir", "super", "parfait",
]
const NO_WORDS = [
  // English
  "no", "nope", "not", "haven't", "didn't",
  // French
  "non", "nan", "pas maintenant", "merci non", "pas envie",
]
const LATER_WORDS = ["later", "wait", "minute", "soon", "remind", "after", "plus tard", "après", "tantôt"]
const HELP_WORDS = ["help", "contact", "call", "notify", "caregiver", "someone", "aide", "appelle", "aidant"]
const EXERCISE_WORDS = ["exercise", "activity", "workout", "quiz", "game", "exercice", "jeu", "quiz"]
const PLAY_WORDS = ["message", "play", "listen", "audio", "music", "musique", "chanson", "livre", "joue"]

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
    recognition.maxAlternatives = 3   // plus de candidats = meilleure détection
    recognition.continuous = false

    let settled = false
    function settle(fn: () => void) {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      fn()
    }

    const timeout = setTimeout(() => {
      recognition.abort()
      settle(() => reject(new Error("timeout")))
    }, timeoutMs)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      // Essayer tous les résultats disponibles (meilleur intent en priorité)
      let best: SpeechResult | null = null
      for (let r = 0; r < event.results.length; r++) {
        for (let a = 0; a < event.results[r].length; a++) {
          const transcript = event.results[r][a].transcript
          const intent = parseIntent(transcript)
          if (!best || intent !== "unknown") {
            best = { transcript, intent }
            if (intent !== "unknown") break
          }
        }
        if (best?.intent !== "unknown") break
      }
      if (best) settle(() => resolve(best!))
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      settle(() => reject(new Error(event.error ?? "recognition-error")))
    }

    // onend SANS résultat = silence ou browser a stoppé → rejeter pour réessayer
    recognition.onend = () => {
      settle(() => reject(new Error("no-speech")))
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
