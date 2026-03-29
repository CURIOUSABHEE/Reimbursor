"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

interface SubmitExpenseButtonProps {
  expenseId: string
  isDraft: boolean
}

export function SubmitExpenseButton({
  expenseId,
  isDraft,
}: SubmitExpenseButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  if (!isDraft) {
    return null
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/expenses/${expenseId}/submit`, {
        method: "POST",
      })

      if (res.ok) {
        router.refresh()
      } else {
        const data = await res.json()
        alert(data.error || "Failed to submit expense")
      }
    } catch {
      alert("An error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleSubmit} disabled={loading}>
      {loading ? "Submitting..." : "Submit for Approval"}
    </Button>
  )
}
