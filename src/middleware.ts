import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    const isAuthPage = path.startsWith("/login") || 
                       path.startsWith("/signup") ||
                       path.startsWith("/forgot-password") ||
                       path.startsWith("/reset-password")

    if (!token && !isAuthPage) {
      const loginUrl = new URL("/login", req.url)
      loginUrl.searchParams.set("callbackUrl", req.url)
      return NextResponse.redirect(loginUrl)
    }

    if (token && isAuthPage) {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }

    if (token && path.startsWith("/admin") && token.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }

    if (token && path.startsWith("/approvals") && 
        token.role !== "MANAGER" && token.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname
        const isAuthPage = path.startsWith("/login") || 
                           path.startsWith("/signup") ||
                           path.startsWith("/forgot-password") ||
                           path.startsWith("/reset-password") ||
                           path === "/" ||
                           path === "/api/auth"
        if (isAuthPage) return true
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
