export default function DeviceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-screen overflow-hidden touch-none">
      {children}
    </div>
  )
}
