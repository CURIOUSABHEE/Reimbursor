import { prisma } from "@/lib/prisma"

export async function getDashboardData(userId: string, companyId: string, role: string) {
  const [expenses, stats, pendingApprovals] = await Promise.all([
    prisma.expense.findMany({
      where: { employeeId: userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        description: true,
        category: true,
        submittedAmount: true,
        submittedCurrency: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.expense.groupBy({
      by: ["status"],
      where: { employeeId: userId },
      _count: true,
    }),
    role === "MANAGER" || role === "ADMIN"
      ? prisma.approvalAction.count({
          where: { approverId: userId, action: "PENDING" },
        })
      : Promise.resolve(0),
  ])

  const statusCounts = stats.reduce(
    (acc: Record<string, number>, s: { status: string; _count: number }) => {
      acc[s.status] = s._count
      return acc
    },
    { PENDING: 0, APPROVED: 0, REJECTED: 0, DRAFT: 0 } as Record<string, number>
  )

  return {
    expenses: expenses.map((e: { 
      id: string
      description: string
      category: string
      submittedAmount: unknown
      submittedCurrency: string
      status: string
      createdAt: Date 
    }) => ({
      ...e,
      submittedAmount: Number(e.submittedAmount),
    })),
    totalExpenses: expenses.length,
    pendingCount: statusCounts.PENDING || 0,
    approvedCount: statusCounts.APPROVED || 0,
    rejectedCount: statusCounts.REJECTED || 0,
    pendingApprovals,
  }
}
