'use client'

import { useEffect, useState } from 'react'
import { StepBuilder, WorkflowStep, User } from '@/components/workflow-builder'

const mockUsers: User[] = [
  { id: '1', name: 'John Manager', email: 'john@company.com', role: 'MANAGER' },
  { id: '2', name: 'Sarah Finance', email: 'sarah@company.com', role: 'MANAGER' },
  { id: '3', name: 'Mike Director', email: 'mike@company.com', role: 'ADMIN' },
  { id: '4', name: 'Lisa HR', email: 'lisa@company.com', role: 'MANAGER' },
]

export default function WorkflowBuilderPage() {
  const [steps, setSteps] = useState<WorkflowStep[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchWorkflow() {
      try {
        const response = await fetch('/api/workflow')
        if (response.ok) {
          const data = await response.json()
          if (data.steps && data.steps.length > 0) {
            setSteps(data.steps.map((s: WorkflowStep) => ({
              ...s,
              id: s.id || `step_${s.stepOrder}`,
            })))
          }
        }
      } catch (error) {
        console.error('Failed to fetch workflow:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchWorkflow()
  }, [])

  const handleSave = async (workflowSteps: WorkflowStep[]) => {
    const response = await fetch('/api/workflow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workflowName: 'Expense Approval Workflow',
        steps: workflowSteps.map((s) => ({
          stepOrder: s.stepOrder,
          approvers: s.approvers,
          ruleType: s.ruleType,
          percent: s.percent,
          specificApproverId: s.specificApproverId,
        })),
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to save workflow')
    }

    alert('Workflow saved successfully!')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Approval Workflow Builder</h1>
        <p className="text-muted-foreground mt-1">
          Configure how expense approvals flow through your organization
        </p>
      </div>

      <StepBuilder users={mockUsers} onSave={handleSave} initialSteps={steps} />
    </div>
  )
}
