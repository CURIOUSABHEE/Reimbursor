import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"
import { initializeNotificationHandlers, notifyExpenseSubmitted } from "@/lib/notifications"

initializeNotificationHandlers()

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const expenseId = params.id

    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: { employee: true },
    })

    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 })
    }

    if (expense.employeeId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (expense.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Only draft expenses can be submitted" },
        { status: 400 }
      )
    }

    const rules = await prisma.approvalRule.findMany({
      where: {
        companyId: session.user.companyId,
      },
      orderBy: { stepOrder: "asc" },
    })

    const applicableRules = rules.filter((rule: { minAmount: unknown; maxAmount: unknown }) => {
      const minAmount = Number(rule.minAmount)
      const maxAmount = rule.maxAmount ? Number(rule.maxAmount) : null
      const convertedAmount = Number(expense.convertedAmount)
      
      const minOk = !rule.minAmount || convertedAmount >= minAmount
      const maxOk = !maxAmount || convertedAmount <= maxAmount
      return minOk && maxOk
    })

    await prisma.$transaction(async (tx) => {
      for (const rule of applicableRules) {
        const approver = rule.approverId
          ? await tx.user.findUnique({ where: { id: rule.approverId } })
          : await tx.user.findFirst({
              where: {
                companyId: session.user.companyId,
                role: rule.approverRole,
              },
            })

        if (approver) {
          await tx.approvalAction.create({
            data: {
              expenseId,
              ruleId: rule.id,
              approverId: approver.id,
              action: "PENDING",
              stepOrder: rule.stepOrder,
            },
          })
        }
      }

      await tx.expense.update({
        where: { id: expenseId },
        data: { status: "PENDING" },
      })
    })

    await notifyExpenseSubmitted({
      expenseId,
      expenseDescription: expense.description,
      employeeId: expense.employeeId,
      employeeName: expense.employee.name,
      companyId: session.user.companyId,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Submit expense error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
