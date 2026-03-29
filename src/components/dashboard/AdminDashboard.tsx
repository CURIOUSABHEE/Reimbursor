"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StatusBadge } from "./StatusBadge"
import { formatCurrency } from "@/lib/formatCurrency"
import { Users, Clock, CheckCircle, DollarSign, Trash2, Search } from "lucide-react"

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Welcome, {userName}</h1>
          <p className="text-muted-foreground text-sm">Admin Dashboard — full company overview</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/users">
            <Button variant="outline" size="sm"><Users className="h-4 w-4 mr-1" /> Manage Users</Button>
          </Link>
          <Link href="/expenses/new">
            <Button size="sm">New Expense</Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="border rounded-lg p-5 flex items-center gap-4">
          <Users className="h-8 w-8 text-blue-500 shrink-0" />
          <div>
            <p className="text-2xl font-bold">{userCount}</p>
            <p className="text-sm text-muted-foreground">Total users</p>
          </div>
        </div>
        <div className="border rounded-lg p-5 flex items-center gap-4">
          <Clock className="h-8 w-8 text-yellow-500 shrink-0" />
          <div>
            <p className="text-2xl font-bold">{pendingCount}</p>
            <p className="text-sm text-muted-foreground">Pending expenses</p>
          </div>
        </div>
        <div className="border rounded-lg p-5 flex items-center gap-4">
          <CheckCircle className="h-8 w-8 text-green-500 shrink-0" />
          <div>
            <p className="text-lg font-bold">{formatCurrency(approvedTotal, currency)}</p>
            <p className="text-sm text-muted-foreground">Approved total</p>
          </div>
        </div>
        <div className="border rounded-lg p-5 flex items-center gap-4">
          <DollarSign className="h-8 w-8 text-orange-500 shrink-0" />
          <div>
            <p className="text-lg font-bold">{formatCurrency(pendingTotal, currency)}</p>
            <p className="text-sm text-muted-foreground">Pending total</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search expenses or employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1">
          {["ALL", "DRAFT", "PENDING", "APPROVED", "REJECTED"].map((s) => (
            <Button
              key={s}
              size="sm"
              variant={statusFilter === s ? "default" : "outline"}
              onClick={() => setStatusFilter(s)}
            >
              {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Employee</th>
              <th className="px-4 py-3 text-left font-medium">Description</th>
              <th className="px-4 py-3 text-left font-medium">Category</th>
              <th className="px-4 py-3 text-left font-medium">Date</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th>
              <th className="px-4 py-3 text-center font-medium">Status</th>
              <th className="px-4 py-3 text-center font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No expenses found</td>
              </tr>
            )}
            {filtered.map((e) => (
              <tr key={e.id} className="hover:bg-muted/40 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium">{e.employee.name}</p>
                  <p className="text-xs text-muted-foreground">{e.employee.email}</p>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/expenses/${e.id}`} className="hover:underline font-medium">
                    {e.description}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{e.category}</td>
                <td className="px-4 py-3 text-muted-foreground">{new Date(e.date).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-right font-medium">{formatCurrency(e.convertedAmount, currency)}</td>
                <td className="px-4 py-3 text-center"><StatusBadge status={e.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <Link href={`/expenses/${e.id}`}>
                      <Button variant="ghost" size="sm">View</Button>
                    </Link>
                    {e.status === "PENDING" && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-green-700 hover:text-green-800"
                          onClick={() => handleStatusChange(e.id, "APPROVED")}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-700 hover:text-red-800"
                          onClick={() => handleStatusChange(e.id, "REJECTED")}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(e.id)}
                      disabled={deleting === e.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          {filtered.length > 0 && (
            <tfoot className="bg-muted/50">
              <tr>
                <td colSpan={4} className="px-4 py-3 font-semibold text-right">Total ({filtered.length} records)</td>
                <td className="px-4 py-3 text-right font-bold">{formatCurrency(total, currency)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
