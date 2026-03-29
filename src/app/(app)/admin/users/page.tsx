"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { Users, Shield, UserCheck, User as UserIcon, Plus, Pencil, Trash2, Send } from "lucide-react"

interface User {
  id: string
  name: string
  email: string
  role: "ADMIN" | "MANAGER" | "EMPLOYEE"
  managerId: string | null
  manager: { id: string; name: string } | null
  createdAt: string
}

const ROLE_STYLE: Record<string, { pill: string; avatar: string; dot: string }> = {
  ADMIN:    { pill: "bg-red-100 text-red-700",    avatar: "bg-red-500",    dot: "bg-red-400" },
  MANAGER:  { pill: "bg-amber-100 text-amber-700", avatar: "bg-amber-500",  dot: "bg-amber-400" },
  EMPLOYEE: { pill: "bg-blue-100 text-blue-700",  avatar: "bg-blue-500",   dot: "bg-blue-400" },
}

const AVATAR_COLORS = ["bg-blue-500","bg-violet-500","bg-emerald-500","bg-amber-500","bg-rose-500","bg-cyan-500","bg-indigo-500"]
function avatarColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % AVATAR_COLORS.length
  return AVATAR_COLORS[h]
}
function initials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
}

const EMPTY_FORM = { name: "", email: "", role: "EMPLOYEE" as "ADMIN" | "MANAGER" | "EMPLOYEE", managerId: "none" }

export default function AdminUsersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [users, setUsers]         = useState<User[]>([])
  const [loading, setLoading]     = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editUser, setEditUser]   = useState<User | null>(null)
  const [form, setForm]           = useState({ ...EMPTY_FORM })
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState("")
  const [sendingPw, setSendingPw] = useState<string | null>(null)
  const [deleting, setDeleting]   = useState<string | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
    if (status === "authenticated" && session.user.role !== "ADMIN") router.push("/dashboard")
  }, [status, session, router])

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/users")
    if (res.ok) setUsers(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const managers = users.filter(u => u.role === "MANAGER" || u.role === "ADMIN")
  const stats = [
    { label: "Administrators", value: users.filter(u => u.role === "ADMIN").length,    icon: Shield,    bg: "bg-red-50",    color: "text-red-600" },
    { label: "Managers",       value: users.filter(u => u.role === "MANAGER").length,  icon: UserCheck, bg: "bg-amber-50",  color: "text-amber-600" },
    { label: "Employees",      value: users.filter(u => u.role === "EMPLOYEE").length, icon: UserIcon,  bg: "bg-blue-50",   color: "text-blue-600" },
  ]

  function openCreate() { setForm({ name: "", email: "", role: "EMPLOYEE", managerId: "none" }); setError(""); setShowCreate(true) }
  function openEdit(user: User) {
    setForm({ name: user.name, email: user.email, role: user.role, managerId: user.managerId ?? "none" })
    setError(""); setEditUser(user)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("")
    const res = await fetch("/api/users", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, email: form.email, role: form.role, managerId: form.managerId === "none" ? undefined : form.managerId }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || "Failed to create user"); setSaving(false); return }
    setShowCreate(false); fetchUsers(); setSaving(false)
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault(); if (!editUser) return; setSaving(true); setError("")
    const res = await fetch(`/api/users/${editUser.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, email: form.email, role: form.role, managerId: form.managerId === "none" ? null : form.managerId }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || "Failed to update user"); setSaving(false); return }
    setEditUser(null); fetchUsers(); setSaving(false)
  }

  async function handleDelete(user: User) {
    if (!confirm(`Delete ${user.name}? This cannot be undone.`)) return
    setDeleting(user.id)
    await fetch(`/api/users/${user.id}`, { method: "DELETE" })
    setDeleting(null); fetchUsers()
  }

  async function handleSendPassword(user: User) {
    setSendingPw(user.id)
    await fetch(`/api/users?id=${user.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "sendPassword" }) })
    setSendingPw(null); alert(`Password sent to ${user.email}`)
  }

  const FormFields = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-sm font-semibold text-gray-700">Full Name</Label>
          <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Jane Smith" required className="h-9 border-gray-200" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-semibold text-gray-700">Email</Label>
          <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="jane@company.com" required className="h-9 border-gray-200" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-sm font-semibold text-gray-700">Role</Label>
          <Select value={form.role} onValueChange={v => setForm({ ...form, role: v as typeof form.role })}>
            <SelectTrigger className="h-9 border-gray-200"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="EMPLOYEE">Employee</SelectItem>
              <SelectItem value="MANAGER">Manager</SelectItem>
              <SelectItem value="ADMIN">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-semibold text-gray-700">Reports To</Label>
          <Select value={form.managerId} onValueChange={v => setForm({ ...form, managerId: v })}>
            <SelectTrigger className="h-9 border-gray-200"><SelectValue placeholder="No manager" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— No manager —</SelectItem>
              {managers.filter(m => !editUser || m.id !== editUser.id).map(m => (
                <SelectItem key={m.id} value={m.id}>{m.name} ({m.role.toLowerCase()})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
    </div>
  )

  return (
    <div className="flex flex-col min-h-full">

      {/* Sticky header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-8 bg-white border-b border-gray-200 shrink-0" style={{ height: 52 }}>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-400 text-xs">Admin</span>
          <span className="text-gray-300">/</span>
          <span className="font-semibold text-gray-800">User Management</span>
          <span className="text-gray-400 text-xs ml-1">{users.length} member{users.length !== 1 ? "s" : ""}</span>
        </div>
        <button onClick={openCreate} className="o-btn o-btn-primary o-btn-sm">
          <Plus className="w-4 h-4" /> Add User
        </button>
      </div>

      <div className="flex-1 p-8 space-y-6">

        {/* Page title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">User Management</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage employees, managers, and admin roles</p>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.map(s => {
            const Icon = s.icon
            return (
              <div key={s.label} className="o-stat-card flex items-center gap-4">
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", s.bg)}>
                  <Icon className={cn("w-6 h-6", s.color)} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400">{s.label}</p>
                  <p className="text-3xl font-bold text-gray-900 leading-none mt-1">{s.value}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* User list */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-base font-semibold text-gray-800">All Users</p>
              <p className="text-sm text-gray-500">{users.length} total member{users.length !== 1 ? "s" : ""}</p>
            </div>
          </div>

          <div className="o-container overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
                <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                <span className="text-sm">Loading users…</span>
              </div>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4 text-gray-400">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
                  <Users className="w-8 h-8 opacity-40" />
                </div>
                <div className="text-center">
                  <p className="text-base font-semibold text-gray-600">No users yet</p>
                  <p className="text-sm mt-1">Add your first team member to get started.</p>
                </div>
                <button onClick={openCreate} className="o-btn o-btn-primary o-btn-sm">
                  <Plus className="w-4 h-4" /> Add User
                </button>
              </div>
            ) : (
              <div>
                {/* Table header */}
                <div className="grid grid-cols-[1fr_1fr_120px_120px] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-200">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Name</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Email</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Reports To</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Role</span>
                </div>
                {users.map((user, idx) => {
                  const style = ROLE_STYLE[user.role] ?? ROLE_STYLE.EMPLOYEE
                  return (
                    <div
                      key={user.id}
                      className={cn(
                        "group grid grid-cols-[1fr_1fr_120px_120px] gap-4 items-center px-5 py-4 transition-colors",
                        idx < users.length - 1 && "border-b border-gray-100",
                        idx % 2 === 0 ? "bg-white hover:bg-blue-50/40" : "bg-gray-50/40 hover:bg-blue-50/40"
                      )}
                    >
                      {/* Name + avatar */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0", avatarColor(user.name))}>
                          {initials(user.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">{user.name}</p>
                          {user.id === session?.user?.id && (
                            <span className="text-xs text-blue-500 font-medium">You</span>
                          )}
                        </div>
                      </div>

                      {/* Email */}
                      <p className="text-sm text-gray-500 truncate">{user.email}</p>

                      {/* Manager */}
                      <p className="text-sm text-gray-500 truncate">
                        {user.manager?.name ?? <span className="text-gray-300">—</span>}
                      </p>

                      {/* Role + actions */}
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full capitalize", style.pill)}>
                          {user.role.toLowerCase()}
                        </span>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button title="Edit" onClick={() => openEdit(user)}
                            className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button title="Send password" disabled={sendingPw === user.id} onClick={() => handleSendPassword(user)}
                            className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors">
                            <Send className="w-3.5 h-3.5" />
                          </button>
                          {user.id !== session?.user?.id && (
                            <button title="Delete" disabled={deleting === user.id} onClick={() => handleDelete(user)}
                              className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                <Plus className="w-4 h-4 text-blue-600" />
              </div>
              Add New User
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 pt-1">
            <FormFields />
            <p className="text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded-lg">
              A temporary password will be auto-generated and emailed to the user.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setShowCreate(false)} className="o-btn o-btn-sm">Cancel</button>
              <button type="submit" disabled={saving} className="o-btn o-btn-primary o-btn-sm">
                {saving ? "Creating…" : "Create User"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editUser} onOpenChange={o => !o && setEditUser(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                <Pencil className="w-4 h-4 text-amber-600" />
              </div>
              Edit — {editUser?.name}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4 pt-1">
            <FormFields />
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setEditUser(null)} className="o-btn o-btn-sm">Cancel</button>
              <button type="submit" disabled={saving} className="o-btn o-btn-primary o-btn-sm">
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
