"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "./StatusBadge"
import { formatCurrency } from "@/lib/formatCurrency"
import { ChevronRight, Plus, Trash2 } from "lucide-react"

interface Expense {
  id: string
  description: string
  category: string
  date: string
  submittedAmount: number
  submittedCurrency: string
  convertedAmount: number
  status: string
}

interface Props {
  userName: string
  currency: string
  toSubmit: number
  underValidation: number
  toBeReimbursed: number
  expenses: Expense[]
}

export function EmployeeDashboard({ userName, currency, toSubmit, underValidation, toBeReimbursed, expenses }: Props) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleDelete(id: string) {
    if (!confirm("Delete this expense?")) return
    setDeleting(id)
    await fetch(`/api/expenses/${id}`, { method: "DELETE" })
    setDeleting(null)
    router.refresh()
  }

  const total = expenses.reduce((s, e) => s + e.convertedAmount, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Expenses</h1>
        <Link href="/expenses/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" /> New Expense
          </Button>
        </Link>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 divide-x border rounded-lg bg-card">
        <div className="p-6 flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-primary">{formatCurrency(toSubmit, currency)}</p>
            <p className="text-sm text-muted-foreground mt-1">to submit</p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="p-6 flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-yellow-600">{formatCurrency(underValidation, currency)}</p>
            <p className="text-sm text-muted-foreground mt-1">under validation</p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="p-6 flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(toBeReimbursed, currency)}</p>
            <p className="text-sm text-muted-foreground mt-1">to be reimbursed</p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Description</th>
              <th className="px-4 py-3 text-left font-medium">Category</th>
              <th className="px-4 py-3 text-left font-medium">Date</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th>
              <th className="px-4 py-3 text-center font-medium">Status</th>
              <th className="px-4 py-3 text-center font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {expenses.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No expenses yet.{" "}
                  <Link href="/expenses/new" className="text-primary underline">Create one</Link>
                </td>
              </tr>
            )}
            {expenses.map((e) => (
              <tr key={e.id} className="hover:bg-muted/40 transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/expenses/${e.id}`} className="font-medium hover:underline">
                    {e.description}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{e.category}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(e.date).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right font-medium">
                  {formatCurrency(e.convertedAmount, currency)}
                </td>
                <td className="px-4 py-3 text-center">
                  <StatusBadge status={e.status} />
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Link href={`/expenses/${e.id}`}>
                      <Button variant="ghost" size="sm">View</Button>
                    </Link>
                    {e.status === "DRAFT" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(e.id)}
                        disabled={deleting === e.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          {expenses.length > 0 && (
            <tfoot className="bg-muted/50">
              <tr>
                <td colSpan={3} className="px-4 py-3 font-semibold text-right">Total</td>
                <td className="px-4 py-3 text-right font-bold">{formatCurrency(total, currency)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
