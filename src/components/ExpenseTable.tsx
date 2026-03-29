"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { formatCurrency } from "@/lib/formatCurrency"
import { EnterpriseTable, EnterpriseColumn } from "@/components/ui/enterprise-table"
import { SummaryStrip, SummaryStripItem } from "@/components/ui/summary-strip"
import { EnterpriseToolbar } from "@/components/ui/enterprise-toolbar"
import { TablePagination } from "@/components/ui/table-pagination"
import { StatusPill } from "@/components/ui/status-pill"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Trash2, Eye, FileText, Filter } from "lucide-react"
import { cn } from "@/lib/utils"

interface Expense {
  id: string
  description: string
  category: string
  date: string
  submittedAmount: number
  submittedCurrency: string
  convertedAmount: number
  status: string
  employee: { name: string; email: string }
  isAdminOverride: boolean
}

interface ExpenseTableProps {
  expenses: Expense[]
  companyCurrency: string
  viewerRole: "ADMIN" | "MANAGER" | "EMPLOYEE"
  showCreateButton?: boolean
}

const PAGE_SIZE = 20

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

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
}

export function ExpenseTable({
  expenses,
  companyCurrency,
  viewerRole,
  showCreateButton = true,
}: ExpenseTableProps) {
  const router = useRouter()

  const [search, setSearch]             = useState("")
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState("ALL")
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [page, setPage]                 = useState(1)
  const [deleting, setDeleting]         = useState<string | null>(null)

  /* ── Summary totals ── */
  const totals = useMemo(() => {
    const sum = (s: string) =>
      expenses.filter((e) => e.status === s).reduce((acc, e) => acc + e.convertedAmount, 0)
    return {
      DRAFT:    { amount: sum("DRAFT"),    count: expenses.filter((e) => e.status === "DRAFT").length },
      PENDING:  { amount: sum("PENDING"),  count: expenses.filter((e) => e.status === "PENDING").length },
      APPROVED: { amount: sum("APPROVED"), count: expenses.filter((e) => e.status === "APPROVED").length },
    }
  }, [expenses])

  const stripItems: SummaryStripItem[] = [
    { key: "DRAFT",    label: "To Submit",        value: formatCurrency(totals.DRAFT.amount,    companyCurrency), dotColor: "bg-blue-500",    count: totals.DRAFT.count },
    { key: "PENDING",  label: "Under Validation", value: formatCurrency(totals.PENDING.amount,  companyCurrency), dotColor: "bg-orange-500",  count: totals.PENDING.count },
    { key: "APPROVED", label: "To Be Reimbursed", value: formatCurrency(totals.APPROVED.amount, companyCurrency), dotColor: "bg-emerald-500", count: totals.APPROVED.count },
  ]

  /* ── Categories for filter ── */
  const categories = useMemo(
    () => Array.from(new Set(expenses.map((e) => e.category))).sort(),
    [expenses]
  )

  /* ── Filtered + paginated data ── */
  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      if (statusFilter && e.status !== statusFilter) return false
      if (categoryFilter !== "ALL" && e.category !== categoryFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          e.description.toLowerCase().includes(q) ||
          e.employee.name.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [expenses, statusFilter, categoryFilter, search])

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function handleFilterChange(key: string | null) {
    setStatusFilter(key)
    setPage(1)
    setSelectedKeys(new Set())
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this expense? This cannot be undone.")) return
    setDeleting(id)
    await fetch(`/api/expenses/${id}`, { method: "DELETE" })
    setDeleting(null)
    router.refresh()
  }

  async function handleBulkDelete() {
    if (!confirm(`Delete ${selectedKeys.size} expense(s)?`)) return
    await Promise.all(Array.from(selectedKeys).map((id) => fetch(`/api/expenses/${id}`, { method: "DELETE" })))
    setSelectedKeys(new Set())
    router.refresh()
  }

  /* ── Column definitions ── */
  const columns: EnterpriseColumn<Expense>[] = [
    {
      key: "description",
      header: "Description",
      className: "min-w-[180px]",
      cell: (e) => (
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded bg-muted flex items-center justify-center shrink-0">
            <FileText className="w-3 h-3 text-muted-foreground" />
          </div>
          <span className="truncate font-medium text-foreground">{e.description}</span>
          {e.isAdminOverride && (
            <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
              Override
            </span>
          )}
        </div>
      ),
    },
    ...(viewerRole !== "EMPLOYEE"
      ? [{
          key: "employee",
          header: "Employee",
          className: "min-w-[130px]",
          cell: (e: Expense) => (
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary shrink-0">
                {initials(e.employee.name)}
              </div>
              <span className="truncate text-[13px]">{e.employee.name}</span>
            </div>
          ),
        }] as EnterpriseColumn<Expense>[]
      : []),
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
      <Link href={`/expenses/${e.id}`} onClick={(ev) => ev.stopPropagation()}>
        <button
          type="button"
          title="View"
          className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Eye className="w-4 h-4" />
        </button>
      </Link>
      {e.status === "DRAFT" && (
        <button
          type="button"
          title="Delete"
          disabled={deleting === e.id}
          onClick={() => handleDelete(e.id)}
          className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </>
  )

  return (
    <div className="flex flex-col min-h-full">

      {/* Sticky breadcrumb bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-8 bg-white border-b border-gray-200 shrink-0" style={{ height: 52 }}>
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold text-gray-800">Expenses</span>
          <span className="text-gray-400 text-xs ml-1">{expenses.length} total records</span>
        </div>
        {showCreateButton && (
          <Link href="/expenses/new">
            <button className="o-btn o-btn-primary o-btn-sm">
              <Plus className="w-4 h-4" /> New Expense
            </button>
          </Link>
        )}
      </div>

      {/* Page content */}
      <div className="flex-1 p-8 space-y-5">

        {/* Summary strip */}
        <SummaryStrip
          items={stripItems}
          activeKey={statusFilter}
          onSelect={handleFilterChange}
        />

        {/* Table card */}
        <div className="o-container overflow-hidden">
          <EnterpriseToolbar
            actions={
              showCreateButton ? (
                <Link href="/expenses/new">
                  <button className="o-btn o-btn-primary o-btn-sm">
                    <Plus className="w-4 h-4" /> New
                  </button>
                </Link>
              ) : undefined
            }
            search={search}
            onSearchChange={(v) => { setSearch(v); setPage(1) }}
            searchPlaceholder="Search expenses..."
            filters={
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1) }}>
                  <SelectTrigger className="h-8 text-sm w-[150px] border-border">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Categories</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            }
            selectionCount={selectedKeys.size}
            bulkActions={
              <button
                type="button"
                onClick={handleBulkDelete}
                className="o-btn o-btn-sm text-red-600 border-red-200 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
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
            emptyMessage="No expenses match your filters"
            emptyIcon={<FileText className="w-10 h-10" />}
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
