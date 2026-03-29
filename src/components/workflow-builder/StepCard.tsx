'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, X, AlertCircle } from 'lucide-react'
import { WorkflowStep, User } from './types'
import { RuleSelector, getRuleSummary } from './RuleSelector'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface StepCardProps {
  step: WorkflowStep
  stepNumber: number
  users: User[]
  onUpdate: (step: WorkflowStep) => void
  onDelete: () => void
  errors?: string[]
}

export function StepCard({
  step,
  stepNumber,
  users,
  onUpdate,
  onDelete,
  errors = [],
}: StepCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const specificApprover = step.specificApproverId
    ? users.find((u) => u.id === step.specificApproverId)
    : null

  const approverOptions = users.map((u) => ({ id: u.id, name: u.name }))

  const toggleApprover = (userId: string) => {
    const newApprovers = step.approvers.includes(userId)
      ? step.approvers.filter((id) => id !== userId)
      : [...step.approvers, userId]
    onUpdate({ ...step, approvers: newApprovers })
  }

  return (
    <div ref={setNodeRef} style={style} className="mb-4">
      <Card className="relative">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
              >
                <GripVertical className="w-5 h-5 text-muted-foreground" />
              </button>
              <CardTitle className="text-lg">Step {stepNumber}</CardTitle>
              <Badge variant="outline" className="ml-2">
                {step.approvers.length} approver{step.approvers.length !== 1 ? 's' : ''}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {errors.length > 0 && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg">
              <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
              <div className="text-sm text-destructive">
                {errors.map((error, i) => (
                  <div key={i}>{error}</div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Approvers</label>
            <div className="flex flex-wrap gap-2">
              {users.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => toggleApprover(user.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
                    step.approvers.includes(user.id)
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Avatar className="w-6 h-6">
                    <AvatarFallback className="text-xs">
                      {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{user.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Approval Rule</label>
            <RuleSelector
              value={step.ruleType}
              onChange={(ruleType) => onUpdate({ ...step, ruleType })}
              percent={step.percent}
              onPercentChange={(percent) => onUpdate({ ...step, percent })}
              specificApproverId={step.specificApproverId}
              onSpecificApproverChange={(specificApproverId) =>
                onUpdate({ ...step, specificApproverId })
              }
              users={approverOptions}
            />
          </div>
        </CardContent>

        <CardFooter className="pt-0">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">Rule: </span>
            {getRuleSummary(step.ruleType, step.percent, specificApprover?.name || null)}
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
