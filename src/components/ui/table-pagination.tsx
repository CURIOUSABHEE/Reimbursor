"use client"

import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface TablePaginationProps {
  page: number
  pageSize: number
  total: number
  onPageChange: (p: number) => void
  className?: string
}

export function TablePagination({ page, pageSize, total, onPageChange, className }: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className={cn(
      "flex items-center justify-between px-5 py-3 border-t border-border text-sm text-muted-foreground bg-gray-50/60",
      className
    )}>
      <span className="font-medium">
        {total === 0 ? "No records" : `Showing ${from}–${to} of ${total}`}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className={cn(
            "h-8 w-8 flex items-center justify-center rounded-lg border border-border text-sm transition-colors",
            page <= 1 ? "opacity-40 cursor-not-allowed" : "hover:bg-white hover:shadow-sm cursor-pointer"
          )}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="px-3 py-1 text-sm font-semibold text-foreground">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className={cn(
            "h-8 w-8 flex items-center justify-center rounded-lg border border-border text-sm transition-colors",
            page >= totalPages ? "opacity-40 cursor-not-allowed" : "hover:bg-white hover:shadow-sm cursor-pointer"
          )}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
