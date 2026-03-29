"use client"

import { useSession } from "next-auth/react"
import { OdooSidebar } from "@/components/OdooSidebar"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()

  return (
    <div className="flex min-h-screen" style={{ background: "#f0f0f0" }}>
      <OdooSidebar userRole={session?.user?.role} session={session} />
      <main className="flex-1 min-w-0 flex flex-col overflow-auto">
        {children}
      </main>
    </div>
  )
}
