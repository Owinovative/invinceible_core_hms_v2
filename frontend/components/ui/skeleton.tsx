import { cn } from "@/lib/utils"

/**
 * Base skeleton: shimmer sweep over layered surfaces (falls back to a
 * static tint under prefers-reduced-motion via the global media rule).
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn("skeleton-shimmer rounded-md", className)}
      {...props}
    />
  )
}

export { Skeleton }
