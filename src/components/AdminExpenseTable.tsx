"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AdminOverrideDialog } from "@/components/AdminOverrideDialog"
import { ExpenseAmountCell } from "@/components/ExpenseAmountCell"
import { cn } from "@/lib/utils"
import {
  Search, Download, RefreshCw, Clock,
  AlertTriangle, X, Eye, FileText, Check, Flag,
  ChevronLeft, ChevronRight, Filter
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
  employee: { name: string; email: string }
  isAdminOverride: boolean
  adminOverrideAt: string | null
  adminOverrideComment: string | null
}

interface AdminExpenseTableProps {
  expenses: Expense[]
  companyCurrency: string
  employees: { id: string; name: string; email: string }[]
}

const ITEMS_PER_PAGE = 15

const STATUS_CONFIG: Record<string, { label: string; pill: string; dot: string }> = {
  DRAFT:    { label: "Draft",    pill: "bg-gray-100 text-gray-600",    dot: "bg-gray-400" },
  PENDING:  { label: "Pending",  pill: "bg-amber-100 text-amber-700",  dot: "bg-amber-500" },
  APPROVED: { label: "Approved", pill: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  REJECTED: { label: "Rejected", pill: "bg-red-100 text-red-700",      dot: "bg-red-500" },
}

const CATEGORY_COLORS: Record<string, string> = {
  TRAVEL:        "bg-violet-100 text-violet-700",
  MEALS:         "bg-orange-100 text-orange-700",
  ACCOMMODATION: "bg-blue-100 text-blue-700",
  EQUIPMENT:     "bg-cyan-100 text-cyan-700",
  TRANSPORTATION:"bg-teal-100 text-teal-700",
  SUPPLIES:      "bg-lime-100 text-lime-700",
  OTHER:         "bg-gray-100 text-gray-600",
}

function initials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
}

const AVATAR_COLORS = [
  "bg-blue-500", "bg-violet-500", "bg-emerald-500",
  "bg-amber-500", "bg-rose-500", "bg-cyan-500", "bg-indigo-500",
]
function avatarColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % AVATAR_COLORS.length
  return AVATAR_COLORS[h]
}

export function AdminExpenseTable({ expenses, companyCurrency, employees }: AdminExpenseTableProps) {
  const router = useRouter()
  const [search, setSearch]           = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [employeeFilter, setEmployeeFilter] = useState("ALL")
  const [dateFrom, setDateFrom]       = useState("")
  const [dateTo, setDateTo]           = useState("")
  const [page, setPage]               = useState(1)
  const [selected, setSelected]       = useState<Set<string>>(new Set())
  const [overrideDialog, setOverrideDialog] = useState<{
    open: boolean; expenseId: string; expenseDescription: string; action: "APPROVE" | "REJECT"
  }>({ open: false, expenseId: "", expenseDescription: "", action: "APPROVE" })

  const stats = useMemo(() => ({
    total:     expenses.length,
    pending:   expenses.filter(e => e.status === "PENDING").length,
    overridden:expenses.filter(e => e.isAdminOverride).length,
    rejected:  expenses.filter(e => e.status === "REJECTED").length,
  }), [expenses])

  const filtered = useMemo(() => expenses.filter(e => {
    if (search) {
      const q = search.toLowerCase()
      if (!e.description.toLowerCase().includes(q) &&
          !e.employee.name.toLowerCase().includes(q) &&
          !e.employee.email.toLowerCase().includes(q)) return false
    }
    if (statusFilter !== "ALL") {
      if (statusFilter === "OVERRIDE" && !e.isAdminOverride) return false
      if (statusFilter !== "OVERRIDE" && e.status !== statusFilter) return false
    }
    if (employeeFilter !== "ALL" && e.employee.email !== employeeFilter) return false
    if (dateFrom && new Date(e.date) < new Date(dateFrom)) return false
    if (dateTo && new Date(e.date) > new Date(dateTo)) return false
    return true
  }), [expenses, search, statusFilter, employeeFilter, dateFrom, dateTo])

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const paginated  = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)
  const hasFilters = search || statusFilter !== "ALL" || employeeFilter !== "ALL" || dateFrom || dateTo

  const reset = () => { setSearch(""); setStatusFilter("ALL"); setEmployeeFilter("ALL"); setDateFrom(""); setDateTo(""); setPage(1); setSelected(new Set()) }

  const toggleAll = () => setSelected(selected.size === paginated.length ? new Set() : new Set(paginated.map(e => e.id)))
  const toggleOne = (id: string) => { const s = new Set(selected); if (s.has(id)) { s.delete(id) } else { s.add(id) }; setSelected(s) }

  const exportCSV = () => {
    const rows = [
      ["Employee","Email","Description","Category","Date","Amount","Currency","Converted","Status","Override"],
      ...filtered.map(e => [e.employee.name, e.employee.email, e.description, e.category,
        new Date(e.date).toLocaleDateString(), e.submittedAmount, e.submittedCurrency,
        e.convertedAmount, e.status, e.isAdminOverride ? "Yes" : "No"])
    ]
    const blob = new Blob([rows.map(r => r.join(",")).join("\n")], { type: "text/csv" })
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `expenses-${new Date().toISOString().split("T")[0]}.csv` })
    a.click(); URL.revokeObjectURL(a.href)
  }

  return (
    <div className="flex flex-col min-h-full">

      {/* ── Sticky header bar ── */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-8 bg-white border-b border-gray-200 shrink-0" style={{ height: 52 }}>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-400 text-xs">Admin</span>
          <span className="text-gray-300">/</span>
          <span className="font-semibold text-gray-800">All Expenses</span>
          <span className="text-gray-400 text-xs ml-1">{expenses.length} total</span>
        </div>
        <button onClick={exportCSV} className="o-btn o-btn-sm gap-2">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="flex-1 p-8 space-y-6">

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Expenses",  value: stats.total,      icon: FileText,      bg: "bg-blue-50",    iconCls: "text-blue-600",    filter: "ALL" },
            { label: "Pending",         value: stats.pending,    icon: Clock,         bg: "bg-amber-50",   iconCls: "text-amber-600",   filter: "PENDING" },
            { label: "Admin Overridden",value: stats.overridden, icon: AlertTriangle, bg: "bg-purple-50",  iconCls: "text-purple-600",  filter: "OVERRIDE" },
            { label: "Rejected",        value: stats.rejected,   icon: X,             bg: "bg-red-50",     iconCls: "text-red-600",     filter: "REJECTED" },
          ].map(s => {
            const Icon = s.icon
            const isActive = statusFilter === s.filter
            return (
              <button
                key={s.label}
                type="button"
                onClick={() => { setStatusFilter(s.filter); setPage(1) }}
                className={cn(
                  "o-stat-card flex items-center gap-4 text-left w-full transition-all duration-200",
                  isActive && "ring-2 ring-blue-500 ring-offset-1"
                )}
              >
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", s.bg)}>
                  <Icon className={cn("w-6 h-6", s.iconCls)} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400">{s.label}</p>
                  <p className="text-3xl font-bold text-gray-900 leading-none mt-1">{s.value}</p>
                </div>
              </button>
            )
          })}
        </div>

        {/* ── Filter bar ── */}
        <div className="o-container p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-semibold text-gray-700">Filters</span>
            {hasFilters && (
              <button onClick={reset} className="ml-auto flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors">
                <RefreshCw className="w-3.5 h-3.5" /> Reset
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search expenses, employees..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                className="w-full h-9 pl-9 pr-3 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all placeholder:text-gray-400"
              />
            </div>
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1) }}>
              <SelectTrigger className="h-9 w-[150px] text-sm border-gray-200 bg-gray-50">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="OVERRIDE">Overridden</SelectItem>
              </SelectContent>
            </Select>
            <Select value={employeeFilter} onValueChange={v => { setEmployeeFilter(v); setPage(1) }}>
              <SelectTrigger className="h-9 w-[170px] text-sm border-gray-200 bg-gray-50">
                <SelectValue placeholder="All Employees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Employees</SelectItem>
                {employees.map(emp => (
                  <SelectItem key={emp.email} value={emp.email}>{emp.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1) }}
              className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all text-gray-600 w-[140px]" />
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1) }}
              className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all text-gray-600 w-[140px]" />
          </div>
        </div>

        {/* ── Bulk action bar ── */}
        {selected.size > 0 && (
          <div className="flex items-center gap-3 px-5 py-3 bg-blue-50 border border-blue-200 rounded-xl">
            <span className="text-sm font-semibold text-blue-700">{selected.size} selected</span>
            <div className="flex gap-2 ml-auto">
              <button className="o-btn o-btn-sm text-emerald-700 border-emerald-200 hover:bg-emerald-50">
                <Check className="w-4 h-4" /> Approve
              </button>
              <button className="o-btn o-btn-sm text-red-700 border-red-200 hover:bg-red-50">
                <X className="w-4 h-4" /> Reject
              </button>
            </div>
          </div>
        )}

        {/* ── Table ── */}
        <div className="o-container overflow-hidden">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-gray-400">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
                <FileText className="w-8 h-8 opacity-40" />
              </div>
              <div className="text-center">
                <p className="text-base font-semibold text-gray-600">No expenses found</p>
                <p className="text-sm mt-1">
                  {hasFilters ? "Try adjusting your filters." : "Get started by submitting your first expense report."}
                </p>
              </div>
              {hasFilters && (
                <button onClick={reset} className="o-btn o-btn-sm">
                  <RefreshCw className="w-4 h-4" /> Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="w-10 px-4 py-3">
                        <input type="checkbox"
                          checked={selected.size === paginated.length && paginated.length > 0}
                          onChange={toggleAll}
                          className="h-4 w-4 rounded border-gray-300 accent-blue-600 cursor-pointer"
                        />
                      </th>
                      {["Employee","Description","Category","Date","Amount","Status",""].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((e, idx) => {
                      const status = STATUS_CONFIG[e.status] ?? STATUS_CONFIG.DRAFT
                      const catCls = CATEGORY_COLORS[e.category] ?? CATEGORY_COLORS.OTHER
                      const isSelected = selected.has(e.id)
                      return (
                        <tr
                          key={e.id}
                          className={cn(
                            "group border-b border-gray-100 last:border-0 transition-colors cursor-pointer",
                            isSelected ? "bg-blue-50/70" : idx % 2 === 0 ? "bg-white hover:bg-blue-50/40" : "bg-gray-50/40 hover:bg-blue-50/40"
                          )}
                          onClick={() => router.push(`/expenses/${e.id}`)}
                        >
                          <td className="px-4 py-3.5" onClick={ev => { ev.stopPropagation(); toggleOne(e.id) }}>
                            <input type="checkbox" checked={isSelected} onChange={() => toggleOne(e.id)}
                              className="h-4 w-4 rounded border-gray-300 accent-blue-600 cursor-pointer" />
                          </td>

                          {/* Employee */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0", avatarColor(e.employee.name))}>
                                {initials(e.employee.name)}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">{e.employee.name}</p>
                                <p className="text-xs text-gray-400 truncate">{e.employee.email}</p>
                              </div>
                            </div>
                          </td>

                          {/* Description */}
                          <td className="px-4 py-3.5 max-w-[200px]">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-800 truncate">{e.description}</span>
                              {e.isAdminOverride && (
                                <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">
                                  <Flag className="w-2.5 h-2.5" /> Override
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Category */}
                          <td className="px-4 py-3.5">
                            <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", catCls)}>
                              {e.category}
                            </span>
                          </td>

                          {/* Date */}
                          <td className="px-4 py-3.5 tabular-nums text-gray-500 text-sm whitespace-nowrap">
                            {new Date(e.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                          </td>

                          {/* Amount */}
                          <td className="px-4 py-3.5 tabular-nums">
                            <ExpenseAmountCell
                              convertedAmount={e.convertedAmount}
                              companyCurrency={companyCurrency}
                              submittedAmount={e.submittedAmount}
                              submittedCurrency={e.submittedCurrency}
                              viewerRole="ADMIN"
                            />
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3.5">
                            <span className={cn("inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full", status.pill)}>
                              <span className={cn("w-1.5 h-1.5 rounded-full", status.dot)} />
                              {status.label}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3.5" onClick={ev => ev.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Link href={`/expenses/${e.id}`}>
                                <button className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                                  <Eye className="w-4 h-4" />
                                </button>
                              </Link>
                              {!e.isAdminOverride && e.status !== "APPROVED" && e.status !== "REJECTED" && (
                                <>
                                  <button
                                    onClick={() => setOverrideDialog({ open: true, expenseId: e.id, expenseDescription: e.description, action: "APPROVE" })}
                                    className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors"
                                  ><Check className="w-4 h-4" /></button>
                                  <button
                                    onClick={() => setOverrideDialog({ open: true, expenseId: e.id, expenseDescription: e.description, action: "REJECT" })}
                                    className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                                  ><X className="w-4 h-4" /></button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 bg-gray-50/60">
                <span className="text-sm text-gray-500 font-medium">
                  Showing {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} expenses
                </span>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                    className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-white hover:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 text-sm font-semibold text-gray-700">{page} / {totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                    className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-white hover:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <AdminOverrideDialog
        expenseId={overrideDialog.expenseId}
        expenseDescription={overrideDialog.expenseDescription}
        action={overrideDialog.action}
        open={overrideDialog.open}
        onClose={() => setOverrideDialog(d => ({ ...d, open: false }))}
        onSuccess={() => router.refresh()}
      />
    </div>
  )
}
