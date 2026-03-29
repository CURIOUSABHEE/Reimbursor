import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NotificationList } from "@/components/Notifications"
import type { Notification } from "@prisma/client"

export default async function NotificationsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    include: {
      expense: {
        select: {
          id: true,
          description: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  return (
    <div className="flex flex-col h-full">
      <div className="o-breadcrumb">
        <span className="text-[13px] font-semibold text-gray-800">Notifications</span>
      </div>
      <div className="flex-1 overflow-auto p-4 max-w-3xl">
      <NotificationList
        notifications={notifications.map((n: Notification & { expense: { id: string; description: string } | null }) => ({
          id: n.id,
          type: n.type as "INFO" | "EXPENSE_SUBMITTED" | "APPROVAL_REQUIRED" | "APPROVAL_ACTION" | "EXPENSE_APPROVED" | "EXPENSE_REJECTED" | "SYSTEM" | "STEP_ACTIVATED" | "STEP_COMPLETED",
          title: n.title,
          message: n.message,
          read: n.read,
          createdAt: n.createdAt.toISOString(),
          expense: n.expense
            ? { id: n.expense.id, description: n.expense.description }
            : undefined,
          metadata: n.metadata as Record<string, unknown> | undefined,
        }))}
      />
      </div>
    </div>
  )
}
