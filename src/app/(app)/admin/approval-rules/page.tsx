"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, Plus, GripVertical, ShieldCheck } from "lucide-react"

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
  name: "",
  description: "",
  assignedUserId: "none",
  managerId: "none",
  isManagerApprover: false,
  approversSequence: false,
  minApprovalPercentage: "",
}

export default function ApprovalRulesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [users, setUsers] = useState<User[]>([])
  const [rules, setRules] = useState<ApprovalRule[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [approvers, setApprovers] = useState<ApproverRow[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

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

  // When assignedUser changes, pre-fill manager from their record
  function handleAssignedUserChange(userId: string) {
    const user = users.find(u => u.id === userId)
    setForm(f => ({
      ...f,
      assignedUserId: userId,
      managerId: user?.manager?.id ?? f.managerId,
    }))
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
    setSaving(true)
    setError("")

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
    if (!res.ok) {
      setError(data.error || "Failed to save")
    } else {
      setRules(prev => [data, ...prev])
      setShowForm(false)
      setForm({ ...EMPTY_FORM })
      setApprovers([])
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this approval rule?")) return
    await fetch(`/api/approval-rules?id=${id}`, { method: "DELETE" })
    setRules(prev => prev.filter(r => r.id !== id))
  }

  const managers = users.filter(u => u.role === "MANAGER" || u.role === "ADMIN")

  return (
    <div className="flex flex-col h-full">
      <div className="o-breadcrumb">
        <span className="text-gray-400 text-[12px]">Admin</span>
        <span className="text-gray-300 mx-1">/</span>
        <span className="text-[13px] font-semibold text-gray-800">Approval Rules</span>
      </div>
      <div className="flex-1 overflow-auto p-4 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-page-title">Approval Rules</h1>
            <p className="text-body-muted mt-1">Define who approves expenses and in what order.</p>
          </div>
          <Button size="sm" onClick={() => setShowForm(true)} className="gap-1.5 shrink-0">
            <Plus className="h-4 w-4" /> New Rule
          </Button>
        </div>

      {/* Form */}
      {showForm && (
        <Card className="shadow-elevation-2 border-border/70">
          <CardContent className="p-6">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Left column */}
            <div className="space-y-4">
              <div className="space-y-1">
                <Label>User</Label>
                <Select value={form.assignedUserId} onValueChange={handleAssignedUserChange}>
                  <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Description about rules</Label>
                <Input
                  placeholder="Approval rule for miscellaneous expenses"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label>Manager</Label>
                <Select value={form.managerId} onValueChange={v => setForm({ ...form, managerId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select manager" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {managers.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Initially set from user record. Admin can change for this rule.
                </p>
              </div>

              <div className="space-y-1">
                <Label>Rule Name</Label>
                <Input
                  placeholder="e.g. Travel Expense Approval"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Right column — Approvers */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base">Approvers</Label>
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-normal">Is manager an approver?</Label>
                  <Switch
                    checked={form.isManagerApprover}
                    onCheckedChange={(v: boolean) => setForm({ ...form, isManagerApprover: v })}
                  />
                  {form.isManagerApprover && (
                    <p className="text-xs text-muted-foreground max-w-xs">
                      Approval request goes to manager first, before other approvers.
                    </p>
                  )}
                </div>
              </div>

              {/* Approver rows */}
              <div className="space-y-2">
                <div className="grid grid-cols-[24px_1fr_80px] gap-2 text-xs text-muted-foreground px-1">
                  <span />
                  <span>User</span>
                  <span className="text-center">Required</span>
                </div>
                {approvers.map((a, idx) => (
                  <div key={idx} className="grid grid-cols-[24px_1fr_80px_32px] gap-2 items-center">
                    <span className="text-muted-foreground text-xs flex items-center gap-1">
                      <GripVertical className="h-3 w-3" />{idx + 1}
                    </span>
                    <Select value={a.userId} onValueChange={v => updateApprover(idx, { userId: v })}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select user" /></SelectTrigger>
                      <SelectContent>
                        {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <div className="flex justify-center">
                      <Switch
                        checked={a.required}
                        onCheckedChange={(v: boolean) => updateApprover(idx, { required: v })}
                      />
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeApprover(idx)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addApprover} className="w-full">
                  <Plus className="h-3 w-3 mr-1" /> Add Approver
                </Button>
              </div>

              {/* Approvers Sequence */}
              <div className="border rounded-md p-3 space-y-2">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={form.approversSequence}
                    onCheckedChange={(v: boolean) => setForm({ ...form, approversSequence: v })}
                  />
                  <Label className="font-medium">Approvers Sequence</Label>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  If ticked, the sequence above matters — request goes to approver 1 first, then 2, etc.
                  If a required approver rejects, the expense is auto-rejected.
                  If not ticked, request is sent to all approvers simultaneously.
                </p>
              </div>

              {/* Min approval % */}
              <div className="space-y-1">
                <Label>Minimum Approval Percentage</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    placeholder="e.g. 60"
                    value={form.minApprovalPercentage}
                    onChange={e => setForm({ ...form, minApprovalPercentage: e.target.value })}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Percentage of approvers required to approve the request.
                </p>
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => { setShowForm(false); setForm({ ...EMPTY_FORM }); setApprovers([]) }}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Rule"}
            </Button>
          </div>
        </form>
        </CardContent>
        </Card>
      )}

      {/* Rules list */}
      {loading ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : rules.length === 0 ? (
        <Card className="shadow-elevation-2 border-border/70">
          <CardContent className="py-16 flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-surface flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold">No approval rules yet</p>
              <p className="text-sm text-muted-foreground mt-1">Create a rule to define who approves expenses.</p>
            </div>
            <Button size="sm" onClick={() => setShowForm(true)} className="gap-1.5 mt-1">
              <Plus className="h-4 w-4" /> New Rule
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rules.map(rule => (
            <Card key={rule.id} className="shadow-elevation-2 border-border/70 hover:shadow-elevation-3 transition-shadow duration-200">
              <CardContent className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold">{rule.name}</p>
                  {rule.description && <p className="text-sm text-muted-foreground mt-0.5">{rule.description}</p>}
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0" onClick={() => handleDelete(rule.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                {rule.assignedUser && (
                  <Badge variant="secondary">User: {rule.assignedUser.name}</Badge>
                )}
                {rule.manager && (
                  <Badge variant="secondary">Manager: {rule.manager.name}</Badge>
                )}
                {rule.isManagerApprover && (
                  <Badge variant="default">Manager approver</Badge>
                )}
                {rule.approversSequence && (
                  <Badge variant="default">Sequential</Badge>
                )}
                {rule.minApprovalPercentage && (
                  <Badge variant="secondary">{rule.minApprovalPercentage}% required</Badge>
                )}
              </div>
              {rule.approvers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {rule.approvers.map((a, i) => (
                    <span key={a.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-surface rounded-lg text-xs font-medium">
                      <span className="text-muted-foreground">{i + 1}.</span>
                      {a.user.name}
                      {a.required && <span className="text-emerald-600">✓</span>}
                    </span>
                  ))}
                </div>
              )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </div>
    </div>
  )
}
