import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent } from "@/components/ui/card"
import { PageHeader, Section } from "@/components/ui/page-header"
import { cn } from "@/lib/utils"
import { Building2, Bell, Shield, Palette, ChevronRight } from "lucide-react"

export default async function AdminSettingsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  const company = await prisma.company.findUnique({
    where: { id: session.user.companyId },
  })

  const settings = [
    {
      title: "Company Settings",
      description: "Manage company name, currency, and preferences",
      icon: Building2,
      href: "/dashboard",
    },
    {
      title: "Notifications",
      description: "Configure notification preferences",
      icon: Bell,
      href: "/notifications",
    },
    {
      title: "User Management",
      description: "Manage user roles and permissions",
      icon: Shield,
      href: "/admin/users",
    },
    {
      title: "Approval Workflow",
      description: "Configure expense approval workflows",
      icon: Palette,
      href: "/admin/workflow",
    },
  ]

  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        description="Manage your company preferences and configurations"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {settings.map((setting) => {
          const Icon = setting.icon
          return (
            <Link
              key={setting.title}
              href={setting.href || "#"}
              className={cn(
                "block p-6 rounded-2xl border border-border bg-card transition-all hover:bg-surface hover:shadow-md"
              )}
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{setting.title}</h3>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{setting.description}</p>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      <Section title="Company Information">
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              <div className="flex justify-between items-center p-4">
                <span className="text-muted-foreground">Company Name</span>
                <span className="font-medium">{company?.name || "Not set"}</span>
              </div>
              <div className="flex justify-between items-center p-4">
                <span className="text-muted-foreground">Default Currency</span>
                <span className="font-medium">{company?.currency || "USD"}</span>
              </div>
              <div className="flex justify-between items-center p-4">
                <span className="text-muted-foreground">Company ID</span>
                <span className="font-mono text-sm text-muted-foreground">
                  {company?.id.slice(0, 8)}...
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </Section>
    </div>
  )
}
