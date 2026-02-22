"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { listenOnce } from "@/lib/speech"

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
const CARE_RECEIVER_ID = process.env.NEXT_PUBLIC_CARE_RECEIVER_ID ?? "cr-0000-0001"
const POLL_INTERVAL_MS = 3000

// ─── Types ────────────────────────────────────────────────────────────────────

type State = "idle" | "recording" | "transcribing" | "thinking" | "speaking" | "waiting" | "playing" | "error"

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

async function askAgent(message: string): Promise<string> {
  const res = await fetch(`${BACKEND_URL}/api/chat/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  })
  if (!res.ok) throw new Error(`Agent error ${res.status}`)
  return ((await res.json()) as { response: string }).response ?? ""
}

interface DeviceAction {
  id: string
  kind: string
  text_to_speak: string
  audio_url?: string | null
  audio_title?: string | null
}

/**
 * Passe toutes les URLs audio par le proxy backend pour éviter les erreurs CORS.
 * Le proxy gère aussi la conversion des liens Google Drive.
 */
function toProxiedUrl(url: string): string {
  return `${BACKEND_URL}/api/audio/proxy?url=${encodeURIComponent(url)}`
}

async function playAudioUrl(url: string): Promise<void> {
  const src = toProxiedUrl(url)
  return new Promise((resolve) => {
    const audio = new window.Audio(src)
    audio.onended = () => resolve()
    audio.onerror = (e) => {
      console.warn("[device] Audio playback error:", e, "url:", src)
      resolve()
    }
    audio.play().catch((e) => {
      console.warn("[device] Audio play() blocked:", e)
      resolve()
    })
  })
}

async function fetchNextActions(): Promise<DeviceAction[]> {
  try {
    const res = await fetch(
      `${BACKEND_URL}/api/chat/device/next-actions?care_receiver_id=${CARE_RECEIVER_ID}`,
      { headers: { Authorization: "Bearer demo-token" } }
    )
    if (!res.ok) return []
    return (await res.json()) as DeviceAction[]
  } catch {
    return []
  }
}

async function ackAction(actionId: string): Promise<void> {
  try {
    await fetch(`${BACKEND_URL}/api/chat/device/response`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer demo-token" },
      body: JSON.stringify({ action_id: actionId, response: "yes" }),
    })
  } catch { /* noop */ }
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
  transcribing: { orb: "#d97706", glow: "rgba(217,119,6,0.4)",   ring: "rgba(217,119,6,0.18)",  label: "Transcribing…",           sub: "One moment…" },
  thinking:     { orb: "#7c3aed", glow: "rgba(124,58,237,0.4)",  ring: "rgba(124,58,237,0.18)", label: "Thinking…",               sub: "One moment…" },
  speaking:     { orb: "#0077b3", glow: "rgba(0,119,179,0.45)",  ring: "rgba(0,119,179,0.2)",   label: "Speaking…",               sub: "" },
  waiting:      { orb: "#f59e0b", glow: "rgba(245,158,11,0.45)", ring: "rgba(245,158,11,0.2)",  label: "Your answer?",            sub: "Yes or No" },
  playing:      { orb: "#059669", glow: "rgba(5,150,105,0.45)",  ring: "rgba(5,150,105,0.2)",   label: "Playing…",                sub: "Enjoy the music!" },
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
  if (state === "playing")   return <Bars n={5} heights={[32, 56, 72, 56, 32]} delay={0} dur="0.5s" />
  if (state === "waiting") return (
    <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.4" strokeLinecap="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 8v4l3 3"/>
    </svg>
  )
  if (state === "transcribing" || state === "thinking") return (
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

  const speakingRef    = useRef(false)
  const recorderRef    = useRef<MediaRecorder | null>(null)
  const chunksRef      = useRef<Blob[]>([])
  const processedIds   = useRef(new Set<string>())
  const pendingAudioRef   = useRef<DeviceAction | null>(null)
  const listeningForYesNo = useRef(false)
  const [voiceListening, setVoiceListening] = useState(false)

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

        if (!text.trim()) {
          setState("idle")
          return
        }

        setState("thinking")
        const agentReply = await askAgent(text)

        // speakText handles the "speaking" state internally
        await handleSpeak(agentReply)
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Something went wrong")
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
    if (!text.trim() || state === "recording" || state === "transcribing" || state === "thinking" || state === "speaking") return
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

  // ── Polling next-actions (speak_reminder + propose_audio) ────────────────────

  useEffect(() => {
    let cancelled = false

    async function poll() {
      if (cancelled) return
      if (!speakingRef.current && state === "idle") {
        const actions = await fetchNextActions()
        const next = actions.find((a) => !processedIds.current.has(a.id))
        if (next && !cancelled) {
          processedIds.current.add(next.id)

          if (next.kind === "speak_reminder") {
            await ackAction(next.id)
            await handleSpeak(next.text_to_speak)

          } else           if (next.kind === "propose_audio") {
            // 1. Parler l'invitation
            pendingAudioRef.current = next
            speakingRef.current = true
            setState("speaking")
            setMessage(next.text_to_speak)
            try { await speakText(next.text_to_speak) } catch { /* noop */ }
            speakingRef.current = false
            setMessage("")
            // 2. Passer en mode "waiting" et lancer l'écoute vocale après un délai
            // (laisser le micro se libérer après la fin du TTS)
            setState("waiting")
            setTimeout(() => startYesNoListen(), 700)
          }
        }
      }
      if (!cancelled) {
        setTimeout(poll, POLL_INTERVAL_MS)
      }
    }

    const timer = setTimeout(poll, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  // ── Écoute vocale automatique pour OUI / NON ─────────────────────────────────

  function startYesNoListen(attempt = 1) {
    if (listeningForYesNo.current && attempt === 1) return
    if (attempt === 1) listeningForYesNo.current = true
    setVoiceListening(true)

    listenOnce(8000)
      .then((result) => {
        listeningForYesNo.current = false
        setVoiceListening(false)
        if (result.intent === "yes") {
          void handleMusicYes()
        } else if (result.intent === "no") {
          void handleMusicNo()
        } else if (attempt <= 2) {
          // Réponse inconnue (pas yes/ni no) → relancer
          setTimeout(() => startYesNoListen(attempt + 1), 400)
        } else {
          // Après 3 essais, garder les boutons visibles sans réessayer
          listeningForYesNo.current = false
          setVoiceListening(false)
        }
      })
      .catch((err: Error) => {
        if (!listeningForYesNo.current) return  // annulé par bouton
        // "no-speech" = silence → relancer silencieusement (max 5 fois)
        if (err.message === "no-speech" && attempt <= 5) {
          setTimeout(() => startYesNoListen(attempt + 1), 300)
        } else {
          listeningForYesNo.current = false
          setVoiceListening(false)
          // Micro non dispo ou timeout → les boutons restent
        }
      })
  }

  // ── Réponses OUI / NON pour propose_audio ────────────────────────────────────

  const handleMusicYes = useCallback(async () => {
    if (!pendingAudioRef.current) return
    listeningForYesNo.current = false   // annuler l'écoute en cours
    setVoiceListening(false)
    const action = pendingAudioRef.current
    pendingAudioRef.current = null
    await ackAction(action.id)

    // Dire "Super !" puis jouer la musique
    setState("speaking")
    speakingRef.current = true
    const title = action.audio_title ?? "your music"
    setMessage(`Playing ${title}…`)
    try { await speakText(`Sure! Enjoy ${title}.`) } catch { /* noop */ }
    speakingRef.current = false

    if (action.audio_url) {
      setState("playing")
      setMessage(title)
      await playAudioUrl(action.audio_url)
    }
    setMessage("")
    setState("idle")
  }, [])

  const handleMusicNo = useCallback(async () => {
    if (!pendingAudioRef.current) return
    listeningForYesNo.current = false   // annuler l'écoute en cours
    setVoiceListening(false)
    const action = pendingAudioRef.current
    pendingAudioRef.current = null
    await ackAction(action.id)
    setState("speaking")
    speakingRef.current = true
    setMessage("No problem!")
    try { await speakText("No problem! Have a great day.") } catch { /* noop */ }
    speakingRef.current = false
    setMessage("")
    setState("idle")
  }, [])

  // ─────────────────────────────────────────────────────────────────────────────

  const orbTappable = state === "idle" || state === "recording" || state === "error"
  const isBusy = state === "transcribing" || state === "thinking" || state === "speaking" || state === "waiting" || state === "playing"

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

          {/* ── Boutons OUI / NON pour la musique ──────────────────────────── */}
          {state === "waiting" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 480, marginTop: 8 }}>
              {/* Indicateur d'écoute vocale */}
              {voiceListening && (
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  padding: "10px 20px", borderRadius: 14,
                  background: "rgba(0,160,220,0.08)",
                  border: "1px solid rgba(0,160,220,0.25)",
                }}>
                  <span style={{
                    width: 10, height: 10, borderRadius: "50%",
                    background: "#00a0dc",
                    display: "inline-block",
                    animation: "bar 0.8s ease-in-out infinite alternate",
                  }} />
                  <span style={{ color: "#00a0dc", fontSize: 15, fontWeight: 600 }}>
                    Listening… say &quot;Yes&quot; or &quot;No&quot;
                  </span>
                </div>
              )}
              <div style={{ display: "flex", gap: 16 }}>
                <button
                  onClick={() => void handleMusicYes()}
                  style={{
                    flex: 1, padding: "22px 0",
                    borderRadius: 20,
                    background: "#16a34a",
                    border: "none",
                    color: "#fff",
                    fontSize: 24,
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 4px 16px rgba(22,163,74,0.35)",
                  }}
                >
                  ✓ Yes
                </button>
                <button
                  onClick={() => void handleMusicNo()}
                  style={{
                    flex: 1, padding: "22px 0",
                    borderRadius: 20,
                    background: "#6b7280",
                    border: "none",
                    color: "#fff",
                    fontSize: 24,
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 4px 16px rgba(107,114,128,0.25)",
                  }}
                >
                  ✗ No
                </button>
              </div>
            </div>
          )}

          {/* Transcript card — visible while AI processes and speaks so user sees what was heard */}
          {transcript && (state === "idle" || state === "thinking" || state === "speaking") && (
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
                disabled={isBusy || !ttsInput.trim()}
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
                  opacity: (isBusy || !ttsInput.trim()) ? 0.4 : 1,
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
