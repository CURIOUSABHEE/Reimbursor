import { getServerSession } from "next-auth"
import { redirect, notFound } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { ApprovalAction, User } from "@prisma/client"
import Link from "next/link"
import { formatCurrency } from "@/lib/formatCurrency"
import { SubmitExpenseButton } from "@/components/SubmitExpenseButton"
import { AlertTriangle, Clock } from "lucide-react"

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

  return (
    <div className="flex flex-col h-full">
      <div className="o-breadcrumb">
        <Link href="/expenses" className="text-gray-400 text-[12px] hover:text-blue-600">Expenses</Link>
        <span className="text-gray-300 mx-1">/</span>
        <span className="text-[13px] font-semibold text-gray-800 truncate max-w-xs">{expense.description}</span>
        <div className="ml-auto flex items-center gap-2">
          <SubmitExpenseButton expenseId={expense.id} isDraft={expense.status === "DRAFT" && isOwner} />
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4 max-w-4xl space-y-4">

      {expense.isAdminOverride && (
        <div className="flex items-start gap-3 rounded border border-amber-200 bg-amber-50 px-3 py-2.5 text-amber-800 text-[12px]">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            Overridden by admin on {expense.adminOverrideAt?.toLocaleDateString()}.
            {expense.adminOverrideComment && <span> &ldquo;{expense.adminOverrideComment}&rdquo;</span>}
          </span>
        </div>
      )}

      {/* Details */}
      <div className="o-container overflow-hidden">
        <div className="px-3 py-2 border-b" style={{ borderColor: "#dcdcdc", background: "#f7f7f7" }}>
          <span className="text-[12px] font-semibold text-gray-700">Expense Details</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x" style={{ borderColor: "#ebebeb" }}>
          {[
            { label: "Category", value: expense.category },
            { label: "Date", value: expense.date.toLocaleDateString() },
            { label: "Status", value: <span className={`o-badge o-badge-${expense.status.toLowerCase()}`}>{expense.status.toLowerCase()}</span> },
            { label: "Submitted By", value: expense.employee.name },
          ].map((f) => (
            <div key={f.label} className="p-3">
              <p className="o-label mb-1">{f.label}</p>
              <p className="text-[13px] font-medium text-gray-900">{f.value}</p>
            </div>
          ))}
        </div>
        <div className="p-3 border-t" style={{ borderColor: "#ebebeb" }}>
          <p className="o-label mb-1">Amount</p>
          <p className="text-[20px] font-bold text-gray-900">
            {formatCurrency(Number(expense.convertedAmount), company?.currency || "USD")}
            <span className="text-[12px] font-normal text-gray-500 ml-2">({company?.currency || "USD"})</span>
          </p>
          {expense.submittedCurrency !== company?.currency && (
            <p className="text-[12px] text-gray-500 mt-0.5">
              Originally: {formatCurrency(Number(expense.submittedAmount), expense.submittedCurrency)}
            </p>
          )}
        </div>
      </div>

      {/* Approval history */}
      <div className="o-container overflow-hidden">
        <div className="px-3 py-2 border-b" style={{ borderColor: "#dcdcdc", background: "#f7f7f7" }}>
          <span className="text-[12px] font-semibold text-gray-700">Approval History</span>
        </div>
        {expense.approvalActions.length === 0 ? (
          <div className="o-empty">
            <Clock className="w-6 h-6 opacity-30" />
            <p className="text-[12px]">No approval actions yet</p>
          </div>
        ) : (
          <table className="o-table">
            <thead>
              <tr><th>Approver</th><th>Step</th><th>Decision</th><th>Comment</th><th>Date</th></tr>
            </thead>
            <tbody>
              {expense.approvalActions.map((action: ApprovalAction & { approver: User }) => (
                <tr key={action.id}>
                  <td className="font-medium">{action.approver.name}</td>
                  <td className="text-gray-500">Step {action.stepOrder + 1}</td>
                  <td>
                    <span className={`o-badge o-badge-${action.action === "APPROVED" ? "approved" : action.action === "REJECTED" ? "rejected" : "pending"}`}>
                      {action.action.toLowerCase()}
                    </span>
                  </td>
                  <td className="text-gray-500 italic">{action.comment || "—"}</td>
                  <td className="text-gray-500 tabular-nums">{action.actedAt?.toLocaleDateString() || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      </div>
    </div>
  )
}
