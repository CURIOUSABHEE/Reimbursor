"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
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

  const mainItems  = filteredNavItems.filter((i) => !i.section)
  const adminItems = filteredNavItems.filter((i) => i.section === "Admin")

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 min-h-screen border-r border-sidebar-border bg-sidebar-bg transition-premium">
      {/* Logo */}
      <div className="h-20 flex items-center px-6 border-b border-sidebar-border shrink-0">
        <motion.div 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2"
        >
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Receipt className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-xl tracking-tight">
            Reimbursor
          </span>
        </motion.div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: {
                staggerChildren: 0.05
              }
            }
          }}
        >
          {mainItems.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}

          {adminItems.length > 0 && (
            <>
              <div className="pt-8 pb-3 px-3">
                <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-sidebar-fg opacity-40">
                  Administration
                </span>
              </div>
              {adminItems.map((item) => (
                <NavLink key={item.href} item={item} pathname={pathname} />
              ))}
            </>
          )}
        </motion.div>
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
        "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-premium overflow-hidden",
        isActive
          ? "text-white"
          : "text-sidebar-fg hover:text-white hover:bg-sidebar-item-hover"
      )}
    >
      <AnimatePresence>
        {isActive && (
          <motion.div
            layoutId="active-nav-bg"
            className="absolute inset-0 bg-primary"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
            }}
          />
        )}
      </AnimatePresence>

      <span className="relative z-10 flex items-center gap-3">
        <Icon className={cn(
          "w-5 h-5 shrink-0 transition-premium",
          isActive ? "text-white" : "group-hover:scale-110"
        )} />
        <span className="font-medium tracking-tight">{item.label}</span>
      </span>

      {/* Hover effect for inactive items */}
      {!isActive && (
        <motion.div
          className="absolute inset-0 bg-sidebar-item-hover opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-xl"
        />
      )}
    </Link>
  )
}
