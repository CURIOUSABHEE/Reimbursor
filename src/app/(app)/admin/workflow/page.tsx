'use client'

import { useEffect, useState } from 'react'
import { StepBuilder, WorkflowStep, User } from '@/components/workflow-builder'
import { GitBranch, Info } from 'lucide-react'

export default function WorkflowBuilderPage() {
  const [steps, setSteps] = useState<WorkflowStep[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchWorkflow() {
      try {
        const [wfRes, usersRes] = await Promise.all([
          fetch('/api/workflow'),
          fetch('/api/users'),
        ])
        if (wfRes.ok) {
          const data = await wfRes.json()
          if (data.steps?.length > 0) {
            setSteps(data.steps.map((s: WorkflowStep) => ({ ...s, id: s.id || `step_${s.stepOrder}` })))
          }
        }
        if (usersRes.ok) {
          const usersData = await usersRes.json()
          setUsers((Array.isArray(usersData) ? usersData : []).filter((u) => u.role === 'MANAGER' || u.role === 'ADMIN'))
        }
      } catch (e) {
        console.error('Failed to fetch workflow:', e)
      } finally {
        setIsLoading(false)
      }
    }
    fetchWorkflow()
  }, [])

  const handleSave = async (workflowSteps: WorkflowStep[]) => {
    const res = await fetch('/api/workflow', {
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
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Failed to save workflow')
    }
    alert('Workflow saved successfully!')
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-8 bg-white border-b border-gray-200 shrink-0" style={{ height: 52 }}>
        <span className="text-gray-400 text-xs">Admin</span>
        <span className="text-gray-300">/</span>
        <span className="font-semibold text-gray-800 text-sm">Workflow</span>
      </div>

      <div className="flex-1 p-8 max-w-3xl space-y-6">

        {/* Page title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
            <GitBranch className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Approval Workflow</h1>
            <p className="text-sm text-gray-500 mt-0.5">Configure how expense approvals flow through your organization</p>
          </div>
        </div>

        {/* Info banner */}
        <div className="flex items-start gap-3 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          <p>Steps are executed in order. Each step can require one or multiple approvers before moving to the next.</p>
        </div>

        {/* Builder */}
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex items-center gap-3 text-gray-400">
              <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
              <span className="text-sm">Loading workflow...</span>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <StepBuilder users={users} onSave={handleSave} initialSteps={steps} />
          </div>
        )}
      </div>
    </div>
  )
}
