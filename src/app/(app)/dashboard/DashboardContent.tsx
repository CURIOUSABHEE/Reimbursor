"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EmptyState, Skeleton } from "@/components/ui/empty-state"
import { CompanySetupModal } from "@/components/CompanySetupModal"
import { cn } from "@/lib/utils"
import {
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  ArrowRight,
  DollarSign,
  Receipt,
  FileText,
  TrendingUp,
} from "lucide-react"

interface Company {
  id: string
  name: string
  currency: string
}

interface Expense {
  id: string
  description: string
  category: string
  submittedAmount: number
  submittedCurrency: string
  status: string
  createdAt: string
}

interface DashboardData {
  expenses: Expense[]
  totalExpenses: number
  pendingCount: number
  approvedCount: number
  rejectedCount: number
  pendingApprovals: number
}

interface SessionUser {
  id: string
  name: string
  email: string
  role: string
}

interface Session {
  user: SessionUser
}

interface DashboardContentProps {
  company: Company | null
  showSetup: boolean
  onShowSetupChange: (show: boolean) => void
}

/* ─────────────────────────────────────
   Stat card component
   ───────────────────────────────────── */
function StatCard({
  label,
  value,
  icon: Icon,
  iconBg,
  iconColor,
}: {
  label: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  iconBg: string
  iconColor: string
}) {
  return (
    <Card className="shadow-elevation-2 border-border/70 hover:shadow-elevation-3 transition-shadow duration-200">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <p className="text-label">{label}</p>
            <p className="text-metric">{value}</p>
          </div>
          <div className={cn("mt-0.5 p-2.5 rounded-lg shrink-0", iconBg)}>
            <Icon className={cn("w-5 h-5", iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/* ─────────────────────────────────────
   Status badge color map
   ───────────────────────────────────── */
function getStatusVariant(status: string): "success" | "destructive" | "warning" | "secondary" {
  switch (status) {
    case "APPROVED": return "success"
    case "REJECTED": return "destructive"
    case "PENDING":  return "warning"
    default:         return "secondary"
  }
}

function getStatusIconStyle(status: string) {
  switch (status) {
    case "APPROVED": return "bg-emerald-50 text-emerald-600"
    case "REJECTED": return "bg-red-50 text-red-600"
    case "PENDING":  return "bg-amber-50 text-amber-600"
    default:         return "bg-gray-100 text-gray-500"
  }
}

/* ─────────────────────────────────────
   Loading skeleton
   ───────────────────────────────────── */
function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="h-64 rounded-lg lg:col-span-2" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    </div>
  )
}

/* ─────────────────────────────────────
   Main dashboard component
   ───────────────────────────────────── */
export function DashboardContent({ company, showSetup, onShowSetupChange }: DashboardContentProps) {
  const [data,    setData]    = useState<DashboardData | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const handleShowSetupChange = useCallback((show: boolean) => {
    onShowSetupChange(show)
  }, [onShowSetupChange])

  useEffect(() => {
    fetchDashboard()
  }, [])

  useEffect(() => {
    if (company && session?.user?.role === "ADMIN") {
      if (!company.name || company.name === "New Company") {
        handleShowSetupChange(true)
      }
    }
  }, [company, session, handleShowSetupChange])

  const fetchDashboard = async () => {
    try {
      const [sessionRes, dataRes] = await Promise.all([
        fetch("/api/auth/session"),
        fetch("/api/dashboard/data"),
      ])

      if (sessionRes.ok) setSession(await sessionRes.json())
      if (dataRes.ok)    setData(await dataRes.json())
    } catch (error) {
      console.error("Failed to fetch dashboard:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !session) return <DashboardSkeleton />

  const stats = [
    {
      label: "Total Submitted",
      value: data?.totalExpenses ?? 0,
      icon: Receipt,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      label: "Pending Review",
      value: data?.pendingCount ?? 0,
      icon: Clock,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
    },
    {
      label: "Approved",
      value: data?.approvedCount ?? 0,
      icon: CheckCircle2,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
    {
      label: "Rejected",
      value: data?.rejectedCount ?? 0,
      icon: XCircle,
      iconBg: "bg-red-50",
      iconColor: "text-red-600",
    },
  ]

  const isManagerOrAdmin =
    session.user.role === "MANAGER" || session.user.role === "ADMIN"

  return (
    <div className="space-y-8">

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-page-title">
            Welcome back, {session.user.name?.split(" ")[0]}
          </h1>
          <p className="text-body-muted mt-1">
            Here&rsquo;s what&rsquo;s happening with your expenses today.
          </p>
        </div>
        <Link href="/expenses/new">
          <Button className="gap-2 shrink-0">
            <Plus className="w-4 h-4" />
            New Expense
          </Button>
        </Link>
      </div>

      {/* ── Stats grid ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      {/* ── Content grid ── */}
      <div className={cn(
        "grid gap-6",
        isManagerOrAdmin ? "grid-cols-1 lg:grid-cols-3" : "grid-cols-1"
      )}>

        {/* Recent Expenses — 2/3 width when approvals panel is shown */}
        <section className={cn("space-y-4", isManagerOrAdmin && "lg:col-span-2")}>
          <div className="flex items-center justify-between">
            <h2 className="text-section-header">Recent Expenses</h2>
            <Link href="/expenses">
              <Button variant="ghost" size="sm" className="gap-1 text-primary">
                View all
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>

          <Card className="shadow-elevation-2 border-border/70">
            <CardContent className="p-0">
              {!data?.expenses || data.expenses.length === 0 ? (
                <EmptyState
                  icon={<FileText className="w-7 h-7" />}
                  title="No expenses yet"
                  description="Create your first expense to get started"
                  className="py-10"
                  action={{
                    label: "Create expense",
                    onClick: () => { window.location.href = "/expenses/new" },
                  }}
                />
              ) : (
                <div className="divide-y divide-border">
                  {data.expenses.slice(0, 5).map((expense) => (
                    <Link
                      key={expense.id}
                      href={`/expenses/${expense.id}`}
                      className="flex items-center justify-between px-4 py-3.5 hover:bg-surface transition-colors duration-100"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                          getStatusIconStyle(expense.status)
                        )}>
                          <DollarSign className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground text-sm truncate">
                            {expense.description}
                          </p>
                          <p className="text-body-muted text-xs mt-0.5">
                            {expense.category} &middot;{" "}
                            {expense.submittedCurrency}{" "}
                            {expense.submittedAmount.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <Badge variant={getStatusVariant(expense.status)} className="ml-4 shrink-0">
                        {expense.status.toLowerCase()}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Pending Approvals — 1/3 width, managers/admins only */}
        {isManagerOrAdmin && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-section-header">Pending Approvals</h2>
              <Link href="/approvals">
                <Button variant="ghost" size="sm" className="gap-1 text-primary">
                  View
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>

            <Card className="shadow-elevation-2 border-border/70">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center gap-3">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center",
                    (data?.pendingApprovals ?? 0) > 0
                      ? "bg-amber-50"
                      : "bg-emerald-50"
                  )}>
                    {(data?.pendingApprovals ?? 0) > 0 ? (
                      <Clock className="w-6 h-6 text-amber-600" />
                    ) : (
                      <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    )}
                  </div>

                  <div>
                    <p className="text-metric">{data?.pendingApprovals ?? 0}</p>
                    <p className="text-body-muted text-sm mt-1">
                      {(data?.pendingApprovals ?? 0) > 0
                        ? "waiting for your review"
                        : "All caught up!"}
                    </p>
                  </div>

                  {(data?.pendingApprovals ?? 0) > 0 && (
                    <Link href="/approvals" className="w-full mt-1">
                      <Button variant="outline" size="sm" className="w-full gap-2">
                        <TrendingUp className="w-3.5 h-3.5" />
                        Review now
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>
        )}
      </div>

      <CompanySetupModal
        company={company}
        open={showSetup}
        onOpenChange={handleShowSetupChange}
      />
    </div>
  )
}
