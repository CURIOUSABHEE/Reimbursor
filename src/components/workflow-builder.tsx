"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Trash2, GripVertical, Save, ChevronDown, ChevronUp, Info } from "lucide-react"
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

const RULE_TYPE_LABELS: Record<WorkflowStep["ruleType"], string> = {
  ALL:        "All must approve (sequential)",
  PERCENTAGE: "Percentage threshold",
  SPECIFIC:   "Specific approver required",
  HYBRID:     "Percentage OR specific approver",
}

const RULE_TYPE_DESCRIPTIONS: Record<WorkflowStep["ruleType"], string> = {
  ALL:        "Every approver in this step must approve before moving forward.",
  PERCENTAGE: "A minimum percentage of approvers must approve (e.g. 60%).",
  SPECIFIC:   "The step completes as soon as the designated approver acts.",
  HYBRID:     "Step completes if the percentage threshold is met OR the specific approver approves.",
}

function emptyStep(order: number): WorkflowStep {
  return {
    id: `step_${Date.now()}_${order}`,
    stepOrder: order,
    approvers: [],
    ruleType: "ALL",
    percent: 100,
    specificApproverId: null,
  }
}

export function StepBuilder({ users, initialSteps = [], onSave }: StepBuilderProps) {
  const [steps, setSteps] = useState<WorkflowStep[]>(
    initialSteps.length > 0 ? initialSteps : [emptyStep(1)]
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [expandedStep, setExpandedStep] = useState<string | null>(steps[0]?.id ?? null)

  function addStep() {
    const newStep = emptyStep(steps.length + 1)
    setSteps((prev) => [...prev, newStep])
    setExpandedStep(newStep.id)
  }

  function removeStep(id: string) {
    setSteps((prev) =>
      prev
        .filter((s) => s.id !== id)
        .map((s, i) => ({ ...s, stepOrder: i + 1 }))
    )
  }

  function updateStep(id: string, patch: Partial<WorkflowStep>) {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }

  function addApprover(stepId: string, userId: string) {
    setSteps((prev) =>
      prev.map((s) =>
        s.id === stepId && !s.approvers.includes(userId)
          ? { ...s, approvers: [...s.approvers, userId] }
          : s
      )
    )
  }

  function removeApprover(stepId: string, userId: string) {
    setSteps((prev) =>
      prev.map((s) =>
        s.id === stepId
          ? { ...s, approvers: s.approvers.filter((a) => a !== userId) }
          : s
      )
    )
  }

  async function handleSave() {
    setError("")
    setSuccess(false)

    for (const step of steps) {
      if (step.approvers.length === 0) {
        setError(`Step ${step.stepOrder} needs at least one approver.`)
        return
      }
      if ((step.ruleType === "PERCENTAGE" || step.ruleType === "HYBRID") && (step.percent < 1 || step.percent > 100)) {
        setError(`Step ${step.stepOrder}: percentage must be 1–100.`)
        return
      }
      if ((step.ruleType === "SPECIFIC" || step.ruleType === "HYBRID") && !step.specificApproverId) {
        setError(`Step ${step.stepOrder}: select a specific approver.`)
        return
      }
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
    <div className="space-y-4">
      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step, idx) => {
          const isExpanded = expandedStep === step.id
          const approverUsers = step.approvers.map((id) => users.find((u) => u.id === id)).filter(Boolean) as User[]
          const availableUsers = users.filter((u) => !step.approvers.includes(u.id))

          return (
            <Card key={step.id} className="border-border/70 shadow-elevation-2">
              {/* Step header */}
              <button
                type="button"
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface transition-colors rounded-t-2xl"
                onClick={() => setExpandedStep(isExpanded ? null : step.id)}
              >
                <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <span className="font-medium text-sm">Step {step.stepOrder}</span>
                  <span className="text-xs text-muted-foreground hidden sm:block">
                    — {RULE_TYPE_LABELS[step.ruleType]}
                  </span>
                  {approverUsers.length > 0 && (
                    <div className="flex gap-1 ml-2 flex-wrap">
                      {approverUsers.slice(0, 3).map((u) => (
                        <span key={u.id} className="text-[10px] px-1.5 py-0.5 bg-muted rounded font-medium">
                          {u.name.split(" ")[0]}
                        </span>
                      ))}
                      {approverUsers.length > 3 && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground">
                          +{approverUsers.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {steps.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeStep(step.id) }}
                      className="h-6 w-6 flex items-center justify-center rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </button>

              {/* Step body */}
              {isExpanded && (
                <CardContent className="px-4 pb-4 pt-0 space-y-4 border-t border-border/50">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                    {/* Rule type */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Approval Rule</Label>
                      <Select
                        value={step.ruleType}
                        onValueChange={(v) => updateStep(step.id, { ruleType: v as WorkflowStep["ruleType"] })}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(RULE_TYPE_LABELS) as WorkflowStep["ruleType"][]).map((rt) => (
                            <SelectItem key={rt} value={rt}>{RULE_TYPE_LABELS[rt]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[11px] text-muted-foreground flex gap-1">
                        <Info className="w-3 h-3 mt-0.5 shrink-0" />
                        {RULE_TYPE_DESCRIPTIONS[step.ruleType]}
                      </p>
                    </div>

                    {/* Conditional fields */}
                    <div className="space-y-3">
                      {(step.ruleType === "PERCENTAGE" || step.ruleType === "HYBRID") && (
                        <div className="space-y-1.5">
                          <Label className="text-xs">Approval Threshold (%)</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min={1}
                              max={100}
                              value={step.percent}
                              onChange={(e) => updateStep(step.id, { percent: Number(e.target.value) })}
                              className="h-8 w-24 text-sm"
                            />
                            <span className="text-sm text-muted-foreground">%</span>
                          </div>
                        </div>
                      )}

                      {(step.ruleType === "SPECIFIC" || step.ruleType === "HYBRID") && (
                        <div className="space-y-1.5">
                          <Label className="text-xs">Specific Approver</Label>
                          <Select
                            value={step.specificApproverId ?? "none"}
                            onValueChange={(v) => updateStep(step.id, { specificApproverId: v === "none" ? null : v })}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue placeholder="Select approver" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">— None —</SelectItem>
                              {step.approvers.map((id) => {
                                const u = users.find((u) => u.id === id)
                                return u ? <SelectItem key={id} value={id}>{u.name}</SelectItem> : null
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Approvers */}
                  <div className="space-y-2">
                    <Label className="text-xs">Approvers in this step</Label>

                    {approverUsers.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {approverUsers.map((u) => (
                          <span
                            key={u.id}
                            className="inline-flex items-center gap-1.5 px-2 py-1 bg-primary/8 border border-primary/20 rounded-md text-xs font-medium"
                          >
                            <span className="w-4 h-4 rounded-full bg-primary/15 text-primary text-[9px] font-bold flex items-center justify-center">
                              {u.name[0]}
                            </span>
                            {u.name}
                            <span className="text-[10px] text-muted-foreground capitalize">({u.role.toLowerCase()})</span>
                            <button
                              type="button"
                              onClick={() => removeApprover(step.id, u.id)}
                              className="ml-0.5 text-muted-foreground hover:text-red-600 transition-colors"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {availableUsers.length > 0 && (
                      <Select onValueChange={(v) => addApprover(step.id, v)}>
                        <SelectTrigger className="h-8 text-sm w-full sm:w-64">
                          <SelectValue placeholder="+ Add approver" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableUsers.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name}
                              <span className={cn(
                                "ml-2 text-[10px] font-semibold px-1 py-0.5 rounded",
                                u.role === "ADMIN" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                              )}>
                                {u.role}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {approverUsers.length === 0 && (
                      <p className="text-[11px] text-destructive">At least one approver is required.</p>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      {/* Add step */}
      <button
        type="button"
        onClick={addStep}
        className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-border rounded-lg text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-surface transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add approval step
      </button>

      {/* Save */}
      <div className="flex items-center justify-between pt-2">
        <div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-emerald-600">Workflow saved successfully.</p>}
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="w-4 h-4" />
          {saving ? "Saving..." : "Save Workflow"}
        </Button>
      </div>
    </div>
  )
}
