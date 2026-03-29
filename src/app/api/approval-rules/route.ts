import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rules = await prisma.approvalRule.findMany({
    where: { companyId: session.user.companyId },
    include: {
      assignedUser: { select: { id: true, name: true } },
      manager: { select: { id: true, name: true } },
      approvers: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { stepOrder: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(rules)
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const {
    name, description, assignedUserId, managerId,
    isManagerApprover, approversSequence, minApprovalPercentage,
    approvers, // [{ userId, required, stepOrder }]
  } = body

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 })

  const rule = await prisma.approvalRule.create({
    data: {
      companyId: session.user.companyId,
      name,
      description: description || null,
      assignedUserId: assignedUserId || null,
      managerId: managerId || null,
      isManagerApprover: !!isManagerApprover,
      approversSequence: !!approversSequence,
      minApprovalPercentage: minApprovalPercentage ? Number(minApprovalPercentage) : null,
      approvers: {
        create: (approvers || []).map((a: { userId: string; required: boolean; stepOrder: number }) => ({
          userId: a.userId,
          required: !!a.required,
          stepOrder: a.stepOrder,
        })),
      },
    },
    include: {
      assignedUser: { select: { id: true, name: true } },
      manager: { select: { id: true, name: true } },
      approvers: { include: { user: { select: { id: true, name: true } } }, orderBy: { stepOrder: "asc" } },
    },
  })

  return NextResponse.json(rule, { status: 201 })
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 })

  await prisma.approvalRule.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
