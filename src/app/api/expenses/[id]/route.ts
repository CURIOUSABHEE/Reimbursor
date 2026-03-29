import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"
import { ExpenseStatus } from "@prisma/client"

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const expense = await prisma.expense.findFirst({
    where: { id: params.id, companyId: session.user.companyId },
    include: {
      employee: { select: { id: true, name: true, email: true, managerId: true } },
      approvalActions: {
        include: { approver: { select: { id: true, name: true } } },
        orderBy: { stepOrder: "asc" },
      },
      receipt: true,
      adminOverrideBy: { select: { id: true, name: true } },
    },
  })

  if (!expense) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 })
  }

  const canAccess =
    session.user.role === "ADMIN" ||
    expense.employeeId === session.user.id ||
    (session.user.role === "MANAGER" && expense.employee.managerId === session.user.id)

  if (!canAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  return NextResponse.json(expense)
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { status } = body

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (!Object.values(ExpenseStatus).includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 })
  }

  const expense = await prisma.expense.findFirst({
    where: {
      id: params.id,
      companyId: session.user.companyId,
    },
  })

  if (!expense) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 })
  }

  const updated = await prisma.expense.update({
    where: { id: params.id },
    data: { status: status as ExpenseStatus },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const expense = await prisma.expense.findFirst({
    where: {
      id: params.id,
      companyId: session.user.companyId,
    },
  })

  if (!expense) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 })
  }

  if (expense.employeeId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await prisma.expense.delete({
    where: { id: params.id },
  })

  return NextResponse.json({ success: true })
}
