"use client"

import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { NotificationBell } from "@/components/Notifications"
import { cn } from "@/lib/utils"
import { 
  LayoutDashboard, 
  Receipt, 
  CheckSquare, 
  Settings, 
  LogOut,
  Bell,
  ChevronDown
} from "lucide-react"

export function Navbar() {
  const { data: session } = useSession()
  const pathname = usePathname()

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/expenses", label: "Expenses", icon: Receipt },
  ]

  if (session?.user?.role === "MANAGER" || session?.user?.role === "ADMIN") {
    navLinks.push({ href: "/approvals", label: "Approvals", icon: CheckSquare })
  }

  if (session?.user?.role === "ADMIN") {
    navLinks.push({ href: "/admin/expenses", label: "Admin", icon: Settings })
  }

  if (!session) {
    return (
      <nav className="glass sticky top-0 z-40 border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-headline">
            Reimbursor
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">Get started</Button>
            </Link>
          </div>
        </div>
      </nav>
    )
  }

  return (
    <nav className="glass sticky top-0 z-40 border-b border-border/50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="text-xl font-bold text-headline tracking-tight">
            Reimbursor
          </Link>
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-surface"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              )
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <NotificationBell />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-3 h-10 rounded-xl">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {session.user.name?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline text-sm font-medium">
                  {session.user.name?.split(" ")[0]}
                </span>
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 rounded-xl p-2" align="end" forceMount>
              <DropdownMenuLabel className="p-2">
                <div className="flex flex-col">
                  <p className="text-sm font-semibold">{session.user.name}</p>
                  <p className="text-xs text-muted-foreground">{session.user.email}</p>
                  <span className="inline-flex mt-1.5 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium w-fit">
                    {session.user.role.toLowerCase()}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="my-2" />
              <Link href="/notifications" className="block">
                <DropdownMenuItem className="rounded-lg cursor-pointer">
                  <Bell className="w-4 h-4 mr-2" />
                  Notifications
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator className="my-2" />
              <DropdownMenuItem 
                onClick={() => signOut()} 
                className="rounded-lg cursor-pointer text-red-600 focus:text-red-600"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  )
}
