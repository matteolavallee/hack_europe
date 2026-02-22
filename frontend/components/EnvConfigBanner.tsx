"use client"

import { useEffect, useState } from "react"

/**
 * Affiche un bandeau si l'API URL pointe vers localhost en production (config oubliée).
 * N'affiche rien si tout est correct.
 */
export function EnvConfigBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL ??
      process.env.NEXT_PUBLIC_BACKEND_URL ??
      "http://localhost:8000"
    const isLocalhost = apiUrl.includes("localhost") || apiUrl.includes("127.0.0.1")
    const isProduction = !window.location.hostname.match(/^localhost$|^127\.0\.0\.1$/)
    if (isProduction && isLocalhost) {
      const id = setTimeout(() => setShow(true), 0)
      return () => clearTimeout(id)
    }
  }, [])

  if (!show) return null

  return (
    <div
      role="alert"
      className="bg-amber-100 border-b border-amber-300 px-4 py-2 text-center text-sm text-amber-900"
    >
      <strong>Configuration requise :</strong> Configure{" "}
      <code className="bg-amber-200/80 px-1 rounded">NEXT_PUBLIC_API_URL</code> dans Vercel (Settings
      → Environment Variables) avec l&apos;URL de ton backend.
    </div>
  )
}
