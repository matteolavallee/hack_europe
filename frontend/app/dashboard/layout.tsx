import { Sidebar } from "@/components/dashboard/Sidebar"
import { BottomNav } from "@/components/dashboard/DashboardNav"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen min-h-dvh flex-col bg-background md:flex-row">
      {/* Sidebar: desktop only */}
      <Sidebar />

      <main className="flex-1 overflow-y-auto pb-20 md:pb-6">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </div>
      </main>

      {/* Bottom tab bar: mobile only (4 sections) */}
      <BottomNav />
    </div>
  )
}