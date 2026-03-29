import { getServerSession } from "next-auth"
import { redirect, notFound } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { ApprovalAction, User } from "@prisma/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { formatCurrency } from "@/lib/formatCurrency"
import { SubmitExpenseButton } from "@/components/SubmitExpenseButton"
import { ArrowLeft, AlertTriangle, CheckCircle2, XCircle, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

export default async function ExpenseDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  const expense = await prisma.expense.findUnique({
    where: { id: params.id },
    include: {
      employee: true,
      approvalActions: {
        include: { approver: true },
        orderBy: { stepOrder: "asc" },
      },
      adminOverrideBy: true,
    },
  })

  if (!expense) {
    notFound()
  }

  const company = await prisma.company.findUnique({
    where: { id: session.user.companyId },
    select: { currency: true },
  })

  const canView =
    expense.employeeId === session.user.id ||
    session.user.role === "ADMIN" ||
    session.user.role === "MANAGER"

  const isOwner = expense.employeeId === session.user.id

  if (!canView) {
    redirect("/expenses")
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "warning" | "success" | "destructive" | "gray"> = {
      DRAFT: "gray",
      PENDING: "warning",
      APPROVED: "success",
      REJECTED: "destructive",
    }
    return <Badge variant={variants[status] || "gray"}>{status.toLowerCase()}</Badge>
  }

  const actionIcon = (action: string) => {
    if (action === "APPROVED") return <CheckCircle2 className="w-4 h-4 text-emerald-600" />
    if (action === "REJECTED") return <XCircle className="w-4 h-4 text-red-600" />
    return <Clock className="w-4 h-4 text-amber-600" />
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <Link href="/expenses" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Expenses
          </Link>
          <h1 className="text-page-title">{expense.description}</h1>
          <p className="text-body-muted mt-1">
            Submitted by {expense.employee.name} &middot; {expense.date.toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <SubmitExpenseButton
            expenseId={expense.id}
            isDraft={expense.status === "DRAFT" && isOwner}
          />
        </div>
      </div>

      {expense.isAdminOverride && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 text-sm dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-800">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            This expense was overridden by an admin on{" "}
            {expense.adminOverrideAt?.toLocaleDateString()}.
            {expense.adminOverrideComment && (
              <span> Comment: &ldquo;{expense.adminOverrideComment}&rdquo;</span>
            )}
          </span>
        </div>
      )}

      <Card className="shadow-elevation-2 border-border/70">
        <CardHeader className="pb-4 border-b border-border/50">
          <CardTitle>Expense Details</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 divide-x divide-border">
              <div className="p-4">
                <p className="text-label mb-1.5">Category</p>
                <p className="font-medium">{expense.category}</p>
              </div>
              <div className="p-4">
                <p className="text-label mb-1.5">Date</p>
                <p className="font-medium">{expense.date.toLocaleDateString()}</p>
              </div>
              <div className="p-4">
                <p className="text-label mb-1.5">Status</p>
                <div className="mt-1">{getStatusBadge(expense.status)}</div>
              </div>
              <div className="p-4">
                <p className="text-label mb-1.5">Submitted By</p>
                <p className="font-medium">{expense.employee.name}</p>
              </div>
            </div>
            <div className="p-4">
              <p className="text-label mb-2">Amount</p>
              <p className="text-2xl font-bold tracking-tight">
                {formatCurrency(Number(expense.convertedAmount), company?.currency || "USD")}
                <span className="text-sm font-normal text-muted-foreground ml-2">({company?.currency || "USD"})</span>
              </p>
              {expense.submittedCurrency !== company?.currency && (
                <p className="text-sm text-muted-foreground mt-1">
                  Originally: {formatCurrency(Number(expense.submittedAmount), expense.submittedCurrency)}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-elevation-2 border-border/70">
        <CardHeader className="pb-4 border-b border-border/50">
          <CardTitle>Approval History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {expense.approvalActions.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center gap-2">
              <Clock className="w-8 h-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No approval actions yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {expense.approvalActions.map((action: ApprovalAction & { approver: User }) => (
                <div key={action.id} className="flex items-center justify-between p-4 hover:bg-surface transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                      action.action === "APPROVED" ? "bg-emerald-50" :
                      action.action === "REJECTED" ? "bg-red-50" : "bg-amber-50"
                    )}>
                      {actionIcon(action.action)}
                    </div>
                    <div>
                      <p className="font-medium leading-tight">{action.approver.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Step {action.stepOrder + 1}</p>
                      {action.comment && (
                        <p className="text-sm text-muted-foreground mt-1 italic">&ldquo;{action.comment}&rdquo;</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <Badge
                      variant={
                        action.action === "APPROVED" ? "success" :
                        action.action === "REJECTED" ? "destructive" : "warning"
                      }
                    >
                      {action.action.toLowerCase()}
                    </Badge>
                    {action.actedAt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {action.actedAt.toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
