import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { PageHeader, Section } from "@/components/ui/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { cn } from "@/lib/utils"
import { Users, Shield, UserCheck, User as UserIcon } from "lucide-react"

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions)

  if (!session) redirect("/login")
  if (session.user.role !== "ADMIN") redirect("/dashboard")

  const users = await prisma.user.findMany({
    where: { companyId: session.user.companyId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      managerId: true,
      createdAt: true,
      manager: { select: { name: true } },
      _count: { select: { expenses: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  const roleStats = {
    ADMIN:    users.filter((u) => u.role === "ADMIN").length,
    MANAGER:  users.filter((u) => u.role === "MANAGER").length,
    EMPLOYEE: users.filter((u) => u.role === "EMPLOYEE").length,
  }

  const statCards = [
    { label: "Administrators", value: roleStats.ADMIN,    icon: Shield,    iconBg: "bg-red-50",   iconColor: "text-red-600",   badgeVariant: "destructive" as const },
    { label: "Managers",       value: roleStats.MANAGER,  icon: UserCheck, iconBg: "bg-amber-50", iconColor: "text-amber-600", badgeVariant: "warning" as const },
    { label: "Employees",      value: roleStats.EMPLOYEE, icon: UserIcon,  iconBg: "bg-blue-50",  iconColor: "text-blue-600",  badgeVariant: "secondary" as const },
  ]

  const roleAvatarStyle: Record<string, string> = {
    ADMIN:    "bg-red-100 text-red-600",
    MANAGER:  "bg-amber-100 text-amber-600",
    EMPLOYEE: "bg-blue-100 text-blue-600",
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="User Management"
        description="Manage employees, managers, and admin roles"
      />

      {/* Role stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className="shadow-elevation-2 border-border/70 hover:shadow-elevation-3 transition-shadow duration-200">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <p className="text-label">{stat.label}</p>
                    <p className="text-metric">{stat.value}</p>
                  </div>
                  <div className={cn("mt-0.5 p-2.5 rounded-lg shrink-0", stat.iconBg)}>
                    <Icon className={cn("w-5 h-5", stat.iconColor)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* User list */}
      <Section title="All Users" description={`${users.length} total member${users.length !== 1 ? "s" : ""}`}>
        <Card className="shadow-elevation-2 border-border/70">
          <CardContent className="p-0">
            {users.length === 0 ? (
              <EmptyState
                icon={<Users className="w-8 h-8" />}
                title="No users yet"
                description="Invite team members to get started"
              />
            ) : (
              <div className="divide-y divide-border">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 hover:bg-surface transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className={cn("text-sm font-semibold", roleAvatarStyle[user.role] ?? "bg-surface text-muted-foreground")}>
                          {user.name?.[0] || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium leading-tight">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      {user.manager && (
                        <div className="text-right hidden sm:block">
                          <p className="text-xs text-muted-foreground">Reports to</p>
                          <p className="text-sm font-medium">{user.manager.name}</p>
                        </div>
                      )}
                      <div className="text-right hidden md:block">
                        <p className="text-xs text-muted-foreground">Expenses</p>
                        <p className="text-sm font-semibold">{user._count.expenses}</p>
                      </div>
                      <Badge
                        variant={
                          user.role === "ADMIN"    ? "destructive" :
                          user.role === "MANAGER"  ? "warning" :
                          "secondary"
                        }
                      >
                        {user.role.toLowerCase()}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </Section>
    </div>
  )
}
