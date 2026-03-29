"use client"

import { useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Trash2, GripVertical, Save, ChevronDown, ChevronUp, Info, CheckCircle2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export interface User {
  id: string
  name: string
  role: string
}

export interface WorkflowStep {
  id: string
  stepOrder: number
  approvers: string[]
  ruleType: "ALL" | "PERCENTAGE" | "SPECIFIC" | "HYBRID"
  percent: number
  specificApproverId: string | null
}

interface StepBuilderProps {
  users: User[]
  initialSteps?: WorkflowStep[]
  onSave: (steps: WorkflowStep[]) => Promise<void>
}

const RULE_LABELS: Record<WorkflowStep["ruleType"], string> = {
  ALL:        "All must approve (sequential)",
  PERCENTAGE: "Percentage threshold",
  SPECIFIC:   "Specific approver required",
  HYBRID:     "Percentage OR specific approver",
}

const RULE_DESC: Record<WorkflowStep["ruleType"], string> = {
  ALL:        "Every approver in this step must approve before moving forward.",
  PERCENTAGE: "A minimum percentage of approvers must approve (e.g. 60%).",
  SPECIFIC:   "The step completes as soon as the designated approver acts.",
  HYBRID:     "Step completes if the percentage threshold is met OR the specific approver approves.",
}

const AVATAR_COLORS = ["bg-blue-500","bg-violet-500","bg-emerald-500","bg-amber-500","bg-rose-500","bg-cyan-500","bg-indigo-500"]
function avatarColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % AVATAR_COLORS.length
  return AVATAR_COLORS[h]
}

function emptyStep(order: number): WorkflowStep {
  return { id: `step_${Date.now()}_${order}`, stepOrder: order, approvers: [], ruleType: "ALL", percent: 100, specificApproverId: null }
}

export function StepBuilder({ users, initialSteps = [], onSave }: StepBuilderProps) {
  const [steps, setSteps]           = useState<WorkflowStep[]>(initialSteps.length > 0 ? initialSteps : [emptyStep(1)])
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState("")
  const [success, setSuccess]       = useState(false)
  const [expandedStep, setExpandedStep] = useState<string | null>(steps[0]?.id ?? null)

  function addStep() {
    const s = emptyStep(steps.length + 1)
    setSteps(prev => [...prev, s])
    setExpandedStep(s.id)
  }

  function removeStep(id: string) {
    setSteps(prev => prev.filter(s => s.id !== id).map((s, i) => ({ ...s, stepOrder: i + 1 })))
  }

  function updateStep(id: string, patch: Partial<WorkflowStep>) {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))
  }

  function addApprover(stepId: string, userId: string) {
    setSteps(prev => prev.map(s => s.id === stepId && !s.approvers.includes(userId) ? { ...s, approvers: [...s.approvers, userId] } : s))
  }

  function removeApprover(stepId: string, userId: string) {
    setSteps(prev => prev.map(s => s.id === stepId ? { ...s, approvers: s.approvers.filter(a => a !== userId) } : s))
  }

  async function handleSave() {
    setError(""); setSuccess(false)
    for (const step of steps) {
      if (step.approvers.length === 0) { setError(`Step ${step.stepOrder} needs at least one approver.`); return }
      if ((step.ruleType === "PERCENTAGE" || step.ruleType === "HYBRID") && (step.percent < 1 || step.percent > 100)) { setError(`Step ${step.stepOrder}: percentage must be 1–100.`); return }
      if ((step.ruleType === "SPECIFIC" || step.ruleType === "HYBRID") && !step.specificApproverId) { setError(`Step ${step.stepOrder}: select a specific approver.`); return }
    }
    setSaving(true)
    try {
      await onSave(steps)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 space-y-4">

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step, idx) => {
          const isExpanded = expandedStep === step.id
          const approverUsers = step.approvers.map(id => users.find(u => u.id === id)).filter(Boolean) as User[]
          const availableUsers = users.filter(u => !step.approvers.includes(u.id))
          const isValid = approverUsers.length > 0

          return (
            <div
              key={step.id}
              className={cn(
                "border rounded-xl overflow-hidden transition-all",
                isExpanded ? "border-blue-200 shadow-md" : "border-gray-200 bg-white hover:border-gray-300"
              )}
            >
              {/* Step header */}
              <button
                type="button"
                className={cn(
                  "w-full flex items-center gap-3 px-5 py-4 text-left transition-colors",
                  isExpanded ? "bg-blue-50/60" : "bg-white hover:bg-gray-50"
                )}
                onClick={() => setExpandedStep(isExpanded ? null : step.id)}
              >
                <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />

                {/* Step number badge */}
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0",
                  isExpanded ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
                )}>
                  {idx + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 text-sm">Step {step.stepOrder}</span>
                    <span className="text-xs text-gray-400 hidden sm:block">— {RULE_LABELS[step.ruleType]}</span>
                  </div>
                  {approverUsers.length > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      {approverUsers.slice(0, 4).map(u => (
                        <div key={u.id} title={u.name}
                          className={cn("w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold", avatarColor(u.name))}>
                          {u.name[0]}
                        </div>
                      ))}
                      {approverUsers.length > 4 && (
                        <span className="text-xs text-gray-400 ml-1">+{approverUsers.length - 4} more</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!isValid && <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-medium">Needs approver</span>}
                  {isValid && <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">✓ Ready</span>}
                  {steps.length > 1 && (
                    <button type="button" onClick={e => { e.stopPropagation(); removeStep(step.id) }}
                      className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </button>

              {/* Step body */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-4 space-y-5 bg-white border-t border-blue-100">

                  {/* Rule type */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-gray-700">Approval Rule</Label>
                      <Select value={step.ruleType} onValueChange={v => updateStep(step.id, { ruleType: v as WorkflowStep["ruleType"] })}>
                        <SelectTrigger className="h-9 border-gray-200 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(RULE_LABELS) as WorkflowStep["ruleType"][]).map(rt => (
                            <SelectItem key={rt} value={rt}>{RULE_LABELS[rt]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500 flex items-start gap-1.5">
                        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-blue-400" />
                        {RULE_DESC[step.ruleType]}
                      </p>
                    </div>

                    <div className="space-y-3">
                      {(step.ruleType === "PERCENTAGE" || step.ruleType === "HYBRID") && (
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-gray-700">Approval Threshold</Label>
                          <div className="flex items-center gap-2">
                            <Input type="number" min={1} max={100} value={step.percent}
                              onChange={e => updateStep(step.id, { percent: Number(e.target.value) })}
                              className="h-9 w-24 border-gray-200 text-sm" />
                            <span className="text-sm text-gray-500 font-medium">%</span>
                          </div>
                        </div>
                      )}
                      {(step.ruleType === "SPECIFIC" || step.ruleType === "HYBRID") && (
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-gray-700">Specific Approver</Label>
                          <Select value={step.specificApproverId ?? "none"} onValueChange={v => updateStep(step.id, { specificApproverId: v === "none" ? null : v })}>
                            <SelectTrigger className="h-9 border-gray-200 text-sm"><SelectValue placeholder="Select approver" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">— None —</SelectItem>
                              {step.approvers.map(id => {
                                const u = users.find(u => u.id === id)
                                return u ? <SelectItem key={id} value={id}>{u.name}</SelectItem> : null
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Approvers */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-gray-700">Approvers in this step</Label>

                    {approverUsers.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {approverUsers.map(u => (
                          <div key={u.id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                            <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0", avatarColor(u.name))}>
                              {u.name[0]}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-800 leading-none">{u.name}</p>
                              <p className="text-xs text-gray-400 capitalize mt-0.5">{u.role.toLowerCase()}</p>
                            </div>
                            <button type="button" onClick={() => removeApprover(step.id, u.id)}
                              className="ml-1 w-5 h-5 flex items-center justify-center rounded hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors">
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {availableUsers.length > 0 ? (
                      <Select onValueChange={v => addApprover(step.id, v)}>
                        <SelectTrigger className="h-9 border-gray-200 text-sm w-full sm:w-72">
                          <SelectValue placeholder="+ Add approver" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableUsers.map(u => (
                            <SelectItem key={u.id} value={u.id}>
                              <div className="flex items-center gap-2">
                                <div className={cn("w-5 h-5 rounded flex items-center justify-center text-white text-[10px] font-bold", avatarColor(u.name))}>
                                  {u.name[0]}
                                </div>
                                <span>{u.name}</span>
                                <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1",
                                  u.role === "ADMIN" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700")}>
                                  {u.role}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : approverUsers.length > 0 ? (
                      <p className="text-xs text-gray-400">All available approvers added.</p>
                    ) : null}

                    {approverUsers.length === 0 && (
                      <p className="text-xs text-amber-600 flex items-center gap-1.5 bg-amber-50 px-3 py-2 rounded-lg">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        At least one approver is required.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Add step */}
      <button type="button" onClick={addStep}
        className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm font-medium text-gray-400 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/40 transition-all">
        <Plus className="w-4 h-4" />
        Add approval step
      </button>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div>
          {error && (
            <p className="text-sm text-red-600 flex items-center gap-1.5 bg-red-50 px-3 py-2 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </p>
          )}
          {success && (
            <p className="text-sm text-emerald-600 flex items-center gap-1.5 bg-emerald-50 px-3 py-2 rounded-lg">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> Workflow saved successfully.
            </p>
          )}
        </div>
        <button onClick={handleSave} disabled={saving} className="o-btn o-btn-primary">
          <Save className="w-4 h-4" />
          {saving ? "Saving…" : "Save Workflow"}
        </button>
      </div>
    </div>
  )
}
