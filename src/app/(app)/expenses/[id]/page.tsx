import { getServerSession } from "next-auth"
import { redirect, notFound } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { formatCurrency } from "@/lib/formatCurrency"

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
    return <Badge variant={variants[status] || "gray"}>{status}</Badge>
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{expense.description}</h1>
          <p className="text-muted-foreground">
            Expense Details
          </p>
        </div>
        <Link href="/expenses">
          <Button variant="outline">Back to Expenses</Button>
        </Link>
      </div>

      {expense.isAdminOverride && (
        <div className="rounded-md border border-yellow-400 bg-yellow-50 px-4 py-3 text-yellow-800 text-sm dark:bg-yellow-950 dark:text-yellow-200">
          This expense was overridden by an admin on{" "}
          {expense.adminOverrideAt?.toLocaleDateString()}.
          {expense.adminOverrideComment && (
            <span> Comment: &quot;{expense.adminOverrideComment}&quot;</span>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Expense Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Category</p>
              <p className="font-medium">{expense.category}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Date</p>
              <p className="font-medium">{expense.date.toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <div className="mt-1">{getStatusBadge(expense.status)}</div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Submitted By</p>
              <p className="font-medium">{expense.employee.name}</p>
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <p className="text-sm text-muted-foreground mb-2">Amount</p>
            <div className="space-y-1">
              <p className="text-lg font-medium">
                {formatCurrency(
                  Number(expense.convertedAmount),
                  company?.currency || "USD"
                )}{" "}
                <span className="text-sm text-muted-foreground">(company)</span>
              </p>
              {expense.submittedCurrency !== company?.currency && (
                <p className="text-sm text-muted-foreground">
                  Originally:{" "}
                  {formatCurrency(
                    Number(expense.submittedAmount),
                    expense.submittedCurrency
                  )}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Approval History</CardTitle>
        </CardHeader>
        <CardContent>
          {expense.approvalActions.length === 0 ? (
            <p className="text-muted-foreground">No approval actions yet</p>
          ) : (
            <div className="space-y-4">
              {expense.approvalActions.map((action) => (
                <div
                  key={action.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{action.approver.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Step {action.stepOrder + 1}
                    </p>
                    {action.comment && (
                      <p className="text-sm mt-1">{action.comment}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={
                        action.action === "APPROVED"
                          ? "success"
                          : action.action === "REJECTED"
                          ? "destructive"
                          : "warning"
                      }
                    >
                      {action.action}
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
