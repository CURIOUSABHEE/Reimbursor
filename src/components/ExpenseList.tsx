"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { ExpenseAmountCell } from "@/components/ExpenseAmountCell"
import { Plus, FileText } from "lucide-react"

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

interface ExpenseListProps {
  expenses: Expense[]
  companyCurrency: string
  viewerRole: "ADMIN" | "MANAGER" | "EMPLOYEE"
  showCreateButton?: boolean
}

const statusVariants: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  DRAFT: "secondary",
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "destructive",
}

export function ExpenseList({ expenses, companyCurrency, viewerRole, showCreateButton = true }: ExpenseListProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="My Expenses"
        description="View and manage your submitted expenses"
        action={
          showCreateButton && (
            <Link href="/expenses/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Expense
              </Button>
            </Link>
          )
        }
      />

      <Card>
        <CardContent className="p-0">
          {expenses.length === 0 ? (
            <EmptyState
              icon={<FileText className="w-8 h-8" />}
              title="No expenses yet"
              description="Create your first expense to get started"
              action={
                showCreateButton
                  ? {
                      label: "Create expense",
                      onClick: () => window.location.href = "/expenses/new"
                    }
                  : undefined
              }
            />
          ) : (
            <div className="divide-y divide-border">
              {expenses.map((expense) => (
                <Link
                  key={expense.id}
                  href={`/expenses/${expense.id}`}
                  className="flex items-center justify-between p-4 hover:bg-surface transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center text-muted-foreground shrink-0">
                      <span className="text-sm font-semibold">{expense.category.charAt(0)}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{expense.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {expense.category} &middot; {new Date(expense.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <ExpenseAmountCell
                      convertedAmount={expense.convertedAmount}
                      companyCurrency={companyCurrency}
                      submittedAmount={expense.submittedAmount}
                      submittedCurrency={expense.submittedCurrency}
                      viewerRole={viewerRole}
                    />
                    {expense.isAdminOverride ? (
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                        Overridden
                      </Badge>
                    ) : (
                      <Badge variant={statusVariants[expense.status] || "secondary"}>
                        {expense.status.toLowerCase()}
                      </Badge>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
