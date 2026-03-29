'use client'

import { useState, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Plus, ArrowRight, AlertTriangle, Save } from 'lucide-react'
import { WorkflowStep, User } from './types'
import { StepCard } from './StepCard'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface StepBuilderProps {
  users: User[]
  onSave: (steps: WorkflowStep[]) => Promise<void>
  initialSteps?: WorkflowStep[]
}

function generateId(): string {
  return `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

const defaultStep = (order: number): WorkflowStep => ({
  id: generateId(),
  stepOrder: order,
  name: `Step ${order}`,
  approvers: [],
  ruleType: 'ALL',
  percent: 100,
  specificApproverId: null,
})

export function StepBuilder({ users, onSave, initialSteps = [] }: StepBuilderProps) {
  const [steps, setSteps] = useState<WorkflowStep[]>(
    initialSteps.length > 0
      ? initialSteps
      : [defaultStep(1)]
  )
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setSteps((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id)
        const newIndex = items.findIndex((i) => i.id === over.id)
        const newSteps = arrayMove(items, oldIndex, newIndex)
        return newSteps.map((step, index) => ({
          ...step,
          stepOrder: index + 1,
          name: `Step ${index + 1}`,
        }))
      })
    }
  }

  const addStep = () => {
    setSteps([...steps, defaultStep(steps.length + 1)])
  }

  const deleteStep = (id: string) => {
    if (steps.length === 1) return
    const newSteps = steps.filter((s) => s.id !== id)
    setSteps(
      newSteps.map((step, index) => ({
        ...step,
        stepOrder: index + 1,
        name: `Step ${index + 1}`,
      }))
    )
  }

  const updateStep = (updatedStep: WorkflowStep) => {
    setSteps(steps.map((s) => (s.id === updatedStep.id ? updatedStep : s)))
  }

  const validateSteps = useCallback((): { valid: boolean; errors: Map<string, string[]> } => {
    const errors = new Map<string, string[]>()

    steps.forEach((step) => {
      const stepErrors: string[] = []

      if (step.approvers.length === 0) {
        stepErrors.push('At least one approver is required')
      }

      if ((step.ruleType === 'PERCENTAGE' || step.ruleType === 'HYBRID') && (step.percent < 1 || step.percent > 100)) {
        stepErrors.push('Percentage must be between 1 and 100')
      }

      if ((step.ruleType === 'SPECIFIC' || step.ruleType === 'HYBRID') && !step.specificApproverId) {
        stepErrors.push('Specific approver is required')
      }

      if (stepErrors.length > 0) {
        errors.set(step.id, stepErrors)
      }
    })

    return { valid: errors.size === 0, errors }
  }, [steps])

  const handleSave = async () => {
    const validation = validateSteps()
    if (!validation.valid) {
      return
    }

    setIsSaving(true)
    setSaveError(null)

    try {
      const stepsToSave = steps.map((step, index) => ({
        ...step,
        stepOrder: index + 1,
      }))
      await onSave(stepsToSave)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save workflow')
    } finally {
      setIsSaving(false)
    }
  }

  const validation = validateSteps()

  const getStepErrors = (stepId: string): string[] => {
    return validation.errors.get(stepId) || []
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Approval Workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Configure the approval steps for expense submissions
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={addStep}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Step
                </Button>
              </div>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={steps.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                {steps.map((step, index) => (
                  <StepCard
                    key={step.id}
                    step={step}
                    stepNumber={index + 1}
                    users={users}
                    onUpdate={updateStep}
                    onDelete={() => deleteStep(step.id)}
                    errors={getStepErrors(step.id)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Workflow Preview</CardTitle>
        </CardHeader>
        <CardContent>
          {steps.length === 0 ? (
            <p className="text-sm text-muted-foreground">No steps configured</p>
          ) : (
            <div className="flex items-center flex-wrap gap-2">
              {steps.map((step, index) => {
                const approvers = users.filter((u) => step.approvers.includes(u.id))
                const names = approvers.map((a) => a.name).join(', ')
                return (
                  <div key={step.id} className="flex items-center gap-2">
                    <Badge variant="secondary" className="px-3 py-1">
                      {names || 'No approvers'}
                    </Badge>
                    {index < steps.length - 1 && (
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {saveError && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-destructive" />
          <span className="text-sm text-destructive">{saveError}</span>
        </div>
      )}

      <div className="flex justify-end gap-3">
        <Button
          onClick={handleSave}
          disabled={isSaving || steps.length === 0}
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Workflow'}
        </Button>
      </div>
    </div>
  )
}
