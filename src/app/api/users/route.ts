import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { hash } from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"

const createUserSchema = {
  name: { minLength: 2, maxLength: 100 },
  email: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  password: { minLength: 6 },
  role: { enum: ["EMPLOYEE", "MANAGER"] },
}

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const users = await prisma.user.findMany({
    where: { companyId: session.user.companyId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      managerId: true,
      manager: {
        select: { id: true, name: true }
      },
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(users)
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { name, email, password, role, managerId } = body

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      )
    }

    if (name.length < createUserSchema.name.minLength || name.length > createUserSchema.name.maxLength) {
      return NextResponse.json(
        { error: "Name must be between 2 and 100 characters" },
        { status: 400 }
      )
    }

    if (!createUserSchema.email.pattern.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      )
    }

    if (password.length < createUserSchema.password.minLength) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      )
    }

    const validRoles = ["EMPLOYEE", "MANAGER"]
    if (role && !validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Role must be EMPLOYEE or MANAGER" },
        { status: 400 }
      )
    }

    const existingUser = await prisma.user.findFirst({
      where: { email, companyId: session.user.companyId },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists in your company" },
        { status: 400 }
      )
    }

    if (managerId) {
      const manager = await prisma.user.findFirst({
        where: { id: managerId, companyId: session.user.companyId, role: "MANAGER" },
      })

      if (!manager) {
        return NextResponse.json(
          { error: "Invalid manager" },
          { status: 400 }
        )
      }
    }

    const hashedPassword = await hash(password, 12)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || "EMPLOYEE",
        companyId: session.user.companyId,
        managerId: managerId || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        managerId: true,
        createdAt: true,
      },
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error("Create user error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
