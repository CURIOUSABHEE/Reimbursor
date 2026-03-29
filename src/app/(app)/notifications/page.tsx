import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NotificationList } from "@/components/Notifications"

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
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold">Notifications</h1>
        <p className="text-muted-foreground">
          Stay updated on your expense approvals
        </p>
      </div>

      <NotificationList
        notifications={notifications.map((n) => ({
          id: n.id,
          type: n.type,
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
  )
}
