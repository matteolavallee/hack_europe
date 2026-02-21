"use client"

import { useCallback, useRef, useState } from "react"

// ─── Config ───────────────────────────────────────────────────────────────────

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8000"

/** Milliseconds to wait after TTS playback finishes before starting STT (echo avoidance). */
const POST_TTS_DELAY_MS = 300

// ─── Types ────────────────────────────────────────────────────────────────────

type PageState =
  | "idle"
  | "recording"
  | "transcribing"
  | "speaking"
  | "error"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms))
}

async function transcribeBlob(blob: Blob): Promise<string> {
  const form = new FormData()
  form.append("audio", blob, "recording.webm")

  const res = await fetch(`${BACKEND_URL}/api/stt/transcribe`, {
    method: "POST",
    body: form,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`STT ${res.status}: ${text}`)
  }

  const json = (await res.json()) as { text: string }
  return json.text ?? ""
}

async function speakText(
  text: string,
  onStart?: () => void,
  onEnd?: () => void,
): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/api/tts/speak`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`TTS ${res.status}: ${errText}`)
  }

  const arrayBuffer = await res.arrayBuffer()
  const audioCtx = new AudioContext()
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
  const source = audioCtx.createBufferSource()
  source.buffer = audioBuffer
  source.connect(audioCtx.destination)

  await new Promise<void>((resolve, reject) => {
    source.onended = () => resolve()
    try {
      onStart?.()
      source.start(0)
    } catch (err) {
      reject(err)
    }
  })

  onEnd?.()
  await audioCtx.close()
}

// ─── State label helpers ───────────────────────────────────────────────────────

const STATE_LABEL: Record<PageState, string> = {
  idle: "Ready",
  recording: "Recording…",
  transcribing: "Transcribing…",
  speaking: "Speaking…",
  error: "Error",
}

const STATE_COLOR: Record<PageState, string> = {
  idle: "bg-indigo-600",
  recording: "bg-emerald-600",
  transcribing: "bg-amber-500",
  speaking: "bg-violet-600",
  error: "bg-red-600",
}

const STATE_RING: Record<PageState, string> = {
  idle: "ring-indigo-400/40",
  recording: "ring-emerald-400/40",
  transcribing: "ring-amber-400/40",
  speaking: "ring-violet-400/40",
  error: "ring-red-400/40",
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DeviceVoiceTestPage() {
  const [pageState, setPageState] = useState<PageState>("idle")
  const [transcript, setTranscript] = useState<string>("")
  const [ttsText, setTtsText] = useState<string>("Got it.")
  const [errorMsg, setErrorMsg] = useState<string>("")
  const [log, setLog] = useState<string[]>([])

  /** True while TTS audio is playing — used to block recording start. */
  const isSpeakingRef = useRef(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const addLog = useCallback((msg: string) => {
    setLog((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50))
  }, [])

  // ─── Start recording ─────────────────────────────────────────────────────

  const startRecording = useCallback(async () => {
    if (isSpeakingRef.current) {
      addLog("Cannot record while TTS is playing.")
      return
    }
    if (pageState !== "idle") return

    setErrorMsg("")

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    } catch {
      setErrorMsg("Microphone access denied. Please allow mic permissions and reload.")
      setPageState("error")
      addLog("ERROR: microphone permission denied")
      return
    }

    const recorder = new MediaRecorder(stream)
    chunksRef.current = []

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop())
      const blob = new Blob(chunksRef.current, { type: "audio/webm" })
      addLog(`Recording stopped — ${(blob.size / 1024).toFixed(1)} KB`)
      await handleTranscribe(blob)
    }

    mediaRecorderRef.current = recorder
    recorder.start()
    setPageState("recording")
    addLog("Recording started")
  }, [pageState, addLog]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Stop recording ──────────────────────────────────────────────────────

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (!recorder || recorder.state === "inactive") return
    recorder.stop()
    setPageState("transcribing")
    addLog("Stopping recording…")
  }, [addLog])

  // ─── Transcribe blob ─────────────────────────────────────────────────────

  const handleTranscribe = useCallback(async (blob: Blob) => {
    addLog("Sending audio to /api/stt/transcribe…")
    try {
      const text = await transcribeBlob(blob)
      setTranscript(text)
      addLog(`Transcript: "${text}"`)
      setPageState("idle")
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMsg(msg)
      setPageState("error")
      addLog(`ERROR (STT): ${msg}`)
    }
  }, [addLog])

  // ─── Speak ───────────────────────────────────────────────────────────────

  const handleSpeak = useCallback(async () => {
    if (pageState !== "idle" && pageState !== "error") return
    if (!ttsText.trim()) {
      setErrorMsg("Enter text to speak.")
      return
    }

    setErrorMsg("")
    setPageState("speaking")
    isSpeakingRef.current = true
    addLog(`Calling /api/tts/speak with: "${ttsText}"`)

    try {
      await speakText(
        ttsText,
        () => addLog("TTS playback started"),
        () => addLog("TTS playback ended"),
      )
      addLog(`Waiting ${POST_TTS_DELAY_MS} ms (echo avoidance)…`)
      await delay(POST_TTS_DELAY_MS)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMsg(msg)
      addLog(`ERROR (TTS): ${msg}`)
      setPageState("error")
    } finally {
      isSpeakingRef.current = false
      if (pageState !== "error") setPageState("idle")
    }
  }, [pageState, ttsText, addLog]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Clear ───────────────────────────────────────────────────────────────

  const handleClear = useCallback(() => {
    setTranscript("")
    setErrorMsg("")
    setLog([])
    setPageState("idle")
  }, [])

  // ─── Render ───────────────────────────────────────────────────────────────

  const circleColor = STATE_COLOR[pageState]
  const ringColor = STATE_RING[pageState]
  const label = STATE_LABEL[pageState]

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center py-10 px-5 gap-8 select-none">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-xs font-semibold tracking-widest text-white/30 uppercase">
          Voice STT + TTS
        </span>
        <h1 className="text-2xl font-bold tracking-tight">Device Voice Test</h1>
        <p className="text-sm text-white/40 text-center max-w-xs">
          Test page — not part of the main device UI.
        </p>
      </div>

      {/* ── Status circle ────────────────────────────────────────────────── */}
      <div
        className={[
          "w-36 h-36 rounded-full flex items-center justify-center",
          "ring-8 shadow-2xl transition-all duration-500",
          circleColor,
          ringColor,
          pageState === "recording" ? "animate-pulse" : "",
        ].join(" ")}
      >
        {/* Mic icon */}
        {(pageState === "idle" || pageState === "error") && (
          <svg className="w-14 h-14 text-white/90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.4}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        )}
        {/* Sound bars for recording / speaking */}
        {(pageState === "recording" || pageState === "speaking") && (
          <div className="flex items-center gap-1.5 h-14 px-2">
            {[32, 52, 44, 52, 32].map((h, i) => (
              <div
                key={i}
                className="soundbar w-2.5 bg-white/85 rounded-full"
                style={{ height: `${h}px`, animationDelay: `${i * 0.12}s` }}
              />
            ))}
          </div>
        )}
        {/* Spinner for transcribing */}
        {pageState === "transcribing" && (
          <svg className="w-14 h-14 text-white/90 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        )}
      </div>

      {/* Status label */}
      <p className="text-lg font-semibold tracking-wide">{label}</p>

      {/* ── Error banner ─────────────────────────────────────────────────── */}
      {errorMsg && (
        <div className="w-full max-w-md rounded-2xl bg-red-900/40 border border-red-500/30 px-5 py-4 text-red-300 text-sm leading-relaxed">
          <span className="font-bold text-red-400">Error: </span>{errorMsg}
        </div>
      )}

      {/* ── Section A: STT ───────────────────────────────────────────────── */}
      <section className="w-full max-w-md flex flex-col gap-3">
        <h2 className="text-xs font-semibold tracking-widest text-white/30 uppercase">
          A — Speech-to-Text (Whisper)
        </h2>
        <div className="flex gap-3">
          <button
            onClick={startRecording}
            disabled={pageState !== "idle"}
            className="flex-1 py-4 rounded-2xl bg-emerald-600 text-white font-bold text-base hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
          >
            {pageState === "recording" ? "● Recording…" : "▶ Start Recording"}
          </button>
          <button
            onClick={stopRecording}
            disabled={pageState !== "recording"}
            className="flex-1 py-4 rounded-2xl bg-gray-700 text-white font-bold text-base hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
          >
            ■ Stop
          </button>
        </div>

        {/* Transcript output */}
        <div className="rounded-2xl bg-white/5 border border-white/10 px-5 py-4 min-h-[80px]">
          <p className="text-xs text-white/30 mb-1 font-medium uppercase tracking-wider">Transcript</p>
          <p className="text-white text-base leading-relaxed">
            {transcript || <span className="text-white/25 italic">Will appear here after recording…</span>}
          </p>
        </div>
      </section>

      {/* ── Section B: TTS ───────────────────────────────────────────────── */}
      <section className="w-full max-w-md flex flex-col gap-3">
        <h2 className="text-xs font-semibold tracking-widest text-white/30 uppercase">
          B — Text-to-Speech (ElevenLabs)
        </h2>
        <textarea
          value={ttsText}
          onChange={(e) => setTtsText(e.target.value)}
          rows={3}
          placeholder="Enter text to synthesize…"
          className="w-full rounded-2xl bg-white/5 border border-white/10 px-5 py-3 text-white text-base resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-white/25"
        />
        <button
          onClick={handleSpeak}
          disabled={pageState === "recording" || pageState === "transcribing" || pageState === "speaking"}
          className="w-full py-4 rounded-2xl bg-violet-600 text-white font-bold text-base hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
        >
          {pageState === "speaking" ? "🔊 Playing…" : "🔊 Speak Text"}
        </button>
        <p className="text-xs text-white/30 text-center">
          Echo avoidance: recording is blocked while TTS is playing, and {POST_TTS_DELAY_MS} ms cooldown after.
        </p>
      </section>

      {/* ── Section C: Clear ────────────────────────────────────────────── */}
      <button
        onClick={handleClear}
        className="text-sm text-white/30 hover:text-white/60 underline underline-offset-4 transition-colors"
      >
        Clear
      </button>

      {/* ── Activity log ─────────────────────────────────────────────────── */}
      <section className="w-full max-w-md flex flex-col gap-2">
        <h2 className="text-xs font-semibold tracking-widest text-white/30 uppercase">
          Activity Log
        </h2>
        <div className="rounded-2xl bg-black/40 border border-white/5 px-4 py-3 h-48 overflow-y-auto flex flex-col gap-0.5">
          {log.length === 0 && (
            <p className="text-white/20 text-xs italic">No activity yet.</p>
          )}
          {log.map((entry, i) => (
            <p key={i} className="text-xs font-mono text-white/50 leading-5">{entry}</p>
          ))}
        </div>
      </section>

      {/* ── Info footer ──────────────────────────────────────────────────── */}
      <p className="text-xs text-white/20 text-center max-w-xs pb-4">
        Backend: <code className="text-white/35">{BACKEND_URL}</code>
      </p>

      {/* Soundbar animation */}
      <style>{`
        .soundbar {
          animation: soundbar-bounce 0.65s ease-in-out infinite alternate;
        }
        @keyframes soundbar-bounce {
          from { transform: scaleY(0.3); }
          to   { transform: scaleY(1); }
        }
      `}</style>
    </div>
  )
}
