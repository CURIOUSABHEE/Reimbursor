import { cn } from "@/lib/utils"

interface StatusConfig {
  label: string
  dot: string
  bg: string
  text: string
}

const STATUS_MAP: Record<string, StatusConfig> = {
  DRAFT:    { label: "To Submit",   dot: "bg-blue-500",    bg: "bg-blue-50",    text: "text-blue-700" },
  PENDING:  { label: "Submitted",   dot: "bg-orange-500",  bg: "bg-orange-50",  text: "text-orange-700" },
  APPROVED: { label: "Approved",    dot: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700" },
  REJECTED: { label: "Rejected",    dot: "bg-red-500",     bg: "bg-red-50",     text: "text-red-700" },
  DONE:     { label: "Done",        dot: "bg-green-800",   bg: "bg-green-50",   text: "text-green-900" },
}

interface StatusPillProps {
  status: string
  className?: string
}

export function StatusPill({ status, className }: StatusPillProps) {
  const cfg = STATUS_MAP[status] ?? STATUS_MAP.DRAFT
  return (
    <span className={cn("status-pill", cfg.bg, cfg.text, className)}>
      <span className={cn("status-pill-dot", cfg.dot)} />
      {cfg.label}
    </span>
  )
}

export { STATUS_MAP }
