const isProduction = process.env.NODE_ENV === "production"

export const logger = {
  debug(message: string, meta?: Record<string, unknown>): void {
    if (!isProduction) {
      console.debug(`[DEBUG] ${message}`, meta || "")
    }
  },

  info(message: string, meta?: Record<string, unknown>): void {
    console.info(`[INFO] ${message}`, meta || "")
  },

  warn(message: string, meta?: Record<string, unknown>): void {
    console.warn(`[WARN] ${message}`, meta || "")
  },

  error(message: string, meta?: Record<string, unknown>): void {
    console.error(`[ERROR] ${message}`, meta || "")
  },

  time<T>(label: string, fn: () => Promise<T> | T): Promise<T> {
    const start = Date.now()
    return Promise.resolve(fn()).then(
      (result) => {
        const duration = Date.now() - start
        if (duration > 200) {
          logger.warn(`Slow operation: ${label}`, { durationMs: duration })
        }
        return result
      },
      (error) => {
        const duration = Date.now() - start
        logger.error(`${label} failed`, { durationMs: duration, error: String(error) })
        throw error
      }
    )
  },
}
