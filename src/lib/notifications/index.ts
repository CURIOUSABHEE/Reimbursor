export {
  initializeNotificationHandlers,
  createNotification,
  notifyExpenseSubmitted,
  notifyApprovalAction,
  notifyExpenseApproved,
  notifyExpenseRejected,
} from "./notificationService"

export {
  emitEvent,
  registerHandler,
  createIdempotencyKey,
} from "./eventDispatcher"

export type { EventType, EventData } from "./eventDispatcher"
