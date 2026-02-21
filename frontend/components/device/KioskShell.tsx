"use client"

import { useState, useEffect, useRef } from "react"
import type { DeviceAction, DeviceState } from "@/lib/types"
import type { SpeechIntent } from "@/lib/speech"
import { useNextActions } from "@/hooks/useNextActions"
import { listenOnce } from "@/lib/speech"
import { playAudio, buildTtsUrl } from "@/lib/audio"
import { submitDeviceResponse, submitHelpRequest } from "@/lib/api"

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true"
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
const RESIDENT_NAME = "Simone"
const CAREGIVER_NAME = "Marie"

const EXERCISE_QUESTIONS = [
  "What day is it today?",
  "Where are you right now?",
  "How do you feel: good, okay, or not good?",
]

function delay(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms))
}

type ListenMode = "response" | "exercise"

// ─── Circle + ring colours per state ─────────────────────────────────────────
const CIRCLE_COLOR: Record<DeviceState, string> = {
  idle: "bg-indigo-600",
  speaking: "bg-violet-600",
  listening: "bg-emerald-600",
  processing: "bg-amber-500",
}
const RING_COLOR: Record<DeviceState, string> = {
  idle: "ring-indigo-400/50",
  speaking: "ring-violet-400/50",
  listening: "ring-emerald-400/50",
  processing: "ring-amber-300/50",
}
const STATE_LABEL: Record<DeviceState, string> = {
  idle: `Hello, ${RESIDENT_NAME}`,
  speaking: "I'm speaking…",
  listening: "Listening…",
  processing: "Got it…",
}
const STATE_SUBLABEL: Record<DeviceState, string> = {
  idle: "I'm here whenever you need me",
  speaking: "",
  listening: "Say yes, no, or later",
  processing: "One moment…",
}

export function KioskShell() {
  const [state, setState] = useState<DeviceState>("idle")
  const [message, setMessage] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const [manualButtons, setManualButtons] = useState(false)
  const [listenMode, setListenMode] = useState<ListenMode>("response")
  const [inExercise, setInExercise] = useState(false)
  const [exerciseStep, setExerciseStep] = useState(0)

  // Set of action IDs we've already processed — prevents re-triggering in mock mode
  const processedIds = useRef(new Set<string>())
  // Resolve function for the pending listenOnce / button-tap promise
  const intentResolveRef = useRef<((intent: SpeechIntent) => void) | null>(null)
  // Semaphore: prevents the effect from starting a second action while one is running
  const runningRef = useRef(false)

  const { actions, refresh } = useNextActions()

  // ─── TTS / speak ─────────────────────────────────────────────────────────

  async function speak(text: string) {
    setState("speaking")
    setMessage(text)
    if (USE_MOCK) {
      await delay(3000)
    } else {
      try {
        await playAudio(buildTtsUrl(text, BASE_URL))
      } catch {
        // Fallback: display text for 3 seconds if audio fails
        await delay(3000)
      }
    }
  }

  // ─── Listen for intent ────────────────────────────────────────────────────

  async function listen(mode: ListenMode = "response"): Promise<SpeechIntent> {
    setState("listening")
    setListenMode(mode)
    setManualButtons(false)

    // Always reveal manual buttons after 2 s — ensures demo reliability
    const revealTimer = setTimeout(() => setManualButtons(true), 2000)

    try {
      const result = await listenOnce(6000)
      clearTimeout(revealTimer)
      // Keep buttons visible even after a successful recognition (demo safety)
      setManualButtons(true)
      return result.intent
    } catch {
      // Speech not supported, timed-out, or errored — fall through to buttons
      clearTimeout(revealTimer)
      setManualButtons(true)
      return new Promise<SpeechIntent>((resolve) => {
        intentResolveRef.current = resolve
      })
    }
  }

  /** Called by a manual response button tap. Resolves the pending listen promise. */
  function resolveIntent(intent: SpeechIntent) {
    setManualButtons(false)
    const res = intentResolveRef.current
    if (res) {
      intentResolveRef.current = null
      res(intent)
    }
  }

  // ─── Exercise flow (3 questions) ──────────────────────────────────────────

  async function runExercise(actionId: string) {
    setInExercise(true)
    for (let i = 0; i < EXERCISE_QUESTIONS.length; i++) {
      setExerciseStep(i)
      await speak(EXERCISE_QUESTIONS[i])
      await listen("exercise")
      setState("processing")
      await delay(700)
    }
    setExerciseStep(EXERCISE_QUESTIONS.length)
    await speak("Thank you! Exercise complete. You did great.")
    try {
      await submitDeviceResponse({ action_id: actionId, response: "yes" })
    } catch { /* noop */ }
    setInExercise(false)
    setExerciseStep(0)
  }

  // ─── Core state machine: process one action ───────────────────────────────

  async function processAction(action: DeviceAction) {
    runningRef.current = true
    processedIds.current.add(action.id)

    try {
      // SPEAKING
      await speak(action.text_to_speak)

      // LISTENING — retry once on "unknown"
      let intent = await listen("response")
      if (intent === "unknown") {
        await speak("Sorry, I didn't catch that. Please tap a button.")
        intent = await listen("response")
      }

      // PROCESSING
      setState("processing")
      setManualButtons(false)
      await delay(600)

      if (intent === "yes" || intent === "no") {
        try {
          await submitDeviceResponse({ action_id: action.id, response: intent })
        } catch { /* noop */ }

      } else if (intent === "later") {
        try {
          await submitDeviceResponse({ action_id: action.id, response: "later" })
        } catch { /* noop */ }
        await speak("Okay, I'll remind you again in a few minutes.")

      } else if (intent === "exercise") {
        await runExercise(action.id)

      } else if (intent === "play_message") {
        setState("speaking")
        setMessage("Playing your message now…")
        if (action.audio_url && !USE_MOCK) {
          try { await playAudio(action.audio_url) } catch { await delay(2000) }
        } else {
          await delay(2000)
        }
        try {
          await submitDeviceResponse({ action_id: action.id, response: "yes" })
        } catch { /* noop */ }

      } else if (intent === "help") {
        // Show the help modal; modal handles the rest
        setShowHelp(true)

      } else {
        // Unhandled / second-unknown: submit "no" to clear and continue
        try {
          await submitDeviceResponse({ action_id: action.id, response: "no" })
        } catch { /* noop */ }
      }
    } finally {
      runningRef.current = false
      setMessage(null)
      setState("idle")
      setManualButtons(false)
      setInExercise(false)
      refresh()
    }
  }

  // ─── Watch for new actions ────────────────────────────────────────────────

  useEffect(() => {
    if (runningRef.current || state !== "idle") return
    const next = actions.find((a) => !processedIds.current.has(a.id))
    if (next) {
      void processAction(next)
    }
    // processAction is intentionally omitted from deps — it's stable enough for
    // our use case (only called when state is idle & not running)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions, state])

  // ─── Help: notify caregiver ───────────────────────────────────────────────

  async function handleNotifyCaregiver() {
    setShowHelp(false)
    // If there's a pending intent wait (e.g., help was triggered mid-listening),
    // cancel it gracefully so processAction can finish
    if (intentResolveRef.current) {
      const res = intentResolveRef.current
      intentResolveRef.current = null
      res("no")
    }
    try {
      await submitHelpRequest({ type: "notify_caregiver" })
    } catch { /* noop */ }
    // Show confirmation (reuse speaking state styling without re-entering the FSM)
    setState("speaking")
    setMessage(`Your caregiver ${CAREGIVER_NAME} has been notified. They'll be in touch soon.`)
    await delay(3500)
    setMessage(null)
    setState("idle")
    refresh()
  }

  // ─── Derived UI values ────────────────────────────────────────────────────

  const circleColor = CIRCLE_COLOR[state]
  const ringColor = RING_COLOR[state]
  const stateLabel = STATE_LABEL[state]
  const stateSublabel = STATE_SUBLABEL[state]

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-between py-10 px-6 select-none">

      {/* ── Top status pill ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/10">
        <span
          className={`w-3 h-3 rounded-full ${
            state === "idle"
              ? "bg-gray-400"
              : state === "speaking"
                ? "bg-violet-400 animate-pulse"
                : state === "listening"
                  ? "bg-emerald-400 animate-pulse"
                  : "bg-amber-400 animate-pulse"
          }`}
        />
        <span className="text-white/60 text-sm font-medium capitalize tracking-wide">
          {state}
        </span>
      </div>

      {/* ── Centre section ────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-8 w-full max-w-sm">

        {/* Main circle */}
        <div
          className={[
            "w-56 h-56 rounded-full",
            circleColor,
            "ring-8",
            ringColor,
            "flex items-center justify-center",
            "shadow-2xl transition-all duration-500",
            state === "idle" ? "animate-pulse" : "",
          ].join(" ")}
        >
          {/* Idle — microphone icon */}
          {state === "idle" && (
            <svg
              className="w-24 h-24 text-white/90"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          )}

          {/* Speaking — animated sound bars */}
          {state === "speaking" && (
            <div className="flex items-center gap-2 h-20 px-3">
              {[44, 68, 56, 68, 44].map((h, i) => (
                <div
                  key={i}
                  className="soundbar w-3.5 bg-white/85 rounded-full"
                  style={{
                    height: `${h}px`,
                    animationDelay: `${i * 0.12}s`,
                    animationDuration: "0.65s",
                  }}
                />
              ))}
            </div>
          )}

          {/* Listening — animated sound bars (slower) */}
          {state === "listening" && (
            <div className="flex items-end gap-2 h-16 px-2">
              {[28, 48, 60, 48, 28].map((h, i) => (
                <div
                  key={i}
                  className="soundbar w-3.5 bg-white/80 rounded-full"
                  style={{
                    height: `${h}px`,
                    animationDelay: `${i * 0.15}s`,
                    animationDuration: "0.9s",
                  }}
                />
              ))}
            </div>
          )}

          {/* Processing — spinner */}
          {state === "processing" && (
            <svg
              className="w-20 h-20 text-white/90 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
          )}
        </div>

        {/* Text */}
        <div className="text-center space-y-3 px-4 w-full">
          <p className="text-white text-3xl font-bold tracking-tight leading-tight">
            {stateLabel}
          </p>
          {message ? (
            <p className="text-white/80 text-xl leading-relaxed">{message}</p>
          ) : (
            <p className="text-white/40 text-lg">{stateSublabel}</p>
          )}
        </div>

        {/* Exercise progress dots */}
        {inExercise && (
          <div className="flex items-center gap-3">
            {EXERCISE_QUESTIONS.map((_, i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full transition-all duration-300 ${
                  i < exerciseStep
                    ? "bg-emerald-400"
                    : i === exerciseStep
                      ? "bg-white scale-125"
                      : "bg-white/20"
                }`}
              />
            ))}
            <span className="text-white/50 text-base ml-1">
              {exerciseStep < EXERCISE_QUESTIONS.length
                ? `${exerciseStep + 1} / ${EXERCISE_QUESTIONS.length}`
                : "Done!"}
            </span>
          </div>
        )}

        {/* Manual response buttons — always shown during listening for demo reliability */}
        {manualButtons && state === "listening" && (
          <div className="flex gap-3 w-full mt-2">
            {listenMode === "response" ? (
              <>
                <button
                  onClick={() => resolveIntent("yes")}
                  style={{ touchAction: "manipulation" }}
                  className="flex-1 py-5 rounded-2xl bg-emerald-500 text-white text-xl font-bold hover:bg-emerald-400 active:scale-95 transition-all shadow-lg"
                >
                  Yes ✓
                </button>
                <button
                  onClick={() => resolveIntent("later")}
                  style={{ touchAction: "manipulation" }}
                  className="flex-1 py-5 rounded-2xl bg-amber-500 text-white text-xl font-bold hover:bg-amber-400 active:scale-95 transition-all shadow-lg"
                >
                  Later ⏱
                </button>
                <button
                  onClick={() => resolveIntent("no")}
                  style={{ touchAction: "manipulation" }}
                  className="flex-1 py-5 rounded-2xl bg-gray-600 text-white text-xl font-bold hover:bg-gray-500 active:scale-95 transition-all shadow-lg"
                >
                  No ✗
                </button>
              </>
            ) : (
              <button
                onClick={() => resolveIntent("yes")}
                style={{ touchAction: "manipulation" }}
                className="flex-1 py-5 rounded-2xl bg-indigo-600 text-white text-xl font-bold hover:bg-indigo-500 active:scale-95 transition-all shadow-lg"
              >
                Continue →
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Help button (always visible) ──────────────────────────────────── */}
      <button
        onClick={() => setShowHelp(true)}
        style={{ touchAction: "manipulation" }}
        className="flex items-center gap-2.5 px-7 py-4 rounded-2xl bg-red-500/15 border border-red-500/25 text-red-300 text-lg font-semibold hover:bg-red-500/25 active:scale-95 transition-all"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
        I need help
      </button>

      {/* ── Help modal ────────────────────────────────────────────────────── */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-8 z-50">
          <div className="bg-gray-900 border border-white/10 rounded-3xl p-8 max-w-sm w-full text-center space-y-7 shadow-2xl">
            <p className="text-white text-2xl font-semibold leading-snug">
              Do you want to keep talking with me, or should I notify your caregiver?
            </p>
            <div className="flex flex-col gap-4">
              <button
                onClick={() => setShowHelp(false)}
                style={{ touchAction: "manipulation" }}
                className="w-full py-5 rounded-2xl bg-indigo-600 text-white text-xl font-bold hover:bg-indigo-500 active:scale-95 transition-all"
              >
                Keep talking with me
              </button>
              <button
                onClick={() => void handleNotifyCaregiver()}
                style={{ touchAction: "manipulation" }}
                className="w-full py-5 rounded-2xl bg-red-600 text-white text-xl font-bold hover:bg-red-500 active:scale-95 transition-all"
              >
                Notify my caregiver →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
