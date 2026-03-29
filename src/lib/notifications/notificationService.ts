import { prisma } from "@/lib/prisma"
import { Prisma, NotificationType } from "@prisma/client"
import { EventData, emitEvent, registerHandler, createIdempotencyKey } from "./eventDispatcher"



interface CreateNotificationParams {
  userId: string
  type: NotificationType
  title: string
  message: string
  expenseId?: string
  idempotencyKey?: string
  metadata?: Record<string, unknown>
}

let handlersInitialized = false

export async function createNotification(
  params: CreateNotificationParams
): Promise<string | null> {
  const { userId, type, title, message, expenseId, idempotencyKey, metadata } = params

  if (idempotencyKey) {
    const existing = await prisma.notification.findUnique({
      where: { idempotencyKey },
    })
    if (existing) {
      return null
    }
  }

  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      expenseId,
      idempotencyKey,
      metadata: metadata as Prisma.InputJsonValue | undefined,
    },
  })

  return notification.id
}

async function handleExpenseSubmitted(data: EventData): Promise<void> {
  const approvers = await prisma.user.findMany({
    where: {
      companyId: data.companyId,
      role: { in: ["MANAGER", "ADMIN"] },
    },
    select: { id: true },
  })

  await Promise.all(
    approvers.map(async (approver: { id: string }) => {
      const key = createIdempotencyKey("EXPENSE_SUBMITTED", {
        ...data,
        approverId: approver.id,
      })
      
      await createNotification({
        userId: approver.id,
        type: NotificationType.EXPENSE_SUBMITTED,
        title: "New Expense Submitted",
        message: `${data.employeeName} submitted expense: "${data.expenseDescription}"`,
        expenseId: data.expenseId,
        idempotencyKey: key,
        metadata: {
          employeeName: data.employeeName,
          expenseDescription: data.expenseDescription,
          submittedBy: data.employeeId,
        },
      })
    })
  )
}

async function handleApprovalAction(data: EventData): Promise<void> {
  if (!data.approverId || !data.action) return

  const key = createIdempotencyKey("APPROVAL_ACTION", data)
  
  await createNotification({
    userId: data.employeeId,
    type: NotificationType.APPROVAL_ACTION,
    title: `Expense ${data.action === "APPROVED" ? "Approved" : "Rejected"}`,
    message: `Your expense "${data.expenseDescription}" was ${data.action === "APPROVED" ? "approved" : "rejected"}.${data.comment ? ` Comment: ${data.comment}` : ""}`,
    expenseId: data.expenseId,
    idempotencyKey: key,
    metadata: {
      action: data.action,
      comment: data.comment,
      approverId: data.approverId,
    },
  })
}

async function handleExpenseApproved(data: EventData): Promise<void> {
  const key = createIdempotencyKey("EXPENSE_APPROVED", data)
  
  await createNotification({
    userId: data.employeeId,
    type: NotificationType.EXPENSE_APPROVED,
    title: "Expense Approved",
    message: `Your expense "${data.expenseDescription}" has been fully approved!`,
    expenseId: data.expenseId,
    idempotencyKey: key,
    metadata: {
      expenseDescription: data.expenseDescription,
    },
  })
}

async function handleExpenseRejected(data: EventData): Promise<void> {
  const key = createIdempotencyKey("EXPENSE_REJECTED", data)
  
  await createNotification({
    userId: data.employeeId,
    type: NotificationType.EXPENSE_REJECTED,
    title: "Expense Rejected",
    message: `Your expense "${data.expenseDescription}" was rejected.${data.comment ? ` Reason: ${data.comment}` : ""}`,
    expenseId: data.expenseId,
    idempotencyKey: key,
    metadata: {
      expenseDescription: data.expenseDescription,
      comment: data.comment,
    },
  })
}

async function handleStepActivated(data: EventData): Promise<void> {
  const key = createIdempotencyKey("STEP_ACTIVATED", data)
  
  await createNotification({
    userId: data.approverId as string,
    type: NotificationType.STEP_ACTIVATED,
    title: "Approval Required",
    message: `A new expense "${data.expenseDescription}" requires your approval (Step ${data.stepNumber}).`,
    expenseId: data.expenseId,
    idempotencyKey: key,
    metadata: {
      expenseDescription: data.expenseDescription,
      stepNumber: data.stepNumber,
    },
  })
}

export function initializeNotificationHandlers(): void {
  if (handlersInitialized) return
  
  registerHandler("EXPENSE_SUBMITTED", handleExpenseSubmitted)
  registerHandler("APPROVAL_ACTION", handleApprovalAction)
  registerHandler("EXPENSE_APPROVED", handleExpenseApproved)
  registerHandler("EXPENSE_REJECTED", handleExpenseRejected)
  registerHandler("STEP_ACTIVATED", handleStepActivated)
  
  handlersInitialized = true
}

export async function notifyExpenseSubmitted(data: EventData): Promise<void> {
  initializeNotificationHandlers()
  await emitEvent("EXPENSE_SUBMITTED", data)
}

export async function notifyApprovalAction(
  data: EventData & { approverId: string; action: "APPROVED" | "REJECTED"; comment?: string }
): Promise<void> {
  initializeNotificationHandlers()
  await emitEvent("APPROVAL_ACTION", data)
}

export async function notifyExpenseApproved(data: EventData): Promise<void> {
  initializeNotificationHandlers()
  await emitEvent("EXPENSE_APPROVED", data)
}

export async function notifyExpenseRejected(
  data: EventData & { comment?: string }
): Promise<void> {
  initializeNotificationHandlers()
  await emitEvent("EXPENSE_REJECTED", data)
}

export async function notifyStepActivated(
  data: EventData & { approverId: string; approverName: string; stepNumber: number }
): Promise<void> {
  initializeNotificationHandlers()
  await emitEvent("STEP_ACTIVATED", data)
}
