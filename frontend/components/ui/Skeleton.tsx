import { cn } from "@/lib/utils"

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <span className={cn("animate-pulse bg-gray-200 rounded", className)} />
  )
}
