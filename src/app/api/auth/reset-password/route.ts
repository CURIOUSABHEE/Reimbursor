import { NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { passwordResetSchema } from "@/lib/validations"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    const parsed = passwordResetSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { token, password } = parsed.data

    const tokenRecord = await prisma.sendPasswordToken.findUnique({
      where: { token },
      include: { user: true },
    })

    if (!tokenRecord) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 400 }
      )
    }

    if (tokenRecord.expiresAt < new Date()) {
      await prisma.sendPasswordToken.delete({
        where: { id: tokenRecord.id },
      })
      return NextResponse.json(
        { error: "Token has expired" },
        { status: 400 }
      )
    }

    if (tokenRecord.usedAt) {
      return NextResponse.json(
        { error: "Token has already been used" },
        { status: 400 }
      )
    }

    const hashedPassword = await hash(password, 12)

    await prisma.$transaction([
      prisma.user.update({
        where: { id: tokenRecord.userId },
        data: { password: hashedPassword },
      }),
      prisma.sendPasswordToken.update({
        where: { id: tokenRecord.id },
        data: { usedAt: new Date() },
      }),
    ])

    return NextResponse.json({
      message: "Password has been reset successfully",
    })
  } catch (error) {
    console.error("Password reset error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
