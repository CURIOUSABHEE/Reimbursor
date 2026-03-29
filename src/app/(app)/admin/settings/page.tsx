import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Building2, Bell, Shield, Workflow, ChevronRight } from "lucide-react"

export default async function AdminSettingsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (session.user.role !== "ADMIN") redirect("/dashboard")

  const company = await prisma.company.findUnique({ where: { id: session.user.companyId } })

  const settings = [
    { title: "Company Settings",   description: "Manage company name, currency, and preferences", icon: Building2, href: "/dashboard" },
    { title: "Notifications",      description: "Configure notification preferences",              icon: Bell,      href: "/notifications" },
    { title: "User Management",    description: "Manage user roles and permissions",               icon: Shield,    href: "/admin/users" },
    { title: "Approval Workflow",  description: "Configure expense approval workflows",            icon: Workflow,  href: "/admin/workflow" },
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="o-breadcrumb">
        <span className="text-gray-400 text-[12px]">Admin</span>
        <span className="text-gray-300 mx-1">/</span>
        <span className="text-[13px] font-semibold text-gray-800">Settings</span>
      </div>
      <div className="flex-1 overflow-auto p-4 space-y-4 max-w-3xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {settings.map((s) => {
            const Icon = s.icon
            return (
              <Link key={s.title} href={s.href} className="o-container p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-gray-900">{s.title}</p>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                  </div>
                  <p className="text-[12px] text-gray-500 mt-0.5">{s.description}</p>
                </div>
              </Link>
            )
          })}
        </div>

        <div className="o-container overflow-hidden">
          <div className="px-3 py-2 border-b" style={{ borderColor: "#dcdcdc", background: "#f7f7f7" }}>
            <span className="text-[12px] font-semibold text-gray-700">Company Information</span>
          </div>
          {[
            { label: "Company Name",    value: company?.name || "Not set" },
            { label: "Default Currency", value: company?.currency || "USD" },
            { label: "Company ID",      value: company?.id.slice(0, 8) + "..." },
          ].map((row) => (
            <div key={row.label} className="flex justify-between items-center px-3 py-2.5 border-b last:border-0" style={{ borderColor: "#ebebeb" }}>
              <span className="text-[12px] text-gray-500">{row.label}</span>
              <span className="text-[13px] font-medium text-gray-900">{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
