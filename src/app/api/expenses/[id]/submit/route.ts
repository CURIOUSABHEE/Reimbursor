import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const expenseId = params.id

    // Resolve fresh companyId
    const freshUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true },
    })
    const companyId = freshUser?.companyId ?? session.user.companyId

    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
    })

    if (!expense) return NextResponse.json({ error: "Expense not found" }, { status: 404 })
    if (expense.employeeId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    if (expense.status !== "DRAFT") {
      return NextResponse.json({ error: "Only draft expenses can be submitted" }, { status: 400 })
    }

    // Find applicable approval rules for this company
    // Rules are matched by assignedUserId (specific to this employee) or company-wide (no assignedUser)
    const rules = await prisma.approvalRule.findMany({
      where: {
        companyId,
        OR: [
          { assignedUserId: session.user.id },
          { assignedUserId: null },
        ],
      },
      include: {
        approvers: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { stepOrder: "asc" },
        },
        manager: { select: { id: true } },
      },
      orderBy: { createdAt: "asc" },
    })

    await prisma.$transaction(async (tx) => {
      let stepCounter = 1

      for (const rule of rules) {
        const approverIds: string[] = []

        // If manager is an approver, add them first
        if (rule.isManagerApprover && rule.managerId) {
          approverIds.push(rule.managerId)
        }

        // Add rule approvers
        for (const ra of rule.approvers) {
          if (!approverIds.includes(ra.userId)) {
            approverIds.push(ra.userId)
          }
        }

        for (const approverId of approverIds) {
          await tx.approvalAction.create({
            data: {
              expenseId,
              ruleId: rule.id,
              approverId,
              action: "PENDING",
              stepOrder: stepCounter++,
            },
          })

          await tx.notification.create({
            data: {
              userId: approverId,
              expenseId,
              message: `New expense "${expense.description}" requires your approval.`,
            },
          })
        }
      }

      // If no rules found, auto-approve or just mark pending for admin review
      await tx.expense.update({
        where: { id: expenseId },
        data: { status: "PENDING" },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Submit expense error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
