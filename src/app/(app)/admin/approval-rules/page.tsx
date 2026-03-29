"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { Trash2, Plus, GripVertical, ShieldCheck, X, ChevronDown, ChevronUp } from "lucide-react"

interface User {
  id: string
  name: string
  role: string
  manager: { id: string; name: string } | null
}

interface ApproverRow {
  userId: string
  required: boolean
  stepOrder: number
}

interface ApprovalRule {
  id: string
  name: string
  description: string | null
  assignedUser: { id: string; name: string } | null
  manager: { id: string; name: string } | null
  isManagerApprover: boolean
  approversSequence: boolean
  minApprovalPercentage: number | null
  approvers: { id: string; user: { id: string; name: string }; required: boolean; stepOrder: number }[]
}

const EMPTY_FORM = {
  name: "", description: "", assignedUserId: "none", managerId: "none",
  isManagerApprover: false, approversSequence: false, minApprovalPercentage: "",
}

export default function ApprovalRulesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [users, setUsers]       = useState<User[]>([])
  const [rules, setRules]       = useState<ApprovalRule[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState({ ...EMPTY_FORM })
  const [approvers, setApprovers] = useState<ApproverRow[]>([])
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState("")

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
    if (status === "authenticated" && session.user.role !== "ADMIN") router.push("/dashboard")
  }, [status, session, router])

  useEffect(() => {
    Promise.all([
      fetch("/api/users").then(r => r.json()),
      fetch("/api/approval-rules").then(r => r.json()),
    ]).then(([u, r]) => {
      setUsers(Array.isArray(u) ? u : [])
      setRules(Array.isArray(r) ? r : [])
      setLoading(false)
    })
  }, [])

  const managers = users.filter(u => u.role === "MANAGER" || u.role === "ADMIN")

  function handleAssignedUserChange(userId: string) {
    const user = users.find(u => u.id === userId)
    setForm(f => ({ ...f, assignedUserId: userId, managerId: user?.manager?.id ?? f.managerId }))
  }

  function addApprover() {
    setApprovers(prev => [...prev, { userId: "", required: false, stepOrder: prev.length + 1 }])
  }

  function removeApprover(idx: number) {
    setApprovers(prev => prev.filter((_, i) => i !== idx).map((a, i) => ({ ...a, stepOrder: i + 1 })))
  }

  function updateApprover(idx: number, patch: Partial<ApproverRow>) {
    setApprovers(prev => prev.map((a, i) => i === idx ? { ...a, ...patch } : a))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError("")
    const res = await fetch("/api/approval-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        assignedUserId: form.assignedUserId === "none" ? null : form.assignedUserId,
        managerId: form.managerId === "none" ? null : form.managerId,
        minApprovalPercentage: form.minApprovalPercentage ? Number(form.minApprovalPercentage) : null,
        approvers: approvers.filter(a => a.userId),
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || "Failed to save"); setSaving(false); return }
    setRules(prev => [data, ...prev])
    setShowForm(false); setForm({ ...EMPTY_FORM }); setApprovers([])
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this approval rule?")) return
    await fetch(`/api/approval-rules?id=${id}`, { method: "DELETE" })
    setRules(prev => prev.filter(r => r.id !== id))
  }

  return (
    <div className="flex flex-col min-h-full">

      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-8 bg-white border-b border-gray-200 shrink-0" style={{ height: 52 }}>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-400 text-xs">Admin</span>
          <span className="text-gray-300">/</span>
          <span className="font-semibold text-gray-800">Approval Rules</span>
          <span className="text-gray-400 text-xs ml-1">{rules.length} rule{rules.length !== 1 ? "s" : ""}</span>
        </div>
        <button
          onClick={() => { setShowForm(true); setForm({ ...EMPTY_FORM }); setApprovers([]) }}
          className="o-btn o-btn-primary o-btn-sm"
        >
          <Plus className="w-4 h-4" /> New Rule
        </button>
      </div>

      <div className="flex-1 p-8 max-w-4xl space-y-6">

        {/* Page title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Approval Rules</h1>
            <p className="text-sm text-gray-500 mt-0.5">Define who approves expenses and in what order</p>
          </div>
        </div>

        {/* Create form */}
        {showForm && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="font-semibold text-gray-800">New Approval Rule</h2>
              <button onClick={() => { setShowForm(false); setForm({ ...EMPTY_FORM }); setApprovers([]) }}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-gray-700">Rule Name <span className="text-red-500">*</span></Label>
                  <Input placeholder="e.g. Travel Expense Approval" value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })} required
                    className="h-9 border-gray-200 focus:border-blue-400" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-gray-700">Description</Label>
                  <Input placeholder="Optional description" value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    className="h-9 border-gray-200 focus:border-blue-400" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-gray-700">Assigned User</Label>
                  <Select value={form.assignedUserId} onValueChange={handleAssignedUserChange}>
                    <SelectTrigger className="h-9 border-gray-200"><SelectValue placeholder="Select user" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— None —</SelectItem>
                      {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-gray-700">Manager</Label>
                  <Select value={form.managerId} onValueChange={v => setForm({ ...form, managerId: v })}>
                    <SelectTrigger className="h-9 border-gray-200"><SelectValue placeholder="Select manager" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— None —</SelectItem>
                      {managers.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Approvers */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-gray-700">Approvers</Label>
                  <button type="button" onClick={addApprover}
                    className="o-btn o-btn-sm text-blue-600 border-blue-200 hover:bg-blue-50">
                    <Plus className="w-3.5 h-3.5" /> Add Approver
                  </button>
                </div>
                {approvers.length === 0 ? (
                  <p className="text-sm text-gray-400 py-2">No approvers added yet.</p>
                ) : (
                  <div className="space-y-2">
                    {approvers.map((a, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <span className="text-xs font-bold text-gray-400 w-5 text-center flex items-center gap-1">
                          <GripVertical className="w-3 h-3" />{idx + 1}
                        </span>
                        <Select value={a.userId} onValueChange={v => updateApprover(idx, { userId: v })}>
                          <SelectTrigger className="h-8 text-sm flex-1 border-gray-200"><SelectValue placeholder="Select user" /></SelectTrigger>
                          <SelectContent>
                            {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-2 shrink-0">
                          <Switch checked={a.required} onCheckedChange={(v: boolean) => updateApprover(idx, { required: v })} />
                          <span className="text-xs text-gray-500">Required</span>
                        </div>
                        <button type="button" onClick={() => removeApprover(idx)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <Switch checked={form.isManagerApprover} onCheckedChange={(v: boolean) => setForm({ ...form, isManagerApprover: v })} />
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Manager approves</p>
                    <p className="text-xs text-gray-400">Manager is first approver</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <Switch checked={form.approversSequence} onCheckedChange={(v: boolean) => setForm({ ...form, approversSequence: v })} />
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Sequential</p>
                    <p className="text-xs text-gray-400">Approve in order</p>
                  </div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-sm font-semibold text-gray-700 mb-1.5">Min approval %</p>
                  <div className="flex items-center gap-2">
                    <Input type="number" min={0} max={100} placeholder="e.g. 60"
                      value={form.minApprovalPercentage}
                      onChange={e => setForm({ ...form, minApprovalPercentage: e.target.value })}
                      className="h-8 w-20 text-sm border-gray-200" />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                </div>
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowForm(false); setForm({ ...EMPTY_FORM }); setApprovers([]) }}
                  className="o-btn o-btn-sm">Cancel</button>
                <button type="submit" disabled={saving} className="o-btn o-btn-primary o-btn-sm">
                  {saving ? "Saving…" : "Save Rule"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Rules list */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex items-center gap-3 text-gray-400">
              <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
              <span className="text-sm">Loading rules…</span>
            </div>
          </div>
        ) : rules.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-gray-400">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 opacity-40" />
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-gray-600">No approval rules yet</p>
              <p className="text-sm mt-1">Create a rule to define who approves expenses.</p>
            </div>
            <button onClick={() => setShowForm(true)} className="o-btn o-btn-primary o-btn-sm">
              <Plus className="w-4 h-4" /> New Rule
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {rules.map((rule, idx) => (
              <RuleCard key={rule.id} rule={rule} onDelete={handleDelete} defaultOpen={idx === 0} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function RuleCard({ rule, onDelete, defaultOpen }: { rule: ApprovalRule; onDelete: (id: string) => void; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false)

  const tags = [
    rule.assignedUser && { label: `User: ${rule.assignedUser.name}`, color: "bg-blue-100 text-blue-700" },
    rule.manager && { label: `Manager: ${rule.manager.name}`, color: "bg-amber-100 text-amber-700" },
    rule.isManagerApprover && { label: "Manager approves", color: "bg-violet-100 text-violet-700" },
    rule.approversSequence && { label: "Sequential", color: "bg-emerald-100 text-emerald-700" },
    rule.minApprovalPercentage && { label: `${rule.minApprovalPercentage}% required`, color: "bg-gray-100 text-gray-600" },
  ].filter(Boolean) as { label: string; color: string }[]

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 hover:shadow-sm transition-all">
      <div className="flex items-center justify-between px-5 py-4 cursor-pointer" onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm">{rule.name}</p>
            {rule.description && <p className="text-xs text-gray-500 truncate mt-0.5">{rule.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          <span className="text-xs text-gray-400">{rule.approvers.length} approver{rule.approvers.length !== 1 ? "s" : ""}</span>
          <button type="button" onClick={e => { e.stopPropagation(); onDelete(rule.id) }}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </div>

      {open && (
        <div className="px-5 pb-5 space-y-3 border-t border-gray-100">
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-3">
              {tags.map(t => (
                <span key={t.label} className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", t.color)}>{t.label}</span>
              ))}
            </div>
          )}
          {rule.approvers.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Approvers</p>
              <div className="flex flex-wrap gap-2">
                {rule.approvers.sort((a, b) => a.stepOrder - b.stepOrder).map((a, i) => (
                  <span key={a.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-700">
                    <span className="text-xs text-gray-400 font-bold">{i + 1}.</span>
                    {a.user.name}
                    {a.required && <span className="text-emerald-500 text-xs font-bold">✓</span>}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
