import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const table = searchParams.get("table") || "users"
  const companyId = session.user.companyId

  switch (table) {
    case "users":
      return NextResponse.json(
        await prisma.user.findMany({
          where: { companyId },
          select: { id: true, name: true, email: true, role: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        })
      )
    case "expenses":
      return NextResponse.json(
        await prisma.expense.findMany({
          where: { companyId },
          select: {
            id: true, description: true, category: true,
            submittedAmount: true, submittedCurrency: true,
            convertedAmount: true, status: true, createdAt: true,
            employee: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
        })
      )
    case "approvalRules":
      return NextResponse.json(
        await prisma.approvalRule.findMany({
          where: { companyId },
          orderBy: { createdAt: "asc" },
        })
      )
    case "notifications":
      return NextResponse.json(
        await prisma.notification.findMany({
          where: { user: { companyId } },
          include: { user: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
          take: 100,
        })
      )
    case "chatMessages":
      return NextResponse.json(
        await prisma.chatMessage.findMany({
          where: { companyId },
          include: {
            sender: { select: { name: true } },
            receiver: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 100,
        })
      )
    default:
      return NextResponse.json({ error: "Unknown table" }, { status: 400 })
  }
}
