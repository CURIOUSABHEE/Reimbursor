import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"
import { initializeNotificationHandlers, notifyExpenseSubmitted, notifyStepActivated } from "@/lib/notifications"
import { createWorkflowEngine } from "@/lib/workflow/engine"
import { ExpenseStatus } from "@prisma/client"

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

    if (expense.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (expense.employeeId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (expense.status !== ExpenseStatus.REJECTED) {
      return NextResponse.json(
        { error: "Only rejected expenses can be resubmitted" },
        { status: 400 }
      )
    }

    await prisma.$transaction(async (tx) => {
      await tx.approvalAction.deleteMany({
        where: { expenseId },
      })

      await tx.expense.update({
        where: { id: expenseId },
        data: {
          status: ExpenseStatus.DRAFT,
          currentWorkflowStep: 0,
          isAdminOverride: false,
          adminOverrideById: null,
          adminOverrideAt: null,
          adminOverrideComment: null,
        },
      })
    })

    const workflowEngine = await createWorkflowEngine(expenseId, session.user.companyId)
    const result = await workflowEngine.createApprovalWorkflow()

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    await notifyExpenseSubmitted({
      expenseId,
      expenseDescription: expense.description,
      employeeId: expense.employeeId,
      employeeName: expense.employee.name,
      companyId: session.user.companyId,
    })

    if (result.notifications && result.notifications.length > 0) {
      for (const notification of result.notifications) {
        const approver = await prisma.user.findUnique({
          where: { id: notification.approverId },
        })
        
        if (approver) {
          await notifyStepActivated({
            expenseId,
            expenseDescription: expense.description,
            employeeId: expense.employeeId,
            employeeName: expense.employee.name,
            approverId: notification.approverId,
            approverName: approver.name,
            stepNumber: 1,
            companyId: session.user.companyId,
          })
        }
      }
    }

    return NextResponse.json({ 
      success: true,
      workflowId: result.workflowId,
      newStatus: ExpenseStatus.PENDING
    })
  } catch (error) {
    console.error("Resubmit expense error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
