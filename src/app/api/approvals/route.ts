import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"
import { approvalActionSchema } from "@/lib/validations"
import { initializeNotificationHandlers, notifyApprovalAction, notifyExpenseApproved, notifyExpenseRejected } from "@/lib/notifications"
import type { Prisma } from "@prisma/client"

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

    const approvalActionRecord = await prisma.approvalAction.findFirst({
      where: {
        expenseId,
        approverId: session.user.id,
        action: "PENDING",
      },
      include: { 
        expense: {
          include: { employee: { select: { id: true, name: true } } }
        }
      },
    })

    if (!approvalActionRecord) {
      return NextResponse.json(
        { error: "No pending approval found" },
        { status: 404 }
      )
    }

    const expense = approvalActionRecord.expense
    let isFullyApproved = false

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.approvalAction.update({
        where: { id: approvalActionRecord.id },
        data: {
          action,
          comment,
          actedAt: new Date(),
        },
      })

      if (action === "APPROVED") {
        const totalActions = await tx.approvalAction.count({
          where: { expenseId },
        })

        const approvedActions = await tx.approvalAction.count({
          where: {
            expenseId,
            action: { in: ["PENDING", "APPROVED"] },
          },
        })

        if (approvedActions === totalActions) {
          isFullyApproved = true
          await tx.expense.update({
            where: { id: expenseId },
            data: { status: "APPROVED" },
          })
        }
      } else if (action === "REJECTED") {
        await tx.expense.update({
          where: { id: expenseId },
          data: {
            status: "REJECTED",
            currentApprovalStep: approvalActionRecord.stepOrder,
          },
        })
      }
    })

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

    if (action === "APPROVED" && isFullyApproved) {
      await notifyExpenseApproved({
        expenseId,
        expenseDescription: expense.description,
        employeeId: expense.employeeId,
        employeeName: expense.employee.name,
        companyId: session.user.companyId,
      })
    } else if (action === "REJECTED") {
      await notifyExpenseRejected({
        expenseId,
        expenseDescription: expense.description,
        employeeId: expense.employeeId,
        employeeName: expense.employee.name,
        companyId: session.user.companyId,
        comment,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Approval action error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
