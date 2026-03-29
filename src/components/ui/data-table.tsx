"use client"

import { cn } from "@/lib/utils"
import { ReactNode } from "react"

interface Column<T> {
  key: string
  header: string
  cell?: (row: T) => ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyExtractor: (row: T) => string
  onRowClick?: (row: T) => void
  emptyMessage?: string
  className?: string
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  emptyMessage = "No data found",
  className,
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <p className="text-muted-foreground text-sm">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className={cn("rounded-2xl border border-border bg-card overflow-hidden", className)}>
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-surface">
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  "px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider",
                  column.className
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => {
            const rowKey = keyExtractor(row)
            const RowElement = onRowClick ? "button" : "div"
            return (
              <RowElement
                key={rowKey}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  "flex items-center border-b border-border last:border-0 transition-colors hover:bg-surface",
                  onRowClick && "cursor-pointer w-full text-left"
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      "px-6 py-4 text-sm text-foreground",
                      column.className
                    )}
                  >
                    {column.cell
                      ? column.cell(row)
                      : (row as Record<string, unknown>)[column.key] as ReactNode}
                  </td>
                ))}
              </RowElement>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
