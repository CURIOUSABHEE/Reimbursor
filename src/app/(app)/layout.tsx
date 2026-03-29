"use client"

import { useSession } from "next-auth/react"
import { Navbar } from "@/components/Navbar"
import { Sidebar } from "@/components/Sidebar"
import { Container } from "@/components/ui"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session } = useSession()

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex">
        <Sidebar userRole={session?.user?.role} />
        <Container className="flex-1 py-8">
          {children}
        </Container>
      </div>
    </div>
  )
}
