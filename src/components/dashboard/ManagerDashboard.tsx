"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { formatCurrency } from "@/lib/formatCurrency"
import { Plus, CheckCircle2, XCircle, Clock, ArrowRight, CheckSquare, FileText } from "lucide-react"
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

const statusVariants: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  DRAFT: "secondary",
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "destructive",
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

  const stats = [
    {
      label: "Pending Approvals",
      value: pendingApprovalCount,
      icon: Clock,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
      urgent: pendingApprovalCount > 0,
    },
    {
      label: "Approved by Me",
      value: approvedByMe,
      icon: CheckCircle2,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      urgent: false,
    },
    {
      label: "Rejected by Me",
      value: rejectedByMe,
      icon: XCircle,
      iconBg: "bg-red-50",
      iconColor: "text-red-600",
      urgent: false,
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-page-title">Welcome back, {userName.split(" ")[0]}</h1>
          <p className="text-body-muted mt-1">Here&rsquo;s your team&rsquo;s expense activity.</p>
        </div>
        <Link href="/expenses/new">
          <Button className="gap-2 shrink-0">
            <Plus className="h-4 w-4" /> New Expense
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card
              key={stat.label}
              className={cn(
                "shadow-elevation-2 border-border/70 hover:shadow-elevation-3 transition-shadow duration-200",
                stat.urgent && "border-amber-200 bg-amber-50/30"
              )}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <p className="text-label">{stat.label}</p>
                    <p className="text-metric">{stat.value}</p>
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

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(["approvals", "mine"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t === "approvals"
              ? `Pending Approvals${pendingApprovalCount > 0 ? ` (${pendingApprovalCount})` : ""}`
              : "My Expenses"}
          </button>
        ))}
      </div>

      {tab === "approvals" && (
        <div className="space-y-4">
          {pendingApprovals.length === 0 ? (
            <Card>
              <CardContent className="py-16">
                <EmptyState
                  icon={<CheckSquare className="w-8 h-8" />}
                  title="All caught up"
                  description="No pending approvals right now. Check back later."
                />
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="shadow-elevation-2 border-border/70">
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {pendingApprovals.map((e) => (
                      <div key={e.id} className="flex items-center justify-between p-4 hover:bg-surface transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                            <Clock className="w-4 h-4 text-amber-600" />
                          </div>
                          <div className="min-w-0">
                            <Link href={`/expenses/${e.id}`} className="font-medium hover:text-primary transition-colors truncate block">
                              {e.description}
                            </Link>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {e.employee.name} &middot; {new Date(e.date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-4">
                          <span className="font-semibold text-sm hidden sm:block">
                            {formatCurrency(e.convertedAmount, currency)}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300"
                            disabled={acting === e.id}
                            onClick={() => handleAction(e.id, "APPROVED")}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-700 border-red-200 hover:bg-red-50 hover:border-red-300"
                            disabled={acting === e.id}
                            onClick={() => handleAction(e.id, "REJECTED")}
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardContent className="p-4">
                  <label className="text-sm font-medium text-foreground block mb-2">
                    Comment <span className="text-muted-foreground font-normal">(optional)</span>
                  </label>
                  <Textarea
                    placeholder="Add a comment for your approval or rejection..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={2}
                    className="text-sm resize-none"
                  />
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Link href="/approvals">
                  <Button variant="ghost" size="sm" className="gap-1 text-primary">
                    View all in Approvals
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      )}

      {tab === "mine" && (
        <Card className="shadow-elevation-2 border-border/70">
          <CardContent className="p-0">
            {myExpenses.length === 0 ? (
              <EmptyState
                icon={<FileText className="w-8 h-8" />}
                title="No expenses yet"
                description="Create your first expense to get started"
                action={{ label: "New Expense", onClick: () => { window.location.href = "/expenses/new" } }}
              />
            ) : (
              <div className="divide-y divide-border">
                {myExpenses.map((e) => (
                  <Link
                    key={e.id}
                    href={`/expenses/${e.id}`}
                    className="flex items-center justify-between p-4 hover:bg-surface transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-surface flex items-center justify-center shrink-0">
                        <span className="text-sm font-semibold text-muted-foreground">{e.category.charAt(0)}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{e.description}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {e.category} &middot; {new Date(e.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <span className="font-semibold text-sm hidden sm:block">
                        {formatCurrency(e.convertedAmount, currency)}
                      </span>
                      <Badge variant={statusVariants[e.status] || "secondary"}>
                        {e.status.toLowerCase()}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
