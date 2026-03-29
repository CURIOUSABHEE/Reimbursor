"use client"

import { useSession } from "next-auth/react"
import { OdooTopbar } from "@/components/OdooTopbar"
import { OdooSidebar } from "@/components/OdooSidebar"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#f0f0f0" }}>
      {/* Global topbar */}
      <OdooTopbar />

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <OdooSidebar userRole={session?.user?.role} />

        {/* Main content */}
        <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}
