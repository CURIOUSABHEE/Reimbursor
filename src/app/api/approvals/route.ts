import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"
import { approvalActionSchema } from "@/lib/validations"
import { initializeNotificationHandlers, notifyApprovalAction, notifyExpenseApproved, notifyExpenseRejected, notifyStepActivated } from "@/lib/notifications"
import { createWorkflowEngine } from "@/lib/workflow/engine"
import { ExpenseStatus } from "@prisma/client"

initializeNotificationHandlers()

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (session.user.role !== "MANAGER" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const pendingApprovals = await prisma.approvalAction.findMany({
    where: {
      approverId: session.user.id,
      action: "PENDING",
    },
    include: {
      expense: {
        include: {
          employee: { select: { id: true, name: true, email: true } },
          receipt: { select: { id: true, url: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  const company = await prisma.company.findUnique({
    where: { id: session.user.companyId },
    select: { currency: true },
  })

  return NextResponse.json({
    approvals: pendingApprovals,
    companyCurrency: company?.currency || "USD",
  })
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    
    const parsed = approvalActionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { expenseId, action, comment } = parsed.data

    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: {
        employee: { select: { id: true, name: true, managerId: true } },
      },
    })

    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 })
    }

    const workflowEngine = await createWorkflowEngine(expenseId, session.user.companyId)

    const result = await workflowEngine.handleApprovalAction(
      session.user.id,
      action,
      comment
    )

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    await notifyApprovalAction({
      expenseId,
      expenseDescription: expense.description,
      employeeId: expense.employeeId,
      employeeName: expense.employee.name,
      companyId: session.user.companyId,
      approverId: session.user.id,
      action,
      comment,
    })

    if (result.expenseComplete) {
      if (result.newStatus === ExpenseStatus.APPROVED) {
        await notifyExpenseApproved({
          expenseId,
          expenseDescription: expense.description,
          employeeId: expense.employeeId,
          employeeName: expense.employee.name,
          companyId: session.user.companyId,
        })
      } else if (result.newStatus === ExpenseStatus.REJECTED) {
        await notifyExpenseRejected({
          expenseId,
          expenseDescription: expense.description,
          employeeId: expense.employeeId,
          employeeName: expense.employee.name,
          companyId: session.user.companyId,
          comment,
        })
      }
    } else if (result.stepComplete && !result.expenseComplete) {
      const updatedExpense = await prisma.expense.findUnique({
        where: { id: expenseId },
        select: { 
          id: true,
          currentWorkflowStep: true 
        },
      })

      if (updatedExpense && updatedExpense.currentWorkflowStep >= 0) {
        const nextApprovers = await prisma.approvalAction.findMany({
          where: {
            expenseId,
            stepOrder: updatedExpense.currentWorkflowStep,
            action: "PENDING",
          },
          include: { approver: true },
        })

        for (const approver of nextApprovers) {
          await notifyStepActivated({
            expenseId,
            expenseDescription: expense.description,
            employeeId: expense.employeeId,
            employeeName: expense.employee.name,
            approverId: approver.approverId,
            approverName: approver.approver.name,
            stepNumber: updatedExpense.currentWorkflowStep + 1,
            companyId: session.user.companyId,
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      stepComplete: result.stepComplete,
      expenseComplete: result.expenseComplete,
      newStatus: result.newStatus,
    })
  } catch (error) {
    console.error("Approval action error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
