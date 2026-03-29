export type EventType =
  | "EXPENSE_SUBMITTED"
  | "APPROVAL_REQUIRED"
  | "APPROVAL_ACTION"
  | "EXPENSE_APPROVED"
  | "EXPENSE_REJECTED"
  | "STEP_ACTIVATED"
  | "STEP_COMPLETED"

export interface EventData {
  expenseId: string
  expenseDescription: string
  employeeId: string
  employeeName: string
  companyId: string
  approverId?: string
  approverName?: string
  approverIds?: string[]
  action?: "APPROVED" | "REJECTED"
  comment?: string
  stepNumber?: number
  metadata?: Record<string, unknown>
}

export type EventHandler = (data: EventData) => Promise<void>

const handlers: Map<EventType, EventHandler[]> = new Map()

export function registerHandler(event: EventType, handler: EventHandler): void {
  const existing = handlers.get(event) || []
  handlers.set(event, [...existing, handler])
}

export async function emitEvent(event: EventType, data: EventData): Promise<void> {
  const eventHandlers = handlers.get(event) || []
  await Promise.all(eventHandlers.map(handler => handler(data)))
}

export function createIdempotencyKey(
  event: EventType,
  data: EventData
): string {
  const parts = [event, data.expenseId]
  if (data.approverId) parts.push(data.approverId)
  if (data.action) parts.push(data.action)
  if (data.stepNumber) parts.push(String(data.stepNumber))
  return parts.join(":")
}
