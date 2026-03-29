interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

const WINDOW_MS = 60 * 1000
const MAX_REQUESTS = 100

function cleanup() {
  const now = Date.now()
  const keysToDelete: string[] = []
  rateLimitStore.forEach((entry, key) => {
    if (entry.resetTime < now) {
      keysToDelete.push(key)
    }
  })
  keysToDelete.forEach(key => rateLimitStore.delete(key))
}

setInterval(cleanup, WINDOW_MS)

export function rateLimit(identifier: string): { success: boolean; remaining: number; reset: number } {
  const now = Date.now()
  const key = identifier
  
  let entry = rateLimitStore.get(key)
  
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 0,
      resetTime: now + WINDOW_MS,
    }
    rateLimitStore.set(key, entry)
  }
  
  entry.count++
  
  if (entry.count > MAX_REQUESTS) {
    return {
      success: false,
      remaining: 0,
      reset: entry.resetTime,
    }
  }
  
  return {
    success: true,
    remaining: MAX_REQUESTS - entry.count,
    reset: entry.resetTime,
  }
}

export function getClientIP(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  const real = request.headers.get("x-real-ip")
  
  if (forwarded) {
    return forwarded.split(",")[0].trim()
  }
  
  if (real) {
    return real
  }
  
  return "unknown"
}

export function withRateLimit(
  handler: (request: Request) => Promise<Response>,
  options: { max?: number; window?: number } = {}
) {
  const max = options.max || MAX_REQUESTS
  const windowMs = options.window || WINDOW_MS
  
  return async (request: Request): Promise<Response> => {
    const ip = getClientIP(request)
    const now = Date.now()
    
    const key = `rate:${ip}`
    let entry = rateLimitStore.get(key)
    
    if (!entry || entry.resetTime < now) {
      entry = {
        count: 0,
        resetTime: now + windowMs,
      }
      rateLimitStore.set(key, entry)
    }
    
    entry.count++
    
    if (entry.count > max) {
      return new Response(
        JSON.stringify({
          error: "Too many requests",
          retryAfter: Math.ceil((entry.resetTime - now) / 1000),
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Limit": String(max),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(entry.resetTime),
            "Retry-After": String(Math.ceil((entry.resetTime - now) / 1000)),
          },
        }
      )
    }
    
    const response = await handler(request)
    
    response.headers.set("X-RateLimit-Limit", String(max))
    response.headers.set("X-RateLimit-Remaining", String(max - entry.count))
    response.headers.set("X-RateLimit-Reset", String(entry.resetTime))
    
    return response
  }
}
