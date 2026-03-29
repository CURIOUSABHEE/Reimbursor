"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PageHeader, Section } from "@/components/ui/page-header"
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
  FileText
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

export function DashboardContent({ company, showSetup, onShowSetupChange }: DashboardContentProps) {
  const [data, setData] = useState<DashboardData | null>(null)
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

      if (sessionRes.ok) {
        const sessionData = await sessionRes.json()
        setSession(sessionData)
      }

      if (dataRes.ok) {
        const dashData = await dataRes.json()
        setData(dashData)
      }
    } catch (error) {
      console.error("Failed to fetch dashboard:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !session) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-11 w-36" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  const stats = [
    {
      label: "Total Submitted",
      value: data?.totalExpenses || 0,
      icon: Receipt,
      color: "text-primary bg-primary/10",
    },
    {
      label: "Pending Review",
      value: data?.pendingCount || 0,
      icon: Clock,
      color: "text-amber-600 bg-amber-100",
    },
    {
      label: "Approved",
      value: data?.approvedCount || 0,
      icon: CheckCircle2,
      color: "text-emerald-600 bg-emerald-100",
    },
    {
      label: "Rejected",
      value: data?.rejectedCount || 0,
      icon: XCircle,
      color: "text-red-600 bg-red-100",
    },
  ]

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome back, ${session.user.name?.split(" ")[0]}`}
        description="Here's what's happening with your expenses"
        action={
          <Link href="/expenses/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Expense
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {stat.label}
                    </p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className={cn("p-2.5 rounded-xl", stat.color)}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Section
          title="Recent Expenses"
          className="lg:col-span-2"
          action={
            <Link href="/expenses">
              <Button variant="ghost" size="sm">
                View all
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          }
        >
          <Card>
            <CardContent className="p-0">
              {!data?.expenses || data.expenses.length === 0 ? (
                <EmptyState
                  icon={<FileText className="w-8 h-8" />}
                  title="No expenses yet"
                  description="Create your first expense to get started"
                  action={{
                    label: "Create expense",
                    onClick: () => window.location.href = "/expenses/new"
                  }}
                />
              ) : (
                <div className="divide-y divide-border">
                  {data.expenses.slice(0, 5).map((expense) => (
                    <Link
                      key={expense.id}
                      href={`/expenses/${expense.id}`}
                      className="flex items-center justify-between p-4 hover:bg-surface transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center",
                          expense.status === "APPROVED" ? "bg-emerald-100 text-emerald-600" :
                          expense.status === "REJECTED" ? "bg-red-100 text-red-600" :
                          expense.status === "PENDING" ? "bg-amber-100 text-amber-600" :
                          "bg-surface text-muted-foreground"
                        )}>
                          <DollarSign className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {expense.description}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {expense.category} &middot; {expense.submittedCurrency} {expense.submittedAmount.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <Badge 
                        variant={
                          expense.status === "APPROVED" ? "success" :
                          expense.status === "REJECTED" ? "destructive" :
                          expense.status === "PENDING" ? "warning" :
                          "secondary"
                        }
                      >
                        {expense.status.toLowerCase()}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </Section>

        {(session.user.role === "MANAGER" || session.user.role === "ADMIN") && (
          <Section
            title="Pending Approvals"
            action={
              <Link href="/approvals">
                <Button variant="ghost" size="sm">
                  View
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            }
          >
            <Card>
              <CardContent className="p-6 text-center">
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3",
                  (data?.pendingApprovals || 0) > 0 ? "bg-amber-100" : "bg-emerald-100"
                )}>
                  {(data?.pendingApprovals || 0) > 0 ? (
                    <Clock className="w-7 h-7 text-amber-600" />
                  ) : (
                    <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                  )}
                </div>
                <p className="text-3xl font-bold">
                  {data?.pendingApprovals || 0}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {(data?.pendingApprovals || 0) > 0 
                    ? "waiting for review"
                    : "All caught up!"
                  }
                </p>
              </CardContent>
            </Card>
          </Section>
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
