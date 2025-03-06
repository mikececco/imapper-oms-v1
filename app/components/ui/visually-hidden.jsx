"use client"

import { cn } from "../../utils/cn"

/**
 * VisuallyHidden component for accessibility
 * Renders content that is visually hidden but still accessible to screen readers
 */
export function VisuallyHidden({ className, ...props }) {
  return (
    <span
      className={cn(
        "absolute w-[1px] h-[1px] p-0 -m-[1px] overflow-hidden clip-[rect(0,0,0,0)] whitespace-nowrap border-0",
        className
      )}
      {...props}
    />
  )
} 