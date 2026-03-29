"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/ui/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { ExpenseAmountCell } from "@/components/ExpenseAmountCell"
import { CheckSquare, Clock, CheckCircle2, XCircle } from "lucide-react"

interface ApprovalAction {
  id: string
  action: string
  stepOrder: number
  approver: { id: string; name: string }
}

interface Expense {
  id: string
  description: string
  category: string
  date: string
  submittedAmount: number
  submittedCurrency: string
  convertedAmount: number
  status: string
  employee: { id: string; name: string; email: string }
  approvalActions: ApprovalAction[]
}

interface ApprovalListProps {
  approvals: Expense[]
  companyCurrency: string
  viewerRole: "ADMIN" | "MANAGER" | "EMPLOYEE"
}

export function ApprovalList({ approvals, companyCurrency, viewerRole }: ApprovalListProps) {
  const router = useRouter()
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [comment, setComment] = useState("")
  const [loading, setLoading] = useState(false)

  const handleApprove = async (expenseId: string) => {
    setLoading(true)
    try {
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expenseId, action: "APPROVED", comment }),
      })

      if (res.ok) {
        router.refresh()
        setSelectedExpense(null)
        setComment("")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async (expenseId: string) => {
    setLoading(true)
    try {
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expenseId, action: "REJECTED", comment }),
      })

      if (res.ok) {
        router.refresh()
        setSelectedExpense(null)
        setComment("")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pending Approvals"
        description="Review and approve expense requests from your team"
      />

      {approvals.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <EmptyState
              icon={<CheckSquare className="w-8 h-8" />}
              title="No pending approvals"
              description="You're all caught up! Check back later for new requests."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3 space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">
              Requests ({approvals.length})
            </h2>
            <div className="space-y-2">
              {approvals.map((expense) => (
                <button
                  key={expense.id}
                  className={`w-full text-left p-4 rounded-xl border transition-all hover:shadow-md ${
                    selectedExpense?.id === expense.id 
                      ? "border-primary bg-primary/5 shadow-sm" 
                      : "border-border bg-card hover:bg-surface"
                  }`}
                  onClick={() => setSelectedExpense(expense)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium truncate pr-4">{expense.description}</p>
                    <Badge variant="warning">{expense.status}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{expense.employee.name}</span>
                    <span>{new Date(expense.date).toLocaleDateString()}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedExpense ? (
              <Card className="sticky top-8">
                <CardHeader>
                  <CardTitle className="text-lg">Review Expense</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Employee</p>
                        <p className="font-medium">{selectedExpense.employee.name}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Category</p>
                        <p className="font-medium">{selectedExpense.category}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Date</p>
                        <p className="font-medium">
                          {new Date(selectedExpense.date).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Status</p>
                        <p className="font-medium">{selectedExpense.status}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Amount</p>
                      <ExpenseAmountCell
                        convertedAmount={selectedExpense.convertedAmount}
                        companyCurrency={companyCurrency}
                        submittedAmount={selectedExpense.submittedAmount}
                        submittedCurrency={selectedExpense.submittedCurrency}
                        viewerRole={viewerRole}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Comment (optional)</label>
                    <Textarea
                      placeholder="Add a comment..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="success"
                      className="flex-1"
                      onClick={() => handleApprove(selectedExpense.id)}
                      disabled={loading}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => handleReject(selectedExpense.id)}
                      disabled={loading}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full flex items-center justify-center min-h-[300px]">
                <div className="text-center text-muted-foreground">
                  <Clock className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Select a request to review</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
