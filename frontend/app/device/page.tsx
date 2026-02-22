"use client"

import { useCallback, useEffect, useRef, useState } from "react"

// ─── Config ───────────────────────────────────────────────────────────────────

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8000"

// ElevenLabs called directly from the browser (avoids datacenter IP blocks on free tier)
const ELEVENLABS_API_KEY  = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY  ?? ""
const ELEVENLABS_VOICE_ID = process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID ?? "21m00Tcm4TlvDq8ikWAM"
const ELEVENLABS_MODEL_ID = process.env.NEXT_PUBLIC_ELEVENLABS_MODEL_ID ?? "eleven_turbo_v2"

const POST_TTS_DELAY_MS = 350
const RESIDENT_NAME = "Simone"

// ─── Types ────────────────────────────────────────────────────────────────────

type State = "idle" | "recording" | "transcribing" | "speaking" | "error"

// ─── API helpers ──────────────────────────────────────────────────────────────

function pause(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

async function transcribeBlob(blob: Blob): Promise<string> {
  const form = new FormData()
  form.append("audio", blob, "recording.webm")
  const res = await fetch(`${BACKEND_URL}/api/stt/transcribe`, { method: "POST", body: form })
  if (!res.ok) throw new Error(`STT error ${res.status}`)
  return ((await res.json()) as { text: string }).text ?? ""
}

async function speakText(text: string, onStart?: () => void, onEnd?: () => void): Promise<void> {
  if (!ELEVENLABS_API_KEY) throw new Error("NEXT_PUBLIC_ELEVENLABS_API_KEY is not set.")

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: ELEVENLABS_MODEL_ID,
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    }
  )
  if (!res.ok) throw new Error(`TTS error ${res.status}: ${await res.text()}`)
  const audioCtx = new AudioContext()
  const buf = await audioCtx.decodeAudioData(await res.arrayBuffer())
  const src = audioCtx.createBufferSource()
  src.buffer = buf
  src.connect(audioCtx.destination)
  await new Promise<void>((resolve, reject) => {
    src.onended = () => resolve()
    try { onStart?.(); src.start(0) } catch (e) { reject(e) }
  })
  onEnd?.()
  await audioCtx.close()
}

// ─── Design tokens per state ──────────────────────────────────────────────────

const TOKEN = {
  idle:         { orb: "#00a0dc", glow: "rgba(0,160,220,0.45)",  ring: "rgba(0,160,220,0.2)",   label: `Hello, ${RESIDENT_NAME}`, sub: "Tap to speak" },
  recording:    { orb: "#16a34a", glow: "rgba(22,163,74,0.45)",  ring: "rgba(22,163,74,0.2)",   label: "Listening…",              sub: "Tap again to stop" },
  transcribing: { orb: "#d97706", glow: "rgba(217,119,6,0.4)",   ring: "rgba(217,119,6,0.18)",  label: "Processing…",            sub: "One moment…" },
  speaking:     { orb: "#0077b3", glow: "rgba(0,119,179,0.45)",  ring: "rgba(0,119,179,0.2)",   label: "Speaking…",              sub: "" },
  error:        { orb: "#dc2626", glow: "rgba(220,38,38,0.35)",  ring: "rgba(220,38,38,0.15)",  label: "Tap to try again",        sub: "" },
} satisfies Record<State, { orb: string; glow: string; ring: string; label: string; sub: string }>

// ─── Sub-components ───────────────────────────────────────────────────────────

function Clock() {
  const [time, setTime] = useState("")
  useEffect(() => {
    const fmt = () => new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    setTime(fmt())
    const id = setInterval(() => setTime(fmt()), 15_000)
    return () => clearInterval(id)
  }, [])
  return <>{time}</>
}

function Bars({ n, heights, delay, dur }: { n: number; heights: number[]; delay: number; dur: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {Array.from({ length: n }).map((_, i) => (
        <div
          key={i}
          className="bar"
          style={{
            width: 13,
            height: heights[i % heights.length],
            borderRadius: 999,
            background: "rgba(255,255,255,0.9)",
            animationDelay: `${delay + i * 0.13}s`,
            animationDuration: dur,
          }}
        />
      ))}
    </div>
  )
}

function OrbIcon({ state }: { state: State }) {
  if (state === "recording") return <Bars n={5} heights={[36, 60, 48, 60, 36]} delay={0} dur="0.6s" />
  if (state === "speaking")  return <Bars n={5} heights={[44, 72, 56, 72, 44]} delay={0} dur="0.65s" />
  if (state === "transcribing") return (
    <svg width="72" height="72" viewBox="0 0 24 24" fill="none" style={{ animation: "spin 1s linear infinite" }}>
      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)" strokeWidth="3"/>
      <path d="M4 12a8 8 0 018-8v8H4z" fill="rgba(255,255,255,0.85)"/>
    </svg>
  )
  if (state === "error") return (
    <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" strokeLinecap="round">
      <path d="M18 6L6 18M6 6l12 12"/>
    </svg>
  )
  // idle — mic
  return (
    <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
    </svg>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DevicePage() {
  const [state, setState] = useState<State>("idle")
  const [transcript, setTranscript]   = useState("")
  const [message, setMessage]         = useState("")
  const [errorMsg, setErrorMsg]       = useState("")
  const [ttsInput, setTtsInput]       = useState("")
  const [showTts, setShowTts]         = useState(false)
  const [showHelp, setShowHelp]       = useState(false)

  const speakingRef = useRef(false)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef   = useRef<Blob[]>([])

  const tok = TOKEN[state]

  // ── Recording ────────────────────────────────────────────────────────────────

  const startRecording = useCallback(async () => {
    if (speakingRef.current || state !== "idle") return
    setErrorMsg(""); setTranscript("")

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
        setErrorMsg(err instanceof Error ? err.message : "Transcription failed")
        setState("error")
      }
    }
    recorderRef.current = recorder
    recorder.start()
    setState("recording")
  }, [state])

  const stopRecording = useCallback(() => {
    const r = recorderRef.current
    if (r && r.state !== "inactive") r.stop()
  }, [])

  const handleOrbTap = useCallback(() => {
    if (state === "idle" || state === "error") startRecording()
    else if (state === "recording") stopRecording()
  }, [state, startRecording, stopRecording])

  // ── TTS ──────────────────────────────────────────────────────────────────────

  const handleSpeak = useCallback(async (text: string) => {
    if (!text.trim() || state === "recording" || state === "transcribing" || state === "speaking") return
    setErrorMsg("")
    setState("speaking")
    speakingRef.current = true
    setMessage(text)
    try {
      await speakText(text)
      await pause(POST_TTS_DELAY_MS)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "TTS failed")
      setState("error")
    } finally {
      speakingRef.current = false
      setMessage("")
      setState((s) => s === "error" ? "error" : "idle")
    }
  }, [state])

  // ─────────────────────────────────────────────────────────────────────────────

  const orbTappable = state === "idle" || state === "recording" || state === "error"

  return (
    <>
      {/* ── Keyframes ──────────────────────────────────────────────────────────── */}
      <style>{`
        @keyframes bar   { from{transform:scaleY(0.2)} to{transform:scaleY(1)} }
        @keyframes spin  { to{transform:rotate(360deg)} }
        @keyframes rings {
          0%   { transform:scale(1);   opacity:.55 }
          100% { transform:scale(1.9); opacity:0   }
        }
        .bar { animation: bar ease-in-out infinite alternate; }
      `}</style>

      {/* ── Root ───────────────────────────────────────────────────────────────── */}
      <div style={{
        height: "100%",
        width: "100%",
        background: "#f5f6f8",
        display: "grid",
        gridTemplateRows: "64px 1fr 96px",
        overflow: "hidden",
      }}>

        {/* ── Top bar ──────────────────────────────────────────────────────────── */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 32px",
        }}>
          <span style={{ color: "#6b7280", fontSize: 18, fontWeight: 300, fontVariantNumeric: "tabular-nums" }}>
            <Clock />
          </span>

          {/* Status pill */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 18px", borderRadius: 999,
            background: "#ffffff",
            border: "1px solid #e5e7eb",
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: tok.orb,
              boxShadow: `0 0 6px ${tok.glow}`,
              animation: state !== "idle" && state !== "error" ? "bar 1s ease-in-out infinite alternate" : undefined,
            }}/>
            <span style={{ color: "#6b7280", fontSize: 14, fontWeight: 500, textTransform: "capitalize", letterSpacing: "0.04em" }}>
              {state}
            </span>
          </div>
        </div>

        {/* ── Center ───────────────────────────────────────────────────────────── */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 36,
          padding: "0 32px",
        }}>

          {/* Orb */}
          <button
            onClick={handleOrbTap}
            disabled={!orbTappable}
            aria-label={state === "recording" ? "Stop recording" : "Start recording"}
            style={{
              position: "relative",
              width: 240,
              height: 240,
              minWidth: 240,
              borderRadius: "50%",
              background: tok.orb,
              boxShadow: `0 0 80px 16px ${tok.glow}`,
              border: `8px solid ${tok.ring}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: orbTappable ? "pointer" : "default",
              transition: "background 0.4s, box-shadow 0.4s, border-color 0.4s",
              outline: "none",
              flexShrink: 0,
            }}
          >
            {/* Expanding ring animation when recording */}
            {state === "recording" && (
              <>
                <div style={{
                  position: "absolute", inset: -2, borderRadius: "50%",
                  border: `3px solid ${tok.glow}`,
                  animation: "rings 1.4s ease-out infinite",
                }}/>
                <div style={{
                  position: "absolute", inset: -2, borderRadius: "50%",
                  border: `3px solid ${tok.glow}`,
                  animation: "rings 1.4s ease-out 0.7s infinite",
                }}/>
              </>
            )}
            <OrbIcon state={state} />
          </button>

          {/* Text block */}
          <div style={{ textAlign: "center", width: "100%", maxWidth: 480 }}>
            <p style={{
              color: "#2e2e2e",
              fontSize: 48,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              lineHeight: 1.15,
              margin: 0,
              marginBottom: 12,
            }}>
              {state === "speaking" && message ? message : tok.label}
            </p>
            {tok.sub && state !== "speaking" && (
              <p style={{
                color: "#6b7280",
                fontSize: 22,
                fontWeight: 400,
                margin: 0,
              }}>
                {tok.sub}
              </p>
            )}
            {state === "error" && errorMsg && (
              <p style={{
                color: "#dc2626",
                fontSize: 16,
                marginTop: 12,
                lineHeight: 1.5,
              }}>
                {errorMsg}
              </p>
            )}
          </div>

          {/* Transcript card */}
          {transcript && state === "idle" && (
            <div style={{
              width: "100%", maxWidth: 480,
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: 20,
              padding: "18px 24px",
              textAlign: "left",
            }}>
              <p style={{ color: "#6b7280", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 8px" }}>
                You said
              </p>
              <p style={{ color: "#2e2e2e", fontSize: 18, lineHeight: 1.5, margin: 0 }}>
                {transcript}
              </p>
            </div>
          )}

          {/* TTS panel */}
          {showTts && (
            <div style={{
              width: "100%", maxWidth: 480,
              display: "flex", gap: 10,
            }}>
              <textarea
                value={ttsInput}
                onChange={(e) => setTtsInput(e.target.value)}
                rows={2}
                placeholder="Type something to speak…"
                style={{
                  flex: 1,
                  background: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: 16,
                  padding: "12px 16px",
                  color: "#2e2e2e",
                  fontSize: 15,
                  resize: "none",
                  outline: "none",
                  fontFamily: "inherit",
                }}
              />
              <button
                onClick={() => handleSpeak(ttsInput)}
                disabled={state !== "idle" || !ttsInput.trim()}
                style={{
                  width: 52, height: "100%",
                  minHeight: 56,
                  borderRadius: 14,
                  background: "#00a0dc",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 18,
                  flexShrink: 0,
                  opacity: (state !== "idle" || !ttsInput.trim()) ? 0.4 : 1,
                }}
              >
                ▶
              </button>
            </div>
          )}
        </div>

        {/* ── Bottom bar ───────────────────────────────────────────────────────── */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          borderTop: "1px solid #e5e7eb",
        }}>

          {/* TTS toggle — subtle, developer-facing */}
          <button
            onClick={() => setShowTts((v) => !v)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 18px",
              borderRadius: 12,
              background: showTts ? "#e5e7eb" : "#f5f6f8",
              border: "1px solid #e5e7eb",
              color: "#6b7280",
              fontSize: 13, fontWeight: 500,
              cursor: "pointer",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/>
            </svg>
            TTS test
          </button>

          {/* Help — prominent, always visible */}
          <button
            onClick={() => setShowHelp(true)}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "16px 28px",
              borderRadius: 18,
              background: "rgba(220,38,38,0.08)",
              border: "1.5px solid rgba(220,38,38,0.25)",
              color: "#dc2626",
              fontSize: 18, fontWeight: 600,
              cursor: "pointer",
              letterSpacing: "0.01em",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 8v4m0 4h.01"/>
            </svg>
            I need help
          </button>
        </div>
      </div>

      {/* ── Help modal ─────────────────────────────────────────────────────────── */}
      {showHelp && (
        <div style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.45)",
          backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 32, zIndex: 50,
        }}>
          <div style={{
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: 28,
            padding: 40,
            maxWidth: 400,
            width: "100%",
            textAlign: "center",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          }}>
            <p style={{ color: "#2e2e2e", fontSize: 26, fontWeight: 600, lineHeight: 1.35, margin: "0 0 32px" }}>
              Do you need assistance?
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <button
                onClick={() => setShowHelp(false)}
                style={{
                  padding: "20px 24px", borderRadius: 18,
                  background: "#00a0dc", border: "none",
                  color: "#fff", fontSize: 20, fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                I&apos;m fine, close
              </button>
              <button
                onClick={() => {
                  setShowHelp(false)
                  handleSpeak("Your caregiver has been notified and will be with you soon.")
                }}
                style={{
                  padding: "20px 24px", borderRadius: 18,
                  background: "#dc2626", border: "none",
                  color: "#fff", fontSize: 20, fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Notify my caregiver →
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
