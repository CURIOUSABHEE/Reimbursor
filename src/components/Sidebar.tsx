"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Receipt,
  CheckSquare,
  Settings,
  FileText,
  Users,
  Workflow
} from "lucide-react"

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  roles?: ("EMPLOYEE" | "MANAGER" | "ADMIN")[]
  section?: string
}

const navItems: NavItem[] = [
  { href: "/dashboard",       label: "Dashboard",    icon: LayoutDashboard },
  { href: "/expenses",        label: "Expenses",     icon: Receipt },
  { href: "/approvals",       label: "Approvals",    icon: CheckSquare,  roles: ["MANAGER", "ADMIN"] },
  { href: "/admin/expenses",  label: "All Expenses", icon: FileText,     roles: ["ADMIN"], section: "Admin" },
  { href: "/admin/users",     label: "Users",        icon: Users,        roles: ["ADMIN"], section: "Admin" },
  { href: "/admin/workflow",  label: "Workflow",     icon: Workflow,     roles: ["ADMIN"], section: "Admin" },
  { href: "/admin/settings",  label: "Settings",     icon: Settings,     roles: ["ADMIN"], section: "Admin" },
]

interface SidebarProps {
  userRole?: string
}

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname()

  const filteredNavItems = navItems.filter((item) => {
    if (!item.roles) return true
    return userRole && item.roles.includes(userRole as "EMPLOYEE" | "MANAGER" | "ADMIN")
  })

  // Group items by section
  const mainItems  = filteredNavItems.filter((i) => !i.section)
  const adminItems = filteredNavItems.filter((i) => i.section === "Admin")

  return (
    <aside className="hidden lg:flex flex-col w-60 shrink-0 min-h-screen border-r"
      style={{
        background: "hsl(var(--sidebar-bg))",
        borderColor: "hsl(var(--sidebar-border))",
      }}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b shrink-0"
        style={{ borderColor: "hsl(var(--sidebar-border))" }}
      >
        <span className="text-white font-bold text-lg tracking-tight">
          Reimbursor
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {mainItems.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}

        {adminItems.length > 0 && (
          <>
            <div className="pt-6 pb-1.5 px-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: "hsl(var(--sidebar-fg) / 0.5)" }}
              >
                Admin
              </span>
            </div>
            {adminItems.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} />
            ))}
          </>
        )}
      </nav>
    </aside>
  )
}

function NavLink({
  item,
  pathname,
}: {
  item: NavItem
  pathname: string
}) {
  const Icon    = item.icon
  const isActive = pathname === item.href || pathname.startsWith(item.href + "/")

  return (
    <Link
      href={item.href}
      className={cn(
        "group relative flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-150",
        isActive
          ? "text-white"
          : "hover:text-white"
      )}
      style={
        isActive
          ? { background: "hsl(var(--sidebar-item-active))", color: "hsl(var(--sidebar-fg-active))" }
          : { color: "hsl(var(--sidebar-fg))" }
      }
      onMouseEnter={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLAnchorElement).style.background = "hsl(var(--sidebar-item-hover))"
          ;(e.currentTarget as HTMLAnchorElement).style.color = "hsl(var(--sidebar-fg-active))"
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLAnchorElement).style.background = ""
          ;(e.currentTarget as HTMLAnchorElement).style.color = "hsl(var(--sidebar-fg))"
        }
      }}
    >
      {/* Active indicator bar */}
      {isActive && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r"
          style={{ background: "hsl(var(--sidebar-indicator))" }}
        />
      )}
      <Icon className="w-4 h-4 shrink-0" />
      <span>{item.label}</span>
    </Link>
  )
}
