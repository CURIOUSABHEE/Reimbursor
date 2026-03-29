import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [expenses, stats, pendingApprovals] = await Promise.all([
    prisma.expense.findMany({
      where: { employeeId: session.user.id },
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
      where: { employeeId: session.user.id },
      _count: true,
    }),
    session.user.role === "MANAGER" || session.user.role === "ADMIN"
      ? prisma.approvalAction.count({
          where: { approverId: session.user.id, action: "PENDING" },
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

  return NextResponse.json({
    expenses: expenses.map((e) => ({
      ...e,
      submittedAmount: Number(e.submittedAmount),
    })),
    totalExpenses: expenses.length,
    pendingCount: statusCounts.PENDING || 0,
    approvedCount: statusCounts.APPROVED || 0,
    rejectedCount: statusCounts.REJECTED || 0,
    pendingApprovals,
  })
}
