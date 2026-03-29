import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { randomUUID } from "crypto"

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const expense = await prisma.expense.findFirst({
    where: { id: params.id, companyId: session.user.companyId },
  })

  if (!expense) return NextResponse.json({ error: "Expense not found" }, { status: 404 })
  if (expense.employeeId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 })

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 })
    }

    const ext      = file.name.split(".").pop() ?? "jpg"
    const filename = `${randomUUID()}.${ext}`
    const uploadDir = join(process.cwd(), "public", "uploads", "receipts")

    await mkdir(uploadDir, { recursive: true })
    const bytes = await file.arrayBuffer()
    await writeFile(join(uploadDir, filename), Buffer.from(bytes))

    const url = `/uploads/receipts/${filename}`

    // Upsert receipt record
    const receipt = await prisma.receipt.upsert({
      where:  { expenseId: params.id },
      update: { url, filename: file.name, mimeType: file.type, size: file.size },
      create: { expenseId: params.id, url, filename: file.name, mimeType: file.type, size: file.size },
    })

    return NextResponse.json(receipt, { status: 201 })
  } catch (error) {
    console.error("Receipt upload error:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const receipt = await prisma.receipt.findUnique({
    where: { expenseId: params.id },
  })

  if (!receipt) return NextResponse.json(null)
  return NextResponse.json(receipt)
}
