"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

interface ResubmitExpenseButtonProps {
  expenseId: string
}

export function ResubmitExpenseButton({ expenseId }: ResubmitExpenseButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleResubmit = async () => {
    if (!confirm("Are you sure you want to resubmit this expense for approval?")) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/expenses/${expenseId}/resubmit`, {
        method: "POST",
      })

      if (response.ok) {
        router.refresh()
      } else {
        const error = await response.json()
        alert(error.error || "Failed to resubmit expense")
      }
    } catch (error) {
      console.error("Resubmit error:", error)
      alert("Failed to resubmit expense")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleResubmit}
      disabled={loading}
      className="gap-2"
      variant="default"
    >
      {loading ? (
        <RefreshCw className="w-4 h-4 animate-spin" />
      ) : (
        <RefreshCw className="w-4 h-4" />
      )}
      Resubmit for Approval
    </Button>
  )
}
