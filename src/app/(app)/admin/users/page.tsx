"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserPlus, Send, Check, X } from "lucide-react"

interface User {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
  manager: { id: string; name: string } | null
}

export default function AdminUsersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<{ role: string; managerId: string }>({ role: "", managerId: "none" })

  // New user row state
  const [showNew, setShowNew] = useState(false)
  const [newUser, setNewUser] = useState({ name: "", email: "", role: "EMPLOYEE", managerId: "none" })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState("")

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
    if (status === "authenticated" && session.user.role !== "ADMIN") router.push("/dashboard")
  }, [status, session, router])

  useEffect(() => { fetchUsers() }, [])

  async function fetchUsers() {
    setLoading(true)
    const res = await fetch("/api/users")
    if (res.ok) setUsers(await res.json())
    setLoading(false)
  }

  async function handleSendPassword(userId: string) {
    setSending(userId)
    await fetch(`/api/users?id=${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "sendPassword" }),
    })
    setSending(null)
  }

  function startEdit(user: User) {
    setEditing(user.id)
    setEditValues({ role: user.role, managerId: user.manager?.id ?? "none" })
  }

  async function saveEdit(userId: string) {
    await fetch(`/api/users?id=${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: editValues.role,
        managerId: editValues.managerId === "none" ? null : editValues.managerId,
      }),
    })
    setEditing(null)
    fetchUsers()
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setCreateError("")
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...newUser,
        managerId: newUser.managerId === "none" ? undefined : newUser.managerId,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      setCreateError(data.error || "Failed to create user")
    } else {
      setShowNew(false)
      setNewUser({ name: "", email: "", role: "EMPLOYEE", managerId: "none" })
      fetchUsers()
    }
    setCreating(false)
  }

  const managers = users.filter(u => u.role === "MANAGER" || u.role === "ADMIN")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-muted-foreground text-sm">Manage your company&apos;s users</p>
        </div>
        <Button size="sm" onClick={() => setShowNew(true)}>
          <UserPlus className="h-4 w-4 mr-2" /> New
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-medium">User</th>
              <th className="px-4 py-3 text-left font-medium">Role</th>
              <th className="px-4 py-3 text-left font-medium">Manager</th>
              <th className="px-4 py-3 text-left font-medium">Email</th>
              <th className="px-4 py-3 text-center font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {/* New user row */}
            {showNew && (
              <tr className="bg-accent/30">
                <td className="px-4 py-2">
                  <Input
                    placeholder="Full name"
                    value={newUser.name}
                    onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                    className="h-8 text-sm"
                  />
                </td>
                <td className="px-4 py-2">
                  <Select value={newUser.role} onValueChange={v => setNewUser({ ...newUser, role: v })}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EMPLOYEE">Employee</SelectItem>
                      <SelectItem value="MANAGER">Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-4 py-2">
                  <Select value={newUser.managerId} onValueChange={v => setNewUser({ ...newUser, managerId: v })}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select manager" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {managers.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-4 py-2">
                  <Input
                    type="email"
                    placeholder="email@company.com"
                    value={newUser.email}
                    onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                    className="h-8 text-sm"
                  />
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center justify-center gap-2">
                    {createError && <span className="text-xs text-destructive">{createError}</span>}
                    <Button size="sm" onClick={handleCreate} disabled={creating}>
                      {creating ? "..." : "Create & Send"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setShowNew(false); setCreateError("") }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            )}

            {loading && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
            )}

            {!loading && users.map(user => (
              <tr key={user.id} className="hover:bg-muted/40 transition-colors">
                <td className="px-4 py-3 font-medium">{user.name}</td>

                {/* Role — editable */}
                <td className="px-4 py-3">
                  {editing === user.id ? (
                    <Select value={editValues.role} onValueChange={v => setEditValues({ ...editValues, role: v })}>
                      <SelectTrigger className="h-8 text-sm w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EMPLOYEE">Employee</SelectItem>
                        <SelectItem value="MANAGER">Manager</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
                      {user.role}
                    </Badge>
                  )}
                </td>

                {/* Manager — editable */}
                <td className="px-4 py-3">
                  {editing === user.id ? (
                    <Select value={editValues.managerId} onValueChange={v => setEditValues({ ...editValues, managerId: v })}>
                      <SelectTrigger className="h-8 text-sm w-36">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {managers.filter(m => m.id !== user.id).map(m => (
                          <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-muted-foreground">{user.manager?.name ?? "—"}</span>
                  )}
                </td>

                <td className="px-4 py-3 text-muted-foreground">{user.email}</td>

                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    {editing === user.id ? (
                      <>
                        <Button size="sm" variant="ghost" className="text-green-700" onClick={() => saveEdit(user.id)}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => startEdit(user)}>
                        Edit
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={sending === user.id}
                      onClick={() => handleSendPassword(user.id)}
                      title="Send new password to user's email"
                    >
                      <Send className="h-3 w-3 mr-1" />
                      {sending === user.id ? "Sending..." : "Send password"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
