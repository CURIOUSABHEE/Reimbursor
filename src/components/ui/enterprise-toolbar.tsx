"use client"

import { ReactNode, useRef } from "react"
import { cn } from "@/lib/utils"
import { Search, X } from "lucide-react"

interface EnterpriseToolbarProps {
  /** Left side: primary actions (New button, etc.) */
  actions?: ReactNode
  /** Search value */
  search?: string
  onSearchChange?: (v: string) => void
  searchPlaceholder?: string
  /** Right side: filter dropdowns, export, etc. */
  filters?: ReactNode
  /** Bulk action bar — shown when selection is non-empty */
  bulkActions?: ReactNode
  selectionCount?: number
  className?: string
}

export function EnterpriseToolbar({
  actions,
  search,
  onSearchChange,
  searchPlaceholder = "Search...",
  filters,
  bulkActions,
  selectionCount = 0,
  className,
}: EnterpriseToolbarProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  if (selectionCount > 0 && bulkActions) {
    return (
      <div className={cn("enterprise-toolbar bg-primary/[0.04] border-primary/20", className)}>
        <span className="text-xs font-semibold text-primary mr-1">
          {selectionCount} selected
        </span>
        <div className="flex items-center gap-1 ml-1">
          {bulkActions}
        </div>
      </div>
    )
  }

  return (
    <div className={cn("enterprise-toolbar", className)}>
      {actions && <div className="flex items-center gap-1">{actions}</div>}

      {onSearchChange !== undefined && (
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={search ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full h-7 pl-7 pr-6 text-[13px] bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {filters && (
        <div className="flex items-center gap-1 ml-auto">
          {filters}
        </div>
      )}
    </div>
  )
}
