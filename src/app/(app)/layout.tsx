"use client"

import { useSession } from "next-auth/react"
import { Navbar } from "@/components/Navbar"
import { Sidebar } from "@/components/Sidebar"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session } = useSession()

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar — fixed left column */}
      <Sidebar userRole={session?.user?.role} />

      {/* Main column — stretches to fill remaining width */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Utility top bar */}
        <Navbar />

        {/* Page content — centered, consistent horizontal padding */}
        <main className="flex-1 px-6 py-8">
          <div className="max-w-6xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
