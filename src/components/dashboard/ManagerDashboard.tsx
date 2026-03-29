"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { StatusBadge } from "./StatusBadge"
import { formatCurrency } from "@/lib/formatCurrency"
import { Plus, CheckCircle, XCircle, Clock } from "lucide-react"

interface Expense {
  id: string
  description: string
  category: string
  date: string
  submittedAmount: number
  submittedCurrency: string
  convertedAmount: number
  status: string
}

interface PendingExpense extends Expense {
  employee: { name: string; email: string }
}

interface Props {
  userName: string
  currency: string
  pendingApprovalCount: number
  approvedByMe: number
  rejectedByMe: number
  myExpenses: Expense[]
  pendingApprovals: PendingExpense[]
}

export function ManagerDashboard({ userName, currency, pendingApprovalCount, approvedByMe, rejectedByMe, myExpenses, pendingApprovals }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<"mine" | "approvals">("approvals")
  const [comment, setComment] = useState("")
  const [acting, setActing] = useState<string | null>(null)

  async function handleAction(expenseId: string, action: "APPROVED" | "REJECTED") {
    setActing(expenseId)
    await fetch("/api/approvals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expenseId, action, comment }),
    })
    setComment("")
    setActing(null)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Welcome, {userName}</h1>
          <p className="text-muted-foreground text-sm">Manager Dashboard</p>
        </div>
        <Link href="/expenses/new">
          <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Expense</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="border rounded-lg p-5 flex items-center gap-4">
          <Clock className="h-8 w-8 text-yellow-500 shrink-0" />
          <div>
            <p className="text-2xl font-bold">{pendingApprovalCount}</p>
            <p className="text-sm text-muted-foreground">Pending approvals</p>
          </div>
        </div>
        <div className="border rounded-lg p-5 flex items-center gap-4">
          <CheckCircle className="h-8 w-8 text-green-500 shrink-0" />
          <div>
            <p className="text-2xl font-bold">{approvedByMe}</p>
            <p className="text-sm text-muted-foreground">Approved by me</p>
          </div>
        </div>
        <div className="border rounded-lg p-5 flex items-center gap-4">
          <XCircle className="h-8 w-8 text-red-500 shrink-0" />
          <div>
            <p className="text-2xl font-bold">{rejectedByMe}</p>
            <p className="text-sm text-muted-foreground">Rejected by me</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {(["approvals", "mine"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "approvals" ? `Pending Approvals (${pendingApprovalCount})` : "My Expenses"}
          </button>
        ))}
      </div>

      {tab === "approvals" && (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Employee</th>
                <th className="px-4 py-3 text-left font-medium">Description</th>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-right font-medium">Amount</th>
                <th className="px-4 py-3 text-center font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {pendingApprovals.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No pending approvals</td></tr>
              )}
              {pendingApprovals.map((e) => (
                <tr key={e.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3 font-medium">{e.employee.name}</td>
                  <td className="px-4 py-3">
                    <Link href={`/expenses/${e.id}`} className="hover:underline">{e.description}</Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(e.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatCurrency(e.convertedAmount, currency)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-700 border-green-300 hover:bg-green-50"
                        disabled={acting === e.id}
                        onClick={() => handleAction(e.id, "APPROVED")}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-700 border-red-300 hover:bg-red-50"
                        disabled={acting === e.id}
                        onClick={() => handleAction(e.id, "REJECTED")}
                      >
                        Reject
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pendingApprovals.length > 0 && (
            <div className="p-4 border-t bg-muted/30">
              <Textarea
                placeholder="Optional comment for approval/rejection..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                className="text-sm"
              />
            </div>
          )}
        </div>
      )}

      {tab === "mine" && (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Description</th>
                <th className="px-4 py-3 text-left font-medium">Category</th>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-right font-medium">Amount</th>
                <th className="px-4 py-3 text-center font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {myExpenses.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No expenses yet</td></tr>
              )}
              {myExpenses.map((e) => (
                <tr key={e.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <Link href={`/expenses/${e.id}`} className="font-medium hover:underline">{e.description}</Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{e.category}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(e.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatCurrency(e.convertedAmount, currency)}</td>
                  <td className="px-4 py-3 text-center"><StatusBadge status={e.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
