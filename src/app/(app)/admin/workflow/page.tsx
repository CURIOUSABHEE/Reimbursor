'use client'

import { useEffect, useState } from 'react'
import { StepBuilder, WorkflowStep, User } from '@/components/workflow-builder'

export default function WorkflowBuilderPage() {
  const [steps, setSteps] = useState<WorkflowStep[]>([])
  const [users, setUsers] = useState<User[]>([])
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

        const usersResponse = await fetch('/api/users')
        if (usersResponse.ok) {
          const usersData = await usersResponse.json()
          setUsers(
            (Array.isArray(usersData) ? usersData : []).filter(
              (u) => u.role === 'MANAGER' || u.role === 'ADMIN'
            )
          )
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
        <div className="text-muted-foreground text-sm">Loading workflow...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="o-breadcrumb">
        <span className="text-gray-400 text-[12px]">Admin</span>
        <span className="text-gray-300 mx-1">/</span>
        <span className="text-[13px] font-semibold text-gray-800">Approval Workflow</span>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-6 max-w-3xl">
          <div>
            <h1 className="text-page-title">Approval Workflow</h1>
            <p className="text-body-muted mt-1">
              Configure how expense approvals flow through your organization.
            </p>
          </div>

          <StepBuilder users={users} onSave={handleSave} initialSteps={steps} />
        </div>
      </div>
    </div>
  )
}
