"use client"

import { ReactNode, useRef } from "react"
import { cn } from "@/lib/utils"
import { Search, X } from "lucide-react"

interface EnterpriseToolbarProps {
  actions?: ReactNode
  search?: string
  onSearchChange?: (v: string) => void
  searchPlaceholder?: string
  filters?: ReactNode
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
      <div className={cn("enterprise-toolbar bg-blue-50/60 border-blue-100", className)}>
        <span className="text-sm font-semibold text-blue-700 mr-1">
          {selectionCount} selected
        </span>
        <div className="flex items-center gap-2 ml-1">
          {bulkActions}
        </div>
      </div>
    )
  }

  return (
    <div className={cn("enterprise-toolbar", className)}>
      {actions && <div className="flex items-center gap-2">{actions}</div>}

      {onSearchChange !== undefined && (
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={search ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full h-9 pl-9 pr-8 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-muted-foreground transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {filters && (
        <div className="flex items-center gap-2 ml-auto">
          {filters}
        </div>
      )}
    </div>
  )
}
