"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/formatCurrency"
import { Users, Clock, CheckCircle2, DollarSign, Trash2, Search, Plus } from "lucide-react"
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

interface Props {
  userName: string
  currency: string
  userCount: number
  pendingCount: number
  approvedTotal: number
  pendingTotal: number
  expenses: Expense[]
}

const STATUS_FILTERS = ["ALL", "DRAFT", "PENDING", "APPROVED", "REJECTED"] as const

const statusVariants: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  DRAFT: "secondary",
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "destructive",
}

export function AdminDashboard({ userName, currency, userCount, pendingCount, approvedTotal, pendingTotal, expenses }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [deleting, setDeleting] = useState<string | null>(null)

  const filtered = expenses.filter((e) => {
    const matchSearch =
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      e.employee.name.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === "ALL" || e.status === statusFilter
    return matchSearch && matchStatus
  })

  const total = filtered.reduce((s, e) => s + e.convertedAmount, 0)

  async function handleDelete(id: string) {
    if (!confirm("Delete this expense? This cannot be undone.")) return
    setDeleting(id)
    await fetch(`/api/expenses/${id}`, { method: "DELETE" })
    setDeleting(null)
    router.refresh()
  }

  async function handleStatusChange(id: string, status: string) {
    await fetch(`/api/expenses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    router.refresh()
  }

  const stats = [
    { label: "Total Users", value: userCount, icon: Users, iconBg: "bg-blue-50", iconColor: "text-blue-600" },
    { label: "Pending Expenses", value: pendingCount, icon: Clock, iconBg: "bg-amber-50", iconColor: "text-amber-600" },
    { label: "Approved Total", value: formatCurrency(approvedTotal, currency), icon: CheckCircle2, iconBg: "bg-emerald-50", iconColor: "text-emerald-600", isAmount: true },
    { label: "Pending Total", value: formatCurrency(pendingTotal, currency), icon: DollarSign, iconBg: "bg-orange-50", iconColor: "text-orange-600", isAmount: true },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-page-title">Welcome back, {userName.split(" ")[0]}</h1>
          <p className="text-body-muted mt-1">Full company overview and expense management.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link href="/admin/users">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Users className="h-4 w-4" /> Manage Users
            </Button>
          </Link>
          <Link href="/expenses/new">
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> New Expense
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className="shadow-elevation-2 border-border/70 hover:shadow-elevation-3 transition-shadow duration-200">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <p className="text-label">{stat.label}</p>
                    {stat.isAmount ? (
                      <p className="text-xl font-bold tracking-tight text-foreground leading-none mt-2">{stat.value}</p>
                    ) : (
                      <p className="text-metric">{stat.value}</p>
                    )}
                  </div>
                  <div className={cn("mt-0.5 p-2.5 rounded-lg shrink-0", stat.iconBg)}>
                    <Icon className={cn("w-5 h-5", stat.iconColor)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search expenses or employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {STATUS_FILTERS.map((s) => (
            <Button
              key={s}
              size="sm"
              variant={statusFilter === s ? "default" : "outline"}
              onClick={() => setStatusFilter(s)}
              className="text-xs"
            >
              {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card className="shadow-elevation-2 border-border/70">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left text-label">Employee</th>
                  <th className="px-4 py-3 text-left text-label">Description</th>
                  <th className="px-4 py-3 text-left text-label hidden md:table-cell">Category</th>
                  <th className="px-4 py-3 text-left text-label hidden lg:table-cell">Date</th>
                  <th className="px-4 py-3 text-right text-label">Amount</th>
                  <th className="px-4 py-3 text-center text-label">Status</th>
                  <th className="px-4 py-3 text-center text-label">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground text-sm">
                      No expenses found
                    </td>
                  </tr>
                )}
                {filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-surface transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-surface-high flex items-center justify-center text-xs font-semibold text-muted-foreground shrink-0">
                          {e.employee.name[0]}
                        </div>
                        <div>
                          <p className="font-medium leading-tight">{e.employee.name}</p>
                          <p className="text-xs text-muted-foreground">{e.employee.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/expenses/${e.id}`} className="font-medium hover:text-primary transition-colors">
                        {e.description}
                      </Link>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <Badge variant="secondary" className="text-xs">{e.category}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                      {new Date(e.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatCurrency(e.convertedAmount, currency)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={statusVariants[e.status] || "secondary"}>
                        {e.status.toLowerCase()}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <Link href={`/expenses/${e.id}`}>
                          <Button variant="ghost" size="sm" className="text-xs h-7">View</Button>
                        </Link>
                        {e.status === "PENDING" && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs h-7 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
                              onClick={() => handleStatusChange(e.id, "APPROVED")}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs h-7 text-red-700 hover:text-red-800 hover:bg-red-50"
                              onClick={() => handleStatusChange(e.id, "REJECTED")}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDelete(e.id)}
                          disabled={deleting === e.id}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {filtered.length > 0 && (
                <tfoot>
                  <tr className="border-t border-border bg-muted/30">
                    <td colSpan={4} className="px-4 py-3 text-right text-sm font-semibold text-muted-foreground">
                      Total ({filtered.length} records)
                    </td>
                    <td className="px-4 py-3 text-right font-bold">{formatCurrency(total, currency)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
