export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    DRAFT:    "bg-gray-100 text-gray-700 border border-gray-200",
    PENDING:  "bg-yellow-100 text-yellow-800 border border-yellow-200",
    APPROVED: "bg-green-100 text-green-800 border border-green-200",
    REJECTED: "bg-red-100 text-red-800 border border-red-200",
  }
  const label: Record<string, string> = {
    DRAFT: "To Submit",
    PENDING: "Under Validation",
    APPROVED: "Approved",
    REJECTED: "Rejected",
  }
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full ${map[status] ?? map.DRAFT}`}>
      {label[status] ?? status}
    </span>
  )
}
