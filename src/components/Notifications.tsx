"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface Notification {
  id: string
  message: string
  read: boolean
  createdAt: string
  expense?: {
    id: string
    description: string
  }
}

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchUnreadCount = async () => {
    try {
      const res = await fetch("/api/notifications")
      if (res.ok) {
        const data = await res.json()
        setUnreadCount(data.unreadCount)
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error)
    }
  }

  return (
    <div className="relative">
      <Link href="/notifications">
        <Button variant="ghost" size="icon" className="relative">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center rounded-full bg-red-500 text-xs text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </Link>
    </div>
  )
}

export function NotificationList({ notifications }: { notifications: Notification[] }) {
  const router = useRouter()
  const [markingId, setMarkingId] = useState<string | null>(null)

  const markAsRead = async (notificationId: string) => {
    setMarkingId(notificationId)
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      })
      router.refresh()
    } catch (error) {
      console.error("Failed to mark notification as read:", error)
    } finally {
      setMarkingId(null)
    }
  }

  if (notifications.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No notifications</h3>
            <p className="mt-1 text-gray-500">You&apos;re all caught up!</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Notifications</CardTitle>
          {notifications.some(n => !n.read) && (
            <Button variant="outline" size="sm" onClick={() => {
              fetch("/api/notifications", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ markAllRead: true }),
              }).then(() => router.refresh())
            }} disabled={markingId !== null}>
              Mark all as read
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`flex items-start gap-4 p-4 rounded-lg border ${
                notification.read ? "bg-background" : "bg-blue-50 border-blue-200"
              }`}
            >
              <div className="flex-1">
                <p className={`text-sm ${notification.read ? "text-gray-600" : "text-gray-900 font-medium"}`}>
                  {notification.message}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(notification.createdAt).toLocaleString()}
                </p>
              </div>
              {!notification.read && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => markAsRead(notification.id)}
                  disabled={markingId === notification.id}
                >
                  Mark read
                </Button>
              )}
              {notification.expense && (
                <Link href={`/expenses/${notification.expense.id}`}>
                  <Button variant="outline" size="sm">
                    View
                  </Button>
                </Link>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
