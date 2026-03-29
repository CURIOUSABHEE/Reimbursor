import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || "",
  
  environment: process.env.NODE_ENV,
  
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  
  replaysOnErrorSampleRate: 1.0,
  
  allowUrls: [
    process.env.NEXT_PUBLIC_APP_URL,
  ].filter(Boolean) as string[],
  
  denyUrls: [
    "/_next/static/",
    "/_next/image/",
    "/favicon.ico",
    "/vercel.svg",
  ],
  
  initialScope: {
    tags: {
      "application": "reimbursor",
    },
  },
  
  beforeSend(event) {
    if (process.env.NODE_ENV === "development") {
      console.log("Sentry event:", JSON.stringify(event, null, 2))
      return null
    }
    return event
  },
})


