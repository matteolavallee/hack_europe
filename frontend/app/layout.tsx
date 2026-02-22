import type { Metadata, Viewport } from "next"
import "./globals.css"
import { EnvConfigBanner } from "@/components/EnvConfigBanner"

export const metadata: Metadata = {
  title: "Ancrage",
  description: "The Cognitive Compass",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <EnvConfigBanner />
        {children}
      </body>
    </html>
  )
}
