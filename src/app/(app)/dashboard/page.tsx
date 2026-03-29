import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AdminDashboard } from "@/components/dashboard/AdminDashboard"
import { ManagerDashboard } from "@/components/dashboard/ManagerDashboard"
import { EmployeeDashboard } from "@/components/dashboard/EmployeeDashboard"
import type { Expense, ApprovalAction } from "@prisma/client"

type ExpenseWithEmployee = Expense & {
  employee: { name: string; email: string }
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const role = session.user.role
  const userId = session.user.id

  // Always resolve companyId fresh from DB
  const freshUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { companyId: true },
  })
  const companyId = freshUser?.companyId ?? session.user.companyId

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { currency: true, name: true },
  })
  const currency = company?.currency ?? "USD"

  // ── ADMIN ──────────────────────────────────────────────────────────────────
  if (role === "ADMIN") {
    const [allExpenses, userCount, pendingCount, approvedTotal, pendingTotal] =
      await Promise.all([
        prisma.expense.findMany({
          where: { companyId },
          include: { employee: { select: { name: true, email: true } } },
          orderBy: { createdAt: "desc" },
          take: 50,
        }),
        prisma.user.count({ where: { companyId } }),
        prisma.expense.count({ where: { companyId, status: "PENDING" } }),
        prisma.expense.aggregate({
          where: { companyId, status: "APPROVED" },
          _sum: { convertedAmount: true },
        }),
        prisma.expense.aggregate({
          where: { companyId, status: "PENDING" },
          _sum: { convertedAmount: true },
        }),
      ])

    return (
      <AdminDashboard
        userName={session.user.name}
        currency={currency}
        userCount={userCount}
        pendingCount={pendingCount}
        approvedTotal={Number(approvedTotal._sum.convertedAmount ?? 0)}
        pendingTotal={Number(pendingTotal._sum.convertedAmount ?? 0)}
        expenses={(allExpenses as ExpenseWithEmployee[]).map((e: ExpenseWithEmployee) => ({
          id: e.id,
          description: e.description,
          category: e.category,
          date: e.date.toISOString(),
          submittedAmount: Number(e.submittedAmount),
          submittedCurrency: e.submittedCurrency,
          convertedAmount: Number(e.convertedAmount),
          exchangeRate: Number(e.exchangeRate),
          status: e.status,
          employee: e.employee,
          isAdminOverride: e.isAdminOverride,
        }))}
      />
    )
  }

  // ── MANAGER ────────────────────────────────────────────────────────────────
  if (role === "MANAGER") {
    const [myExpenses, pendingApprovals, approvedByMe, rejectedByMe] =
      await Promise.all([
        prisma.expense.findMany({
          where: { employeeId: userId },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
        prisma.approvalAction.findMany({
          where: { approverId: userId, action: "PENDING" },
          include: {
            expense: { include: { employee: { select: { name: true, email: true } } } },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.approvalAction.count({ where: { approverId: userId, action: "APPROVED" } }),
        prisma.approvalAction.count({ where: { approverId: userId, action: "REJECTED" } }),
      ])

    return (
      <ManagerDashboard
        userName={session.user.name}
        currency={currency}
        pendingApprovalCount={pendingApprovals.length}
        approvedByMe={approvedByMe}
        rejectedByMe={rejectedByMe}
        myExpenses={myExpenses.map((e: Expense) => ({
          id: e.id,
          description: e.description,
          category: e.category,
          date: e.date.toISOString(),
          submittedAmount: Number(e.submittedAmount),
          submittedCurrency: e.submittedCurrency,
          convertedAmount: Number(e.convertedAmount),
          status: e.status,
        }))}
        pendingApprovals={pendingApprovals.map((a: ApprovalAction & { expense: ExpenseWithEmployee }) => ({
          id: a.expense.id,
          description: a.expense.description,
          category: a.expense.category,
          date: a.expense.date.toISOString(),
          submittedAmount: Number(a.expense.submittedAmount),
          submittedCurrency: a.expense.submittedCurrency,
          convertedAmount: Number(a.expense.convertedAmount),
          status: a.expense.status,
          employee: a.expense.employee,
        }))}
      />
    )
  }

  // ── EMPLOYEE ───────────────────────────────────────────────────────────────
  const [expenses, toSubmit, underValidation, toBeReimbursed] = await Promise.all([
    prisma.expense.findMany({
      where: { employeeId: userId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.expense.aggregate({
      where: { employeeId: userId, status: "DRAFT" },
      _sum: { convertedAmount: true },
    }),
    prisma.expense.aggregate({
      where: { employeeId: userId, status: "PENDING" },
      _sum: { convertedAmount: true },
    }),
    prisma.expense.aggregate({
      where: { employeeId: userId, status: "APPROVED" },
      _sum: { convertedAmount: true },
    }),
  ])

  return (
    <EmployeeDashboard
      userName={session.user.name}
      currency={currency}
      toSubmit={Number(toSubmit._sum.convertedAmount ?? 0)}
      underValidation={Number(underValidation._sum.convertedAmount ?? 0)}
      toBeReimbursed={Number(toBeReimbursed._sum.convertedAmount ?? 0)}
      expenses={expenses.map((e: Expense) => ({
        id: e.id,
        description: e.description,
        category: e.category,
        date: e.date.toISOString(),
        submittedAmount: Number(e.submittedAmount),
        submittedCurrency: e.submittedCurrency,
        convertedAmount: Number(e.convertedAmount),
        status: e.status,
      }))}
    />
  )
}
