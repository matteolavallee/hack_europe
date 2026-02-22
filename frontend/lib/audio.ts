// ─── Audio playback helpers ───────────────────────────────────────────────────

let currentAudio: HTMLAudioElement | null = null

export function playAudio(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Stop any currently playing audio
    stopAudio()

    const audio = new Audio(url)
    currentAudio = audio

    audio.onended = () => {
      currentAudio = null
      resolve()
    }

    audio.onerror = () => {
      currentAudio = null
      reject(new Error(`Failed to play audio: ${url}`))
    }

    audio.play().catch(reject)
  })
}

export function stopAudio(): void {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.currentTime = 0
    currentAudio = null
  }
}

export function isAudioPlaying(): boolean {
  return currentAudio !== null && !currentAudio.paused
}

// Build the TTS audio URL from the backend
// The backend exposes a proxy that calls ElevenLabs and returns audio
export function buildTtsUrl(text: string, baseUrl: string): string {
  return `${baseUrl}/api/tts?text=${encodeURIComponent(text)}`
}

/** Reads text aloud via the backend TTS. baseUrl = NEXT_PUBLIC_API_URL */
export async function speakText(baseUrl: string, text: string): Promise<void> {
  if (!text?.trim()) return
  await playAudio(buildTtsUrl(text.trim(), baseUrl))
}
