type LogLevel = "debug" | "info" | "warn" | "error"

interface LogContext {
  userId?: string
  companyId?: string
  action?: string
  resource?: string
  resourceId?: string
  metadata?: Record<string, unknown>
}

class Logger {
  private context: LogContext = {}

  setContext(context: LogContext) {
    this.context = { ...this.context, ...context }
  }

  clearContext() {
    this.context = {}
  }

  private formatMessage(level: LogLevel, message: string, extra?: Record<string, unknown>) {
    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      level,
      message,
      ...this.context,
      ...extra,
    }
    return JSON.stringify(logEntry)
  }

  debug(message: string, extra?: Record<string, unknown>) {
    if (process.env.NODE_ENV === "development") {
      console.debug(this.formatMessage("debug", message, extra))
    }
  }

  info(message: string, extra?: Record<string, unknown>) {
    console.info(this.formatMessage("info", message, extra))
  }

  warn(message: string, extra?: Record<string, unknown>) {
    console.warn(this.formatMessage("warn", message, extra))
  }

  error(message: string, error?: Error, extra?: Record<string, unknown>) {
    const errorContext = error ? {
      errorName: error.name,
      errorMessage: error.message,
      stackTrace: error.stack,
    } : {}
    
    console.error(this.formatMessage("error", message, { ...errorContext, ...extra }))
  }

  auth(userId: string, action: "login" | "logout" | "signup" | "password_reset", success: boolean) {
    this.info(`Auth action: ${action}`, {
      userId,
      action,
      success,
      type: "authentication",
    })
  }

  expense(userId: string, companyId: string, action: "create" | "submit" | "approve" | "reject" | "delete", expenseId: string) {
    this.info(`Expense action: ${action}`, {
      userId,
      companyId,
      expenseId,
      action,
      type: "expense",
    })
  }

  api(method: string, path: string, statusCode: number, duration: number) {
    this.info(`API Request`, {
      method,
      path,
      statusCode,
      duration,
      type: "api",
    })
  }
}

export const logger = new Logger()
