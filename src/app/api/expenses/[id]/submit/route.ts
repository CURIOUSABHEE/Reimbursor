import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"
import { initializeNotificationHandlers, notifyExpenseSubmitted } from "@/lib/notifications"
import { createWorkflowEngine } from "@/lib/workflow/engine"

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

    if (expense.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Only draft expenses can be submitted" },
        { status: 400 }
      )
    }

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

    const pendingApprovers = await prisma.approvalAction.findMany({
      where: {
        expenseId,
        action: "PENDING",
      },
      include: { approver: true },
    })

    for (const approver of pendingApprovers) {
      await prisma.notification.create({
        data: {
          userId: approver.approverId,
          expenseId,
          type: "APPROVAL_REQUIRED",
          title: "Approval Required",
          message: `${expense.employee.name} submitted expense: "${expense.description}" for your approval.`,
          idempotencyKey: `approval_required:${expenseId}:${approver.approverId}`,
        },
      })
    }

    return NextResponse.json({ 
      success: true,
      workflowId: result.workflowId
    })
  } catch (error) {
    console.error("Submit expense error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
