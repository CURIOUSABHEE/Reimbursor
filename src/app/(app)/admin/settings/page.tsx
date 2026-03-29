import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Building2, Bell, Shield, Workflow, ChevronRight, Settings, Globe, Hash, User } from "lucide-react"

export default async function AdminSettingsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (session.user.role !== "ADMIN") redirect("/dashboard")

  const company = await prisma.company.findUnique({ where: { id: session.user.companyId } })

  const navCards = [
    {
      title: "Company Setup",
      description: "Update company name, currency, and branding",
      icon: Building2,
      href: "/dashboard",
      gradient: "from-blue-500 to-blue-600",
      bg: "bg-blue-50",
      iconColor: "text-blue-600",
      badge: "Core",
    },
    {
      title: "Notifications",
      description: "Configure how and when alerts are sent",
      icon: Bell,
      href: "/notifications",
      gradient: "from-amber-500 to-orange-500",
      bg: "bg-amber-50",
      iconColor: "text-amber-600",
      badge: null,
    },
    {
      title: "User Management",
      description: "Invite team members and manage roles",
      icon: Shield,
      href: "/admin/users",
      gradient: "from-emerald-500 to-teal-500",
      bg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      badge: null,
    },
    {
      title: "Approval Workflow",
      description: "Define multi-step expense approval chains",
      icon: Workflow,
      href: "/admin/workflow",
      gradient: "from-violet-500 to-purple-600",
      bg: "bg-violet-50",
      iconColor: "text-violet-600",
      badge: null,
    },
  ]

  const infoRows = [
    { label: "Company Name",     value: company?.name || "Not set",                    icon: Building2, color: "text-blue-500" },
    { label: "Default Currency", value: company?.currency || "USD",                    icon: Globe,     color: "text-emerald-500" },
    { label: "Company ID",       value: company?.id?.slice(0, 12) + "…",               icon: Hash,      color: "text-gray-400" },
    { label: "Admin",            value: session.user.name || session.user.email || "—", icon: User,      color: "text-violet-500" },
  ]

  return (
    <div className="flex flex-col min-h-full">

      {/* Sticky header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-8 bg-white border-b border-gray-200 shrink-0" style={{ height: 52 }}>
        <span className="text-gray-400 text-xs">Admin</span>
        <span className="text-gray-300">/</span>
        <span className="font-semibold text-gray-800 text-sm">Settings</span>
      </div>

      <div className="flex-1 p-8 max-w-4xl space-y-8">

        {/* Page hero */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center shadow-lg">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Settings</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage your workspace configuration</p>
          </div>
        </div>

        {/* Nav cards */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Configuration</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {navCards.map((card) => {
              const Icon = card.icon
              return (
                <Link
                  key={card.title}
                  href={card.href}
                  className="group relative flex items-center gap-4 p-5 bg-white border border-gray-200 rounded-2xl hover:border-gray-300 hover:shadow-lg transition-all duration-200 overflow-hidden"
                >
                  {/* Subtle gradient accent on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-r ${card.gradient} opacity-0 group-hover:opacity-[0.03] transition-opacity`} />

                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${card.bg} group-hover:scale-110 transition-transform duration-200`}>
                    <Icon className={`w-6 h-6 ${card.iconColor}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 text-sm group-hover:text-blue-600 transition-colors">{card.title}</p>
                      {card.badge && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600">{card.badge}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{card.description}</p>
                  </div>

                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-400 group-hover:translate-x-1 transition-all shrink-0" />
                </Link>
              )
            })}
          </div>
        </div>

        {/* Company info */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Company Information</p>
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            {infoRows.map((row, i) => {
              const Icon = row.icon
              return (
                <div
                  key={row.label}
                  className={`flex items-center gap-4 px-6 py-4 ${i < infoRows.length - 1 ? "border-b border-gray-100" : ""} hover:bg-gray-50/60 transition-colors`}
                >
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                    <Icon className={`w-4 h-4 ${row.color}`} />
                  </div>
                  <span className="text-sm text-gray-500 font-medium flex-1">{row.label}</span>
                  <span className="text-sm font-bold text-gray-900 font-mono tracking-tight">{row.value}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Version footer */}
        <p className="text-xs text-gray-300 text-center pb-2">Reimbursor · Admin Panel</p>

      </div>
    </div>
  )
}
