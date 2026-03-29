"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { ExpenseAmountCell } from "@/components/ExpenseAmountCell"
import { PageTransition, StaggerContainer, staggerItem } from "@/components/PageTransition"
import { Plus, FileText, ArrowRight, Wallet } from "lucide-react"

interface Expense {
  id: string
  description: string
  category: string
  date: string
  submittedAmount: number
  submittedCurrency: string
  convertedAmount: number
  status: string
  employee: { name: string; email: string }
  isAdminOverride: boolean
}

interface ExpenseListProps {
  expenses: Expense[]
  companyCurrency: string
  viewerRole: "ADMIN" | "MANAGER" | "EMPLOYEE"
  showCreateButton?: boolean
}

const statusVariants: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  DRAFT: "secondary",
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "destructive",
}

export function ExpenseList({ expenses, companyCurrency, viewerRole, showCreateButton = true }: ExpenseListProps) {
  return (
    <PageTransition>
      <div className="space-y-8">
        <PageHeader
          title="My Expenses"
          description="View and manage your submitted reimbursements"
          action={
            showCreateButton && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
              >
                <Link href="/expenses/new">
                  <Button className="h-11 px-6 rounded-xl gap-2 font-semibold shadow-lg shadow-primary/20 group">
                    <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                    New Expense
                  </Button>
                </Link>
              </motion.div>
            )
          }
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <Card className="surface-1 border-border/40 overflow-hidden rounded-2xl shadow-xl shadow-black/5">
            <CardContent className="p-0">
              {expenses.length === 0 ? (
                <EmptyState
                  icon={<FileText className="w-10 h-10 text-muted-foreground/30" />}
                  title="No expenses recorded"
                  description="Your expense history will appear here once you submit your first reimbursement."
                  className="py-24"
                  action={
                    showCreateButton
                      ? {
                          label: "Create your first expense",
                          onClick: () => window.location.href = "/expenses/new"
                        }
                      : undefined
                  }
                />
              ) : (
                <div className="divide-y divide-border/20">
                  <StaggerContainer delay={0.3}>
                    {expenses.map((expense) => (
                      <motion.div key={expense.id} variants={staggerItem}>
                        <Link
                          href={`/expenses/${expense.id}`}
                          className="flex items-center justify-between px-6 py-5 hover:bg-surface-container/50 transition-premium group relative"
                        >
                          <div className="flex items-center gap-5 min-w-0">
                            <div className="w-11 h-11 rounded-xl bg-surface-container flex items-center justify-center text-primary shrink-0 transition-transform group-hover:scale-110 shadow-sm">
                              <Wallet className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-foreground text-sm tracking-tight truncate group-hover:text-primary transition-colors">
                                {expense.description}
                              </p>
                              <p className="text-body-muted text-xs mt-1 font-medium flex items-center gap-2">
                                <span className="text-foreground/60">{expense.category}</span>
                                <span className="w-1 h-1 rounded-full bg-border" />
                                <span>{new Date(expense.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-6 shrink-0">
                            <div className="text-right">
                              <ExpenseAmountCell
                                convertedAmount={expense.convertedAmount}
                                companyCurrency={companyCurrency}
                                submittedAmount={expense.submittedAmount}
                                submittedCurrency={expense.submittedCurrency}
                                viewerRole={viewerRole}
                              />
                            </div>
                            <div className="flex items-center gap-3 w-[120px] justify-end">
                              {expense.isAdminOverride ? (
                                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 px-3 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase">
                                  Overridden
                                </Badge>
                              ) : (
                                <Badge variant={statusVariants[expense.status] || "secondary"} className="px-3 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase">
                                  {expense.status.toLowerCase()}
                                </Badge>
                              )}
                              <ArrowRight className="w-4 h-4 text-muted-foreground/30 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                  </StaggerContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </PageTransition>
  )
}
