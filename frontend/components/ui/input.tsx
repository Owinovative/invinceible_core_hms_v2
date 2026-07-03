import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-9 w-full rounded-lg border border-border bg-transparent px-3 py-1 text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:border-module/60 focus-visible:ring-3 focus-visible:ring-module/20 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
