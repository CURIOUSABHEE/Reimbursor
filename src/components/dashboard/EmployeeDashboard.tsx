"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { formatCurrency } from "@/lib/formatCurrency"
import { Plus, Trash2, FileText, Clock, CheckCircle2, Send } from "lucide-react"
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

interface Props {
  userName: string
  currency: string
  toSubmit: number
  underValidation: number
  toBeReimbursed: number
  expenses: Expense[]
}

const statusVariants: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  DRAFT: "secondary",
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "destructive",
}

export function EmployeeDashboard({ userName, currency, toSubmit, underValidation, toBeReimbursed, expenses }: Props) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleDelete(id: string) {
    if (!confirm("Delete this expense?")) return
    setDeleting(id)
    await fetch(`/api/expenses/${id}`, { method: "DELETE" })
    setDeleting(null)
    router.refresh()
  }

  const summaryCards = [
    {
      label: "To Submit",
      value: formatCurrency(toSubmit, currency),
      icon: Send,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      description: "drafts ready to send",
    },
    {
      label: "Under Validation",
      value: formatCurrency(underValidation, currency),
      icon: Clock,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
      description: "awaiting approval",
    },
    {
      label: "To Be Reimbursed",
      value: formatCurrency(toBeReimbursed, currency),
      icon: CheckCircle2,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      description: "approved and pending payment",
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-page-title">Welcome back, {userName.split(" ")[0]}</h1>
          <p className="text-body-muted mt-1">Track and manage your expense reports.</p>
        </div>
        <Link href="/expenses/new">
          <Button className="gap-2 shrink-0">
            <Plus className="h-4 w-4" /> New Expense
          </Button>
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.label} className="shadow-elevation-2 border-border/70 hover:shadow-elevation-3 transition-shadow duration-200">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-label">{card.label}</p>
                    <p className="text-xl font-bold tracking-tight text-foreground leading-none mt-2">{card.value}</p>
                    <p className="text-xs text-muted-foreground pt-0.5">{card.description}</p>
                  </div>
                  <div className={cn("mt-0.5 p-2.5 rounded-lg shrink-0", card.iconBg)}>
                    <Icon className={cn("w-5 h-5", card.iconColor)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Expense list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-section-header">My Expenses</h2>
          <Link href="/expenses">
            <Button variant="ghost" size="sm" className="text-primary text-xs gap-1">
              View all
            </Button>
          </Link>
        </div>

        <Card className="shadow-elevation-2 border-border/70">
          <CardContent className="p-0">
            {expenses.length === 0 ? (
              <EmptyState
                icon={<FileText className="w-8 h-8" />}
                title="No expenses yet"
                description="Create your first expense to get started"
                action={{ label: "New Expense", onClick: () => { window.location.href = "/expenses/new" } }}
              />
            ) : (
              <div className="divide-y divide-border">
                {expenses.map((e) => (
                  <div key={e.id} className="flex items-center justify-between p-4 hover:bg-surface transition-colors group">
                    <Link href={`/expenses/${e.id}`} className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-lg bg-surface flex items-center justify-center shrink-0">
                        <span className="text-sm font-semibold text-muted-foreground">{e.category.charAt(0)}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate hover:text-primary transition-colors">{e.description}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {e.category} &middot; {new Date(e.date).toLocaleDateString()}
                        </p>
                      </div>
                    </Link>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <span className="font-semibold text-sm hidden sm:block">
                        {formatCurrency(e.convertedAmount, currency)}
                      </span>
                      <Badge variant={statusVariants[e.status] || "secondary"}>
                        {e.status.toLowerCase()}
                      </Badge>
                      {e.status === "DRAFT" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDelete(e.id)}
                          disabled={deleting === e.id}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
