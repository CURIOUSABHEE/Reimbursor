"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { CompanySetupModal } from "@/components/CompanySetupModal"
import { StatusPill } from "@/components/ui/status-pill"
import { Plus, ArrowRight, Clock, CheckCircle2, XCircle, Receipt, TrendingUp } from "lucide-react"

interface Company { id: string; name: string; currency: string }
interface Expense {
  id: string; description: string; category: string
  submittedAmount: number; submittedCurrency: string; status: string; createdAt: string
}
interface DashboardData {
  expenses: Expense[]; totalExpenses: number; pendingCount: number
  approvedCount: number; rejectedCount: number; pendingApprovals: number
}
interface Session { user: { id: string; name: string; email: string; role: string } }
interface Props { company: Company | null; showSetup: boolean; onShowSetupChange: (s: boolean) => void }

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />
}

export function DashboardContent({ company, showSetup, onShowSetupChange }: Props) {
  const [data, setData]       = useState<DashboardData | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const handleShowSetupChange = useCallback((s: boolean) => onShowSetupChange(s), [onShowSetupChange])

  useEffect(() => {
    Promise.all([fetch("/api/auth/session"), fetch("/api/dashboard/data")])
      .then(async ([sr, dr]) => {
        if (sr.ok) setSession(await sr.json())
        if (dr.ok) setData(await dr.json())
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (company && session?.user?.role === "ADMIN") {
      if (!company.name || company.name === "New Company") handleShowSetupChange(true)
    }
  }, [company, session, handleShowSetupChange])

  if (loading || !session) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-72" />
      </div>
    )
  }

  const isManagerOrAdmin = session.user.role === "MANAGER" || session.user.role === "ADMIN"

  const stats = [
    { label: "Total Submitted", value: data?.totalExpenses ?? 0, icon: Receipt,      color: "#2563eb", bg: "#dbeafe" },
    { label: "Pending Review",  value: data?.pendingCount ?? 0,  icon: Clock,        color: "#b45309", bg: "#fef3c7" },
    { label: "Approved",        value: data?.approvedCount ?? 0, icon: CheckCircle2, color: "#15803d", bg: "#dcfce7" },
    { label: "Rejected",        value: data?.rejectedCount ?? 0, icon: XCircle,      color: "#dc2626", bg: "#fee2e2" },
  ]

  return (
    <div className="flex flex-col min-h-full">

      {/* ── Sticky breadcrumb bar ── */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-8 py-0 bg-white border-b border-gray-200 shrink-0" style={{ height: 52 }}>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-400">Home</span>
          <span className="text-gray-300">/</span>
          <span className="font-semibold text-gray-800">Dashboard</span>
        </div>
        <Link href="/expenses/new">
          <button className="o-btn o-btn-primary o-btn-sm">
            <Plus className="w-4 h-4" /> New Expense
          </button>
        </Link>
      </div>

      {/* ── Page content ── */}
      <div className="flex-1 p-8 space-y-6">

        {/* Welcome heading */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            Welcome back, <span className="text-blue-600">{session.user.name?.split(" ")[0]}</span>
          </h1>
          <p className="text-base text-gray-500 mt-1">Here&rsquo;s your expense overview for today.</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s) => {
            const Icon = s.icon
            return (
              <div key={s.label} className="o-stat-card flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: s.bg }}>
                  <Icon className="w-6 h-6" style={{ color: s.color }} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400">{s.label}</p>
                  <p className="text-3xl font-bold text-gray-900 leading-none mt-1">{s.value}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Content grid */}
        <div className={`grid gap-5 ${isManagerOrAdmin ? "grid-cols-1 lg:grid-cols-3" : "grid-cols-1"}`}>

          {/* Recent expenses */}
          <div className={`o-container overflow-hidden ${isManagerOrAdmin ? "lg:col-span-2" : ""}`}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <span className="text-base font-semibold text-gray-800">Recent Expenses</span>
              <Link href="/expenses" className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            {!data?.expenses?.length ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
                <Receipt className="w-10 h-10 opacity-25" />
                <p className="text-base">No expenses yet</p>
                <Link href="/expenses/new" className="text-sm text-blue-600 hover:underline font-medium">Create one</Link>
              </div>
            ) : (
              <table className="o-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Category</th>
                    <th className="text-right">Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.expenses.slice(0, 8).map((e) => (
                    <tr key={e.id} className="cursor-pointer" onClick={() => window.location.href = `/expenses/${e.id}`}>
                      <td className="font-medium text-gray-900 max-w-[220px] truncate">{e.description}</td>
                      <td className="text-gray-500">{e.category}</td>
                      <td className="text-right font-semibold tabular-nums">
                        {e.submittedCurrency} {e.submittedAmount.toFixed(2)}
                      </td>
                      <td><StatusPill status={e.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pending approvals */}
          {isManagerOrAdmin && (
            <div className="o-container overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <span className="text-base font-semibold text-gray-800">Pending Approvals</span>
                <Link href="/approvals" className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                  View <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="flex flex-col items-center justify-center py-10 gap-4 text-center px-6">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ background: (data?.pendingApprovals ?? 0) > 0 ? "#fef3c7" : "#dcfce7" }}
                >
                  {(data?.pendingApprovals ?? 0) > 0
                    ? <Clock className="w-8 h-8 text-amber-600" />
                    : <CheckCircle2 className="w-8 h-8 text-green-600" />}
                </div>
                <div>
                  <p className="text-4xl font-bold text-gray-900 leading-none">{data?.pendingApprovals ?? 0}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    {(data?.pendingApprovals ?? 0) > 0 ? "waiting for your review" : "All caught up!"}
                  </p>
                </div>
                {(data?.pendingApprovals ?? 0) > 0 && (
                  <Link href="/approvals">
                    <button className="o-btn o-btn-primary">
                      <TrendingUp className="w-4 h-4" /> Review now
                    </button>
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <CompanySetupModal company={company} open={showSetup} onOpenChange={handleShowSetupChange} />
    </div>
  )
}
