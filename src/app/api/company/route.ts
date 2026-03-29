import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const company = await prisma.company.findUnique({
    where: { id: session.user.companyId },
  })

  return NextResponse.json(company)
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { name, currency } = body

    if (!name || name.trim().length < 2) {
      return NextResponse.json(
        { error: "Company name must be at least 2 characters" },
        { status: 400 }
      )
    }

    const company = await prisma.company.update({
      where: { id: session.user.companyId },
      data: {
        name: name.trim(),
        ...(currency && { currency }),
      },
    })

    return NextResponse.json(company)
  } catch (error) {
    console.error("Update company error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
