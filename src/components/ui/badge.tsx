import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded px-2 py-0.5 text-[11px] font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-[#eff6ff] text-[#1d4ed8]",
        secondary: "bg-[#f1f5f9] text-[#475569]",
        destructive: "bg-[#fef2f2] text-[#dc2626]",
        outline: "border border-[#dcdcdc] text-[#212121]",
        success: "bg-[#f0fdf4] text-[#15803d]",
        warning: "bg-[#fff7ed] text-[#c2410c]",
        gray: "bg-[#f7f7f7] text-[#888]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
