"use client"

import { cn } from "@/lib/utils"
import { ReactNode } from "react"

export interface SummaryStripItem {
  key: string
  label: string
  value: string
  /** small dot color class, e.g. "bg-blue-500" */
  dotColor?: string
  count?: number
}

interface SummaryStripProps {
  items: SummaryStripItem[]
  activeKey: string | null
  onSelect: (key: string | null) => void
  className?: string
  /** Optional leading slot (e.g. "All" button) */
  leading?: ReactNode
}

export function SummaryStrip({ items, activeKey, onSelect, className, leading }: SummaryStripProps) {
  return (
    <div className={cn("summary-strip", className)}>
      {leading && (
        <div className="summary-strip-item flex items-center gap-2 shrink-0 px-3">
          {leading}
        </div>
      )}
      {items.map((item) => {
        const isActive = activeKey === item.key
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onSelect(isActive ? null : item.key)}
            className={cn("summary-strip-item text-left", isActive && "active")}
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              {item.dotColor && (
                <span className={cn("status-pill-dot", item.dotColor)} />
              )}
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
                {item.label}
              </span>
              {item.count !== undefined && (
                <span className={cn(
                  "ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                  isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  {item.count}
                </span>
              )}
            </div>
            <p className={cn(
              "text-sm font-bold tracking-tight leading-none",
              isActive ? "text-primary" : "text-foreground"
            )}>
              {item.value}
            </p>
          </button>
        )
      })}
    </div>
  )
}
