"use client"

import { useState, useEffect } from "react"
import { DashboardContent } from "./DashboardContent"

interface Company {
  id: string
  name: string
  currency: string
}

export function DashboardClient() {
  const [company, setCompany] = useState<Company | null>(null)
  const [showSetup, setShowSetup] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCompany()
  }, [])

  const fetchCompany = async () => {
    try {
      const res = await fetch("/api/company")
      if (res.ok) {
        const data = await res.json()
        setCompany(data)
      }
    } catch (error) {
      console.error("Failed to fetch company:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <DashboardContent
      company={company}
      showSetup={showSetup}
      onShowSetupChange={setShowSetup}
    />
  )
}
