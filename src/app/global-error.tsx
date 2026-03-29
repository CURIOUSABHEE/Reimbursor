"use client"

import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Global error:", error)
  }, [error])

  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center p-8 max-w-lg">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
              <svg
                className="w-10 h-10 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              Application Error
            </h1>
            <p className="text-gray-600 mb-6">
              We encountered an unexpected error. This has been logged and we&apos;re working to fix it.
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={reset}
                className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors font-medium"
              >
                Try Again
              </button>
              <button
                onClick={() => (window.location.href = "/")}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium"
              >
                Go Home
              </button>
            </div>
            {process.env.NODE_ENV === "development" && (
              <div className="mt-8 text-left p-4 bg-gray-900 rounded-lg text-sm">
                <p className="text-red-400 font-mono break-all">
                  {error.message}
                </p>
                {error.stack && (
                  <pre className="mt-2 text-gray-400 text-xs overflow-auto max-h-40">
                    {error.stack}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      </body>
    </html>
  )
}
