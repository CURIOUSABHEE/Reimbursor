import { Badge } from "@/components/ui/badge"

const statusConfig: Record<string, { variant: "success" | "warning" | "destructive" | "secondary"; label: string }> = {
  DRAFT:    { variant: "secondary",   label: "To Submit" },
  PENDING:  { variant: "warning",     label: "Under Validation" },
  APPROVED: { variant: "success",     label: "Approved" },
  REJECTED: { variant: "destructive", label: "Rejected" },
}

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? statusConfig.DRAFT
  return (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  )
}
