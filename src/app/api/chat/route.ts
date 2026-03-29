import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"

// GET /api/chat?with=<userId>  — contacts list or conversation
export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const withUserId = searchParams.get("with")

  // Always resolve companyId fresh — session can be stale for new users
  const freshUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { companyId: true },
  })
  const companyId = freshUser?.companyId ?? session.user.companyId

  if (!withUserId) {
    const users = await prisma.user.findMany({
      where: { companyId, NOT: { id: session.user.id } },
      select: { id: true, name: true, role: true, email: true },
      orderBy: { name: "asc" },
    })
    return NextResponse.json(users)
  }

  try {
    await prisma.chatMessage.updateMany({
      where: { senderId: withUserId, receiverId: session.user.id, read: false },
      data: { read: true },
    })
  } catch {
    // non-critical — ignore
  }

  try {
    const messages = await prisma.chatMessage.findMany({
      where: {
        OR: [
          { senderId: session.user.id, receiverId: withUserId },
          { senderId: withUserId, receiverId: session.user.id },
        ],
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        message: true,
        senderId: true,
        receiverId: true,
        read: true,
        createdAt: true,
        sender: { select: { id: true, name: true } },
      },
    })
    return NextResponse.json(messages)
  } catch (err) {
    console.error("Chat GET error:", err)
    return NextResponse.json([], { status: 200 })
  }
}

// POST /api/chat — send a message
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await request.json()
    const { receiverId, message } = body

    if (!receiverId || !message?.trim()) {
      return NextResponse.json({ error: "receiverId and message are required" }, { status: 400 })
    }

    // Resolve sender's companyId fresh
    const freshSender = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true },
    })
    const companyId = freshSender?.companyId ?? session.user.companyId

    if (!companyId) {
      return NextResponse.json({ error: "Could not resolve company" }, { status: 400 })
    }

    const msg = await prisma.chatMessage.create({
      data: {
        companyId,
        senderId: session.user.id,
        receiverId,
        message: message.trim(),
      },
      select: {
        id: true,
        message: true,
        senderId: true,
        receiverId: true,
        read: true,
        createdAt: true,
        sender: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(msg, { status: 201 })
  } catch (err) {
    console.error("Chat POST error:", err)
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
  }
}
