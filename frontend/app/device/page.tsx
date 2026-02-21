"use client"

import { useCallback, useEffect, useRef, useState } from "react"

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8000"

const POST_TTS_DELAY_MS = 350
const RESIDENT_NAME = "Simone"

type State = "idle" | "recording" | "transcribing" | "speaking" | "error"

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

async function transcribeBlob(blob: Blob): Promise<string> {
  const form = new FormData()
  form.append("audio", blob, "recording.webm")
  const res = await fetch(`${BACKEND_URL}/api/stt/transcribe`, { method: "POST", body: form })
  if (!res.ok) throw new Error(`STT ${res.status}: ${await res.text()}`)
  return ((await res.json()) as { text: string }).text ?? ""
}

async function speakText(text: string, onStart?: () => void, onEnd?: () => void): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/api/tts/speak`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  })
  if (!res.ok) throw new Error(`TTS ${res.status}: ${await res.text()}`)
  const audioCtx = new AudioContext()
  const audioBuffer = await audioCtx.decodeAudioData(await res.arrayBuffer())
  const source = audioCtx.createBufferSource()
  source.buffer = audioBuffer
  source.connect(audioCtx.destination)
  await new Promise<void>((resolve, reject) => {
    source.onended = () => resolve()
    try { onStart?.(); source.start(0) } catch (e) { reject(e) }
  })
  onEnd?.()
  await audioCtx.close()
}

// ── State-based design tokens ──────────────────────────────────────────────────

const ORB_BG: Record<State, string> = {
  idle:         "bg-indigo-600",
  recording:    "bg-emerald-500",
  transcribing: "bg-amber-500",
  speaking:     "bg-violet-600",
  error:        "bg-red-600",
}

const ORB_GLOW: Record<State, string> = {
  idle:         "shadow-[0_0_80px_20px_rgba(99,102,241,0.35)]",
  recording:    "shadow-[0_0_80px_20px_rgba(16,185,129,0.45)]",
  transcribing: "shadow-[0_0_80px_20px_rgba(245,158,11,0.40)]",
  speaking:     "shadow-[0_0_80px_20px_rgba(139,92,246,0.40)]",
  error:        "shadow-[0_0_80px_20px_rgba(239,68,68,0.35)]",
}

const ORB_RING: Record<State, string> = {
  idle:         "ring-indigo-400/30",
  recording:    "ring-emerald-400/40",
  transcribing: "ring-amber-400/30",
  speaking:     "ring-violet-400/30",
  error:        "ring-red-400/30",
}

const LABEL: Record<State, string> = {
  idle:         `Hello, ${RESIDENT_NAME}`,
  recording:    "Listening…",
  transcribing: "Processing…",
  speaking:     "Speaking…",
  error:        "Something went wrong",
}

const SUBLABEL: Record<State, string> = {
  idle:         "Tap the circle to speak",
  recording:    "Tap again to stop",
  transcribing: "One moment…",
  speaking:     "",
  error:        "Tap to try again",
}

// ── Soundbar ───────────────────────────────────────────────────────────────────

function Soundbars({ heights, duration = "0.65s" }: { heights: number[]; duration?: string }) {
  return (
    <div className="flex items-center gap-2">
      {heights.map((h, i) => (
        <div
          key={i}
          className="soundbar rounded-full bg-white/90"
          style={{ width: 12, height: h, animationDelay: `${i * 0.13}s`, animationDuration: duration }}
        />
      ))}
    </div>
  )
}

// ── Clock ──────────────────────────────────────────────────────────────────────

function Clock() {
  const [time, setTime] = useState("")
  useEffect(() => {
    const fmt = () =>
      new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    setTime(fmt())
    const id = setInterval(() => setTime(fmt()), 10_000)
    return () => clearInterval(id)
  }, [])
  return <span className="text-white/40 text-lg font-light tabular-nums">{time}</span>
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function DevicePage() {
  const [state, setState] = useState<State>("idle")
  const [transcript, setTranscript] = useState("")
  const [message, setMessage] = useState("")
  const [errorMsg, setErrorMsg] = useState("")
  const [ttsInput, setTtsInput] = useState("")
  const [showTts, setShowTts] = useState(false)

  const isSpeakingRef = useRef(false)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  // ── Recording ──────────────────────────────────────────────────────────────

  const startRecording = useCallback(async () => {
    if (isSpeakingRef.current || state !== "idle") return
    setErrorMsg("")
    setTranscript("")

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    } catch {
      setErrorMsg("Microphone access denied. Please allow mic permissions.")
      setState("error")
      return
    }

    const recorder = new MediaRecorder(stream)
    chunksRef.current = []
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop())
      setState("transcribing")
      try {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" })
        const text = await transcribeBlob(blob)
        setTranscript(text)
        setState("idle")
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        setErrorMsg(msg)
        setState("error")
      }
    }

    recorderRef.current = recorder
    recorder.start()
    setState("recording")
  }, [state])

  const stopRecording = useCallback(() => {
    const r = recorderRef.current
    if (!r || r.state === "inactive") return
    r.stop()
  }, [])

  const handleOrbTap = useCallback(() => {
    if (state === "idle" || state === "error") startRecording()
    else if (state === "recording") stopRecording()
  }, [state, startRecording, stopRecording])

  // ── TTS ────────────────────────────────────────────────────────────────────

  const handleSpeak = useCallback(async (text: string) => {
    if (!text.trim() || state === "recording" || state === "transcribing" || state === "speaking") return
    setErrorMsg("")
    setState("speaking")
    isSpeakingRef.current = true
    setMessage(text)
    try {
      await speakText(text)
      await delay(POST_TTS_DELAY_MS)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err))
      setState("error")
    } finally {
      isSpeakingRef.current = false
      setMessage("")
      if (state !== "error") setState("idle")
    }
  }, [state]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Help ───────────────────────────────────────────────────────────────────

  const [showHelp, setShowHelp] = useState(false)

  // ── Render ─────────────────────────────────────────────────────────────────

  const orbTappable = state === "idle" || state === "recording" || state === "error"

  return (
    <div className="h-screen w-full bg-gray-950 flex flex-col items-center justify-between py-8 px-6 select-none overflow-hidden">

      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <div className="w-full flex items-center justify-between max-w-sm">
        <Clock />
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] border border-white/[0.08]">
          <span className={`w-2 h-2 rounded-full transition-colors duration-500 ${
            state === "idle"         ? "bg-gray-500" :
            state === "recording"   ? "bg-emerald-400 animate-pulse" :
            state === "transcribing"? "bg-amber-400 animate-pulse" :
            state === "speaking"    ? "bg-violet-400 animate-pulse" :
                                      "bg-red-400"
          }`} />
          <span className="text-white/50 text-sm font-medium capitalize tracking-wide">{state}</span>
        </div>
      </div>

      {/* ── Centre section ───────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-8 w-full max-w-sm flex-1 justify-center">

        {/* Orb */}
        <button
          onClick={handleOrbTap}
          disabled={!orbTappable}
          aria-label={state === "recording" ? "Stop recording" : "Start recording"}
          className={[
            "w-56 h-56 rounded-full flex items-center justify-center",
            "ring-8 transition-all duration-500",
            "focus:outline-none active:scale-95",
            orbTappable ? "cursor-pointer" : "cursor-default",
            ORB_BG[state],
            ORB_GLOW[state],
            ORB_RING[state],
            state === "recording" ? "animate-pulse" : "",
          ].join(" ")}
        >
          {/* Idle / Error — mic */}
          {(state === "idle" || state === "error") && (
            <svg className="w-24 h-24 text-white/90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.3}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          )}

          {/* Recording */}
          {state === "recording" && (
            <Soundbars heights={[40, 64, 52, 64, 40]} duration="0.6s" />
          )}

          {/* Transcribing — spinner */}
          {state === "transcribing" && (
            <svg className="w-20 h-20 text-white/90 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          )}

          {/* Speaking */}
          {state === "speaking" && (
            <Soundbars heights={[48, 72, 60, 72, 48]} duration="0.65s" />
          )}
        </button>

        {/* Labels */}
        <div className="text-center space-y-2 px-4 w-full">
          <p className="text-white text-4xl font-bold tracking-tight leading-tight">
            {LABEL[state]}
          </p>
          {message ? (
            <p className="text-white/75 text-xl leading-relaxed mt-2">{message}</p>
          ) : (
            <p className="text-white/40 text-xl">{SUBLABEL[state]}</p>
          )}
        </div>

        {/* Transcript */}
        {transcript && state === "idle" && (
          <div className="w-full rounded-3xl bg-white/[0.06] border border-white/[0.08] px-6 py-5">
            <p className="text-xs font-semibold tracking-widest text-white/25 uppercase mb-2">You said</p>
            <p className="text-white text-lg leading-relaxed">{transcript}</p>
          </div>
        )}

        {/* Error message */}
        {state === "error" && errorMsg && (
          <div className="w-full rounded-3xl bg-red-950/60 border border-red-500/20 px-6 py-4">
            <p className="text-red-300 text-base leading-relaxed">{errorMsg}</p>
          </div>
        )}

        {/* TTS panel — hidden by default, accessible via small button */}
        {showTts && (
          <div className="w-full flex flex-col gap-3">
            <div className="flex gap-2">
              <textarea
                value={ttsInput}
                onChange={(e) => setTtsInput(e.target.value)}
                rows={2}
                placeholder="Type something to speak…"
                className="flex-1 rounded-2xl bg-white/[0.06] border border-white/[0.08] px-4 py-3 text-white text-base resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/60 placeholder:text-white/25"
              />
              <button
                onClick={() => handleSpeak(ttsInput)}
                disabled={state !== "idle" || !ttsInput.trim()}
                className="px-5 rounded-2xl bg-violet-600 text-white font-bold text-base hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
              >
                ▶
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom controls ───────────────────────────────────────────────────── */}
      <div className="w-full max-w-sm flex items-center justify-between">

        {/* TTS toggle — subtle */}
        <button
          onClick={() => setShowTts((v) => !v)}
          className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/[0.05] border border-white/[0.07] text-white/35 text-sm font-medium hover:text-white/60 hover:bg-white/[0.08] active:scale-95 transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M15.536 8.464a5 5 0 010 7.072M12 6v12m0 0c-1.657 0-3-1.343-3-3V9a3 3 0 016 0v6c0 1.657-1.343 3-3 3z" />
          </svg>
          TTS
        </button>

        {/* Help */}
        <button
          onClick={() => setShowHelp(true)}
          className="flex items-center gap-2.5 px-6 py-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-lg font-semibold hover:bg-red-500/20 active:scale-95 transition-all"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          I need help
        </button>
      </div>

      {/* ── Help modal ────────────────────────────────────────────────────────── */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-8 z-50">
          <div className="bg-gray-900 border border-white/10 rounded-3xl p-8 max-w-sm w-full text-center space-y-6 shadow-2xl">
            <p className="text-white text-2xl font-semibold leading-snug">
              Do you need assistance?
            </p>
            <div className="flex flex-col gap-4">
              <button
                onClick={() => setShowHelp(false)}
                className="w-full py-5 rounded-2xl bg-indigo-600 text-white text-xl font-bold hover:bg-indigo-500 active:scale-95 transition-all"
              >
                I&apos;m fine, close
              </button>
              <button
                onClick={() => {
                  setShowHelp(false)
                  handleSpeak("Your caregiver has been notified and will be with you soon.")
                }}
                className="w-full py-5 rounded-2xl bg-red-600 text-white text-xl font-bold hover:bg-red-500 active:scale-95 transition-all"
              >
                Notify my caregiver →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Soundbar keyframe */}
      <style>{`
        .soundbar {
          animation: sb 0.65s ease-in-out infinite alternate;
        }
        @keyframes sb {
          from { transform: scaleY(0.25); }
          to   { transform: scaleY(1); }
        }
      `}</style>
    </div>
  )
}
