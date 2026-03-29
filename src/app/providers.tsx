"use client"

import { SessionProvider } from "next-auth/react"
import { ReactNode } from "react"
import { AnimatePresence } from "framer-motion"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AnimatePresence mode="wait">
        {children}
      </AnimatePresence>
    </SessionProvider>
  )
}
