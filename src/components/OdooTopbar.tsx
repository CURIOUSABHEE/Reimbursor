"use client"

import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { NotificationBell } from "@/components/Notifications"
import { LogOut, ChevronDown, User } from "lucide-react"
import { useState, useRef, useEffect } from "react"

/* Module-level nav items shown in topbar */
const MODULES = [
  { href: "/dashboard",      label: "Dashboard" },
  { href: "/expenses",       label: "Expenses" },
  { href: "/approvals",      label: "Approvals",  roles: ["MANAGER", "ADMIN"] },
  { href: "/admin/expenses", label: "All Expenses", roles: ["ADMIN"] },
]

export function OdooTopbar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [profileOpen, setProfileOpen] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const visibleModules = MODULES.filter((m) => {
    if (!m.roles) return true
    return session?.user?.role && m.roles.includes(session.user.role)
  })

  return (
    <header className="o-topbar shrink-0">
      {/* Logo */}
      <Link
        href="/dashboard"
        className="flex items-center gap-2 px-4 h-full border-r shrink-0"
        style={{ borderColor: "hsl(var(--topbar-border))" }}
      >
        <div className="w-6 h-6 rounded bg-blue-500 flex items-center justify-center">
          <span className="text-white text-[10px] font-bold">R</span>
        </div>
        <span className="text-white font-semibold text-[13px] hidden sm:block">Reimbursor</span>
      </Link>

      {/* Module tabs */}
      <nav className="flex items-center h-full flex-1 px-2 overflow-x-auto">
        {visibleModules.map((m) => {
          const isActive = pathname === m.href || pathname.startsWith(m.href + "/")
          return (
            <Link
              key={m.href}
              href={m.href}
              className="flex items-center h-full px-3 text-[12px] font-medium whitespace-nowrap transition-colors relative"
              style={{
                color: isActive ? "#fff" : "hsl(var(--topbar-fg))",
                borderBottom: isActive ? "2px solid #60a5fa" : "2px solid transparent",
              }}
            >
              {m.label}
            </Link>
          )
        })}
      </nav>

      {/* Right side */}
      <div className="flex items-center gap-1 px-3 h-full shrink-0">
        {session && <NotificationBell />}

        {session ? (
          <div className="relative" ref={dropRef}>
            <button
              onClick={() => setProfileOpen((o) => !o)}
              className="flex items-center gap-1.5 px-2 h-8 rounded text-[12px] font-medium transition-colors"
              style={{ color: "hsl(var(--topbar-fg))" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "hsl(var(--sidebar-item-hover))")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "")}
            >
              <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-300 text-[10px] font-bold">
                {session.user.name?.[0] ?? "U"}
              </div>
              <span className="hidden sm:block">{session.user.name?.split(" ")[0]}</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {profileOpen && (
              <div
                className="absolute right-0 top-full mt-1 w-52 rounded-md border py-1 z-50"
                style={{ background: "#fff", borderColor: "#dcdcdc", boxShadow: "0 4px 16px rgb(0 0 0 / 0.12)" }}
              >
                <div className="px-3 py-2 border-b" style={{ borderColor: "#ebebeb" }}>
                  <p className="text-[13px] font-semibold text-gray-900">{session.user.name}</p>
                  <p className="text-[11px] text-gray-500">{session.user.email}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-semibold capitalize">
                    {session.user.role.toLowerCase()}
                  </span>
                </div>
                <Link
                  href="/notifications"
                  className="flex items-center gap-2 px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50"
                  onClick={() => setProfileOpen(false)}
                >
                  <User className="w-3.5 h-3.5" /> Profile
                </Link>
                <button
                  onClick={() => signOut()}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-red-600 hover:bg-red-50"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign out
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/login" className="o-toolbar-btn text-[12px]" style={{ color: "hsl(var(--topbar-fg))", border: "none", background: "transparent" }}>
              Sign in
            </Link>
            <Link href="/signup" className="o-toolbar-btn o-toolbar-btn-primary text-[12px]">
              Get started
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
