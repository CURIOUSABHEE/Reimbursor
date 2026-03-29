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

  if (!session) {
    redirect("/login")
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard")
  }

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
      _count: {
        select: { expenses: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  const roleStats = {
    ADMIN: users.filter((u) => u.role === "ADMIN").length,
    MANAGER: users.filter((u) => u.role === "MANAGER").length,
    EMPLOYEE: users.filter((u) => u.role === "EMPLOYEE").length,
  }

  const statCards = [
    { label: "Administrators", value: roleStats.ADMIN, icon: Shield, color: "text-red-600 bg-red-100" },
    { label: "Managers", value: roleStats.MANAGER, icon: UserCheck, color: "text-amber-600 bg-amber-100" },
    { label: "Employees", value: roleStats.EMPLOYEE, icon: UserIcon, color: "text-blue-600 bg-blue-100" },
  ]

  return (
    <div className="space-y-8">
      <PageHeader
        title="User Management"
        description="Manage employees, managers, and admin roles"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className={cn("p-2.5 rounded-xl", stat.color)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Section title="All Users" description={`${users.length} total`}>
        <Card>
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
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className={cn(
                          "text-sm font-semibold",
                          user.role === "ADMIN" && "bg-red-100 text-red-600",
                          user.role === "MANAGER" && "bg-amber-100 text-amber-600",
                          user.role === "EMPLOYEE" && "bg-blue-100 text-blue-600"
                        )}>
                          {user.name?.[0] || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      {user.manager && (
                        <div className="text-right hidden sm:block">
                          <p className="text-xs text-muted-foreground">Reports to</p>
                          <p className="text-sm">{user.manager.name}</p>
                        </div>
                      )}
                      <div className="text-right hidden md:block">
                        <p className="text-xs text-muted-foreground">Expenses</p>
                        <p className="text-sm">{user._count.expenses}</p>
                      </div>
                      <Badge
                        variant={
                          user.role === "ADMIN" ? "destructive" :
                          user.role === "MANAGER" ? "warning" :
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
