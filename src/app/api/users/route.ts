import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { hash } from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"
import { sendWelcomeEmail } from "@/lib/email"
import { z } from "zod"

const createUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["EMPLOYEE", "MANAGER"]).default("EMPLOYEE"),
  managerId: z.string().optional(),
})

const updateUserSchema = z.object({
  role: z.enum(["EMPLOYEE", "MANAGER", "ADMIN"]).optional(),
  managerId: z.string().nullable().optional(),
})

function generatePassword(length = 12): string {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  const lower = "abcdefghijklmnopqrstuvwxyz"
  const digits = "0123456789"
  const all = upper + lower + digits
  let password =
    upper[Math.floor(Math.random() * upper.length)] +
    lower[Math.floor(Math.random() * lower.length)] +
    digits[Math.floor(Math.random() * digits.length)] +
    lower[Math.floor(Math.random() * lower.length)]
  for (let i = password.length; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)]
  }
  return password.split("").sort(() => Math.random() - 0.5).join("")
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const users = await prisma.user.findMany({
    where: { companyId: session.user.companyId },
    select: {
      id: true, name: true, email: true, role: true, createdAt: true,
      manager: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json(users)
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const parsed = createUserSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { name, email: rawEmail, role, managerId } = parsed.data
    const email = rawEmail.toLowerCase()

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 400 })
    }

    // Resolve companyId fresh — session can be stale
    const adminUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true },
    })
    const companyId = adminUser?.companyId ?? session.user.companyId
    if (!companyId) {
      return NextResponse.json({ error: "Could not resolve company" }, { status: 400 })
    }

    const plainPassword = generatePassword()
    const hashedPassword = await hash(plainPassword, 12)
    console.log(`[DEV] Created user ${email} with password: ${plainPassword}`)

    const user = await prisma.user.create({
      data: {
        name, email,
        password: hashedPassword,
        role,
        companyId,
        managerId: managerId || null,
      },
    })

    await sendWelcomeEmail(email, name, plainPassword)

    return NextResponse.json({ message: "User created and email sent", userId: user.id }, { status: 201 })
  } catch (error) {
    console.error("Create user error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get("id")
  if (!userId) return NextResponse.json({ error: "User ID required" }, { status: 400 })

  const body = await request.json()

  // Send password action
  if (body.action === "sendPassword") {
    const user = await prisma.user.findFirst({
      where: { id: userId, companyId: session.user.companyId },
    })
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

    const plainPassword = generatePassword()
    const hashedPassword = await hash(plainPassword, 12)
    console.log(`[DEV] Reset password for ${user.email}: ${plainPassword}`)

    await prisma.user.update({ where: { id: userId }, data: { password: hashedPassword } })
    await sendWelcomeEmail(user.email, user.name, plainPassword)

    return NextResponse.json({ message: "Password sent" })
  }

  const parsed = updateUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(parsed.data.role && { role: parsed.data.role }),
      ...(parsed.data.managerId !== undefined && { managerId: parsed.data.managerId }),
    },
    select: { id: true, name: true, email: true, role: true, manager: { select: { id: true, name: true } } },
  })

  return NextResponse.json(updated)
}
