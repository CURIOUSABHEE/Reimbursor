import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"
import { ExpenseStatus, ActionStatus, NotificationType } from "@prisma/client"
import { z } from "zod"

const bulkActionSchema = z.object({
  expenseIds: z.array(z.string()).min(1, "At least one expense required"),
  action: z.enum(["APPROVE", "REJECT"]),
  comment: z.string().max(1000).optional(),
})

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden — only admins can perform bulk actions" }, { status: 403 })
  }

  try {
    const body = await request.json()
    
    const parsed = bulkActionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { expenseIds, action, comment } = parsed.data
    const newStatus = action === "APPROVE" ? ExpenseStatus.APPROVED : ExpenseStatus.REJECTED

    const expenses = await prisma.expense.findMany({
      where: {
        id: { in: expenseIds },
        companyId: session.user.companyId,
        status: ExpenseStatus.PENDING,
      },
      include: {
        employee: true,
        approvalActions: {
          where: { action: ActionStatus.PENDING },
        },
      },
    })

    if (expenses.length === 0) {
      return NextResponse.json(
        { error: "No pending expenses found for the provided IDs" },
        { status: 400 }
      )
    }

    await prisma.$transaction(
      async (tx) => {
        for (const expense of expenses) {
          await tx.expense.update({
            where: { id: expense.id },
            data: {
              status: newStatus,
              isAdminOverride: true,
              adminOverrideById: session.user.id,
              adminOverrideAt: new Date(),
              adminOverrideComment: comment || null,
              currentWorkflowStep: -1,
            },
          })
        }
      }
    )

    await prisma.approvalAction.updateMany({
      where: {
        expenseId: { in: expenses.map((e) => e.id) },
        action: ActionStatus.PENDING,
      },
      data: {
        action: action === "APPROVE" ? ActionStatus.APPROVED : ActionStatus.REJECTED,
        comment: `Bulk ${action === "APPROVE" ? "approved" : "rejected"} by admin${comment ? ": " + comment : ""}`,
        actedAt: new Date(),
      },
    })

    const notificationType = action === "APPROVE" ? NotificationType.EXPENSE_APPROVED : NotificationType.EXPENSE_REJECTED
    const notificationTitle = action === "APPROVE" ? "Expense Approved" : "Expense Rejected"

    for (const expense of expenses) {
      await prisma.notification.create({
        data: {
          userId: expense.employeeId,
          expenseId: expense.id,
          type: notificationType,
          title: notificationTitle,
          message: `Your expense "${expense.description}" was ${action === "APPROVE" ? "approved" : "rejected"} by admin.${comment ? ` Comment: ${comment}` : ""}`,
        },
      })

      for (const pendingAction of expense.approvalActions) {
        await prisma.notification.create({
          data: {
            userId: pendingAction.approverId,
            expenseId: expense.id,
            type: NotificationType.INFO,
            title: "Approval Override",
            message: `The expense "${expense.description}" submitted by ${expense.employee.name} was ${action === "APPROVE" ? "approved" : "rejected"} by an admin. Your approval action is no longer required.`,
          },
        })
      }
    }

    return NextResponse.json({
      success: true,
      processed: expenses.length,
      action,
      newStatus,
    })
  } catch (error) {
    console.error("Bulk action error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
