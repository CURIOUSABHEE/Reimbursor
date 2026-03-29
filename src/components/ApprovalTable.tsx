"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { formatCurrency } from "@/lib/formatCurrency"
import { EnterpriseTable, EnterpriseColumn } from "@/components/ui/enterprise-table"
import { EnterpriseToolbar } from "@/components/ui/enterprise-toolbar"
import { TablePagination } from "@/components/ui/table-pagination"
import { StatusPill } from "@/components/ui/status-pill"
import { cn } from "@/lib/utils"
import {
  CheckCircle2,
  XCircle,
  Eye,
  Check,
  X,
} from "lucide-react"

interface Expense {
  id: string
  description: string
  category: string
  date: string
  submittedAmount: number
  submittedCurrency: string
  convertedAmount: number
  status: string
  employee: { id: string; name: string; email: string }
  approvalActions: { id: string; action: string; stepOrder: number; approver: { id: string; name: string } }[]
}

interface ApprovalTableProps {
  approvals: Expense[]
  companyCurrency: string
  viewerRole: "ADMIN" | "MANAGER" | "EMPLOYEE"
}

const PAGE_SIZE = 20

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
}

const CATEGORY_COLORS: Record<string, string> = {
  Travel:        "bg-violet-100 text-violet-700",
  Meals:         "bg-orange-100 text-orange-700",
  Accommodation: "bg-blue-100 text-blue-700",
  Equipment:     "bg-cyan-100 text-cyan-700",
  Software:      "bg-indigo-100 text-indigo-700",
  Training:      "bg-pink-100 text-pink-700",
  Other:         "bg-gray-100 text-gray-600",
}

function categoryClass(cat: string) {
  return CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.Other
}

export function ApprovalTable({ approvals, companyCurrency }: ApprovalTableProps) {
  const router = useRouter()

  const [search, setSearch]           = useState("")
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [page, setPage]               = useState(1)
  const [acting, setActing]           = useState<string | null>(null)

  async function handleAction(expenseId: string, action: "APPROVED" | "REJECTED") {
    setActing(expenseId)
    try {
      await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expenseId, action }),
      })
      router.refresh()
    } finally {
      setActing(null)
    }
  }

  async function handleBulkApprove() {
    if (!confirm(`Approve ${selectedKeys.size} expense(s)?`)) return
    await Promise.all(Array.from(selectedKeys).map((id) => handleAction(id, "APPROVED")))
    setSelectedKeys(new Set())
  }

  async function handleBulkReject() {
    if (!confirm(`Reject ${selectedKeys.size} expense(s)?`)) return
    await Promise.all(Array.from(selectedKeys).map((id) => handleAction(id, "REJECTED")))
    setSelectedKeys(new Set())
  }

  const filtered = useMemo(() => {
    if (!search) return approvals
    const q = search.toLowerCase()
    return approvals.filter(
      (e) =>
        e.description.toLowerCase().includes(q) ||
        e.employee.name.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q)
    )
  }, [approvals, search])

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const columns: EnterpriseColumn<Expense>[] = [
    {
      key: "employee",
      header: "Employee",
      className: "min-w-[130px]",
      cell: (e) => (
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary shrink-0">
            {initials(e.employee.name)}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-medium truncate">{e.employee.name}</p>
            <p className="text-[11px] text-muted-foreground truncate">{e.employee.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "description",
      header: "Description",
      className: "min-w-[160px]",
      cell: (e) => (
        <span className="font-medium text-foreground truncate block">{e.description}</span>
      ),
    },
    {
      key: "category",
      header: "Category",
      className: "w-[110px]",
      cell: (e) => (
        <span className={cn("text-[11px] font-semibold px-1.5 py-0.5 rounded", categoryClass(e.category))}>
          {e.category}
        </span>
      ),
    },
    {
      key: "date",
      header: "Date",
      className: "w-[90px] tabular-nums",
      cell: (e) => (
        <span className="text-muted-foreground text-[12px]">
          {new Date(e.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      className: "w-[110px] tabular-nums",
      cell: (e) => (
        <div className="text-right">
          <span className="font-bold text-foreground">{formatCurrency(e.convertedAmount, companyCurrency)}</span>
          {e.submittedCurrency !== companyCurrency && (
            <div className="text-[11px] text-muted-foreground">
              {formatCurrency(e.submittedAmount, e.submittedCurrency)}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      className: "w-[110px]",
      cell: (e) => <StatusPill status={e.status} />,
    },
  ]

  const rowActions = (e: Expense) => (
    <>
      <button type="button" title="View"
        onClick={() => router.push(`/expenses/${e.id}`)}
        className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-muted-foreground hover:text-foreground transition-colors"
      ><Eye className="w-4 h-4" /></button>
      <button type="button" title="Approve" disabled={acting === e.id}
        onClick={() => handleAction(e.id, "APPROVED")}
        className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-emerald-50 text-muted-foreground hover:text-emerald-600 transition-colors disabled:opacity-40"
      ><Check className="w-4 h-4" /></button>
      <button type="button" title="Reject" disabled={acting === e.id}
        onClick={() => handleAction(e.id, "REJECTED")}
        className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors disabled:opacity-40"
      ><X className="w-4 h-4" /></button>
    </>
  )

  return (
    <div className="flex flex-col min-h-full">

      {/* Sticky breadcrumb bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-8 bg-white border-b border-gray-200 shrink-0" style={{ height: 52 }}>
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold text-gray-800">Pending Approvals</span>
          <span className="text-gray-400 text-xs ml-1">
            {approvals.length} request{approvals.length !== 1 ? "s" : ""} awaiting review
          </span>
        </div>
        {approvals.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBulkApprove}
              className="o-btn o-btn-sm text-emerald-700 border-emerald-200 hover:bg-emerald-50"
            >
              <CheckCircle2 className="w-4 h-4" /> Approve All
            </button>
            <button
              type="button"
              onClick={handleBulkReject}
              className="o-btn o-btn-sm text-red-700 border-red-200 hover:bg-red-50"
            >
              <XCircle className="w-4 h-4" /> Reject All
            </button>
          </div>
        )}
      </div>

      {/* Page content */}
      <div className="flex-1 p-8">
        <div className="o-container overflow-hidden">
          <EnterpriseToolbar
            search={search}
            onSearchChange={(v) => { setSearch(v); setPage(1) }}
            searchPlaceholder="Search by employee, description..."
            selectionCount={selectedKeys.size}
            bulkActions={
              <>
                <button
                  type="button"
                  onClick={handleBulkApprove}
                  className="o-btn o-btn-sm text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                >
                  <Check className="w-4 h-4" /> Approve
                </button>
                <button
                  type="button"
                  onClick={handleBulkReject}
                  className="o-btn o-btn-sm text-red-600 border-red-200 hover:bg-red-50"
                >
                  <X className="w-4 h-4" /> Reject
                </button>
              </>
            }
          />

          <EnterpriseTable
            columns={columns}
            data={paginated}
            keyExtractor={(e) => e.id}
            onRowClick={(e) => router.push(`/expenses/${e.id}`)}
            selectedKeys={selectedKeys}
            onSelectChange={setSelectedKeys}
            rowActions={rowActions}
            emptyMessage="No pending approvals — you're all caught up"
            emptyIcon={<CheckCircle2 className="w-10 h-10" />}
            className="border-0 rounded-none"
          />

          <TablePagination
            page={page}
            pageSize={PAGE_SIZE}
            total={filtered.length}
            onPageChange={setPage}
          />
        </div>
      </div>
    </div>
  )
}
