import { NextResponse } from "next/server"
import { randomBytes } from "crypto"
import { prisma } from "@/lib/prisma"
import { passwordResetRequestSchema } from "@/lib/validations"
import { sendPasswordResetEmail } from "@/lib/email"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    const parsed = passwordResetRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const email = parsed.data.email.toLowerCase()

    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return NextResponse.json(
        { message: "If an account exists with this email, a reset link has been sent." },
        { status: 200 }
      )
    }

    const token = randomBytes(32).toString("hex")
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

    await prisma.sendPasswordToken.deleteMany({
      where: { userId: user.id },
    })

    await prisma.sendPasswordToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    })

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
    
    await sendPasswordResetEmail(email, token, baseUrl)

    return NextResponse.json({
      message: "If an account exists with this email, a reset link has been sent.",
    })
  } catch (error) {
    console.error("Password reset request error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
