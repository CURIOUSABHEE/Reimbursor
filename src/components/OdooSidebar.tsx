"use client"

import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import Link from "next/link"
import {
  LayoutDashboard, Receipt, CheckSquare, Settings,
  FileText, Users, Workflow, ChevronRight, Bell, LogOut,
} from "lucide-react"

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  roles?: string[]
  section?: string
}

interface Session {
  user: { name?: string | null; email?: string | null; role?: string }
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard",            label: "Dashboard",      icon: LayoutDashboard },
  { href: "/expenses",             label: "Expenses",       icon: Receipt },
  { href: "/approvals",            label: "Approvals",      icon: CheckSquare, roles: ["MANAGER", "ADMIN"] },
  { href: "/admin/expenses",       label: "All Expenses",   icon: FileText,    roles: ["ADMIN"], section: "Admin" },
  { href: "/admin/users",          label: "Users",          icon: Users,       roles: ["ADMIN"], section: "Admin" },
  { href: "/admin/workflow",       label: "Workflow",       icon: Workflow,    roles: ["ADMIN"], section: "Admin" },
  { href: "/admin/approval-rules", label: "Approval Rules", icon: CheckSquare, roles: ["ADMIN"], section: "Admin" },
  { href: "/admin/settings",       label: "Settings",       icon: Settings,    roles: ["ADMIN"], section: "Admin" },
]

export function OdooSidebar({ userRole, session }: { userRole?: string; session?: Session | null }) {
  const pathname = usePathname()

  const filtered = NAV_ITEMS.filter((item) => {
    if (!item.roles) return true
    return userRole && item.roles.includes(userRole)
  })

  const mainItems  = filtered.filter((i) => !i.section)
  const adminItems = filtered.filter((i) => i.section === "Admin")

  return (
    <aside
      className="hidden lg:flex flex-col shrink-0"
      style={{
        width: 240,
        background: "hsl(var(--sidebar-bg))",
        borderRight: "1px solid hsl(var(--sidebar-border))",
        minHeight: "100vh",
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-5 shrink-0"
        style={{ height: 56, borderBottom: "1px solid hsl(var(--sidebar-border))" }}
      >
        <div className="w-7 h-7 rounded-md bg-blue-500 flex items-center justify-center shrink-0">
          <Receipt className="w-4 h-4 text-white" />
        </div>
        <span className="text-white font-bold text-[15px] tracking-tight">Reimbursor</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto px-2">
        {mainItems.map((item) => (
          <SidebarLink key={item.href} item={item} pathname={pathname} />
        ))}

        {adminItems.length > 0 && (
          <>
            <div
              className="px-3 pt-5 pb-2 text-[10px] font-bold uppercase tracking-widest"
              style={{ color: "hsl(var(--sidebar-fg) / 0.45)" }}
            >
              Administration
            </div>
            {adminItems.map((item) => (
              <SidebarLink key={item.href} item={item} pathname={pathname} />
            ))}
          </>
        )}
      </nav>

      {/* Bottom: notifications + user */}
      <div style={{ borderTop: "1px solid hsl(var(--sidebar-border))" }}>
        {/* Notifications link */}
        <Link
          href="/notifications"
          className="flex items-center gap-3 px-4 py-3 text-[13px] font-medium transition-colors"
          style={{ color: "hsl(var(--sidebar-fg))" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "hsl(var(--sidebar-item-hover))"
            e.currentTarget.style.color = "#fff"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = ""
            e.currentTarget.style.color = "hsl(var(--sidebar-fg))"
          }}
        >
          <Bell className="w-4 h-4 shrink-0 opacity-70" />
          <span>Notifications</span>
        </Link>

        {/* User profile + sign out */}
        {session?.user && (
          <div
            className="flex items-center gap-3 px-4 py-3"
            style={{ borderTop: "1px solid hsl(var(--sidebar-border))" }}
          >
            <div className="w-8 h-8 rounded-full bg-blue-500/25 flex items-center justify-center text-blue-300 text-[12px] font-bold shrink-0">
              {session.user.name?.[0] ?? "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-white truncate leading-tight">
                {session.user.name}
              </p>
              <p
                className="text-[11px] truncate leading-tight capitalize"
                style={{ color: "hsl(var(--sidebar-fg))" }}
              >
                {session.user.role?.toLowerCase()}
              </p>
            </div>
            <button
              onClick={() => signOut()}
              title="Sign out"
              className="w-7 h-7 rounded flex items-center justify-center transition-colors shrink-0"
              style={{ color: "hsl(var(--sidebar-fg))" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(239,68,68,0.15)"
                e.currentTarget.style.color = "#f87171"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = ""
                e.currentTarget.style.color = "hsl(var(--sidebar-fg))"
              }}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}

function SidebarLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const Icon = item.icon
  const isActive = pathname === item.href || pathname.startsWith(item.href + "/")

  return (
    <Link
      href={item.href}
      className="flex items-center gap-3 px-3 py-2 rounded-md mx-1 mb-0.5 text-[13px] font-medium transition-colors"
      style={{
        color: isActive ? "#fff" : "hsl(var(--sidebar-fg))",
        background: isActive ? "hsl(var(--sidebar-item-active))" : "transparent",
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = "hsl(var(--sidebar-item-hover))"
          e.currentTarget.style.color = "#fff"
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = "transparent"
          e.currentTarget.style.color = "hsl(var(--sidebar-fg))"
        }
      }}
    >
      <Icon className={`w-4 h-4 shrink-0 ${isActive ? "opacity-100" : "opacity-70"}`} />
      <span className="flex-1">{item.label}</span>
      {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-50" />}
    </Link>
  )
}
