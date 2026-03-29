"use client"

import { CheckCircle2, Clock, XCircle, Circle, User } from "lucide-react"
import { cn } from "@/lib/utils"

interface WorkflowStep {
  order: number
  name: string
  status: "ACTIVE" | "COMPLETED" | "PENDING"
  actions: Array<{
    approverId: string
    approverName: string
    action: "PENDING" | "APPROVED" | "REJECTED" | "SKIPPED"
    comment?: string
    actedAt?: string
  }>
}

interface WorkflowTimelineProps {
  steps: WorkflowStep[]
  currentStep: number
  totalSteps: number
}

export function WorkflowTimeline({ steps, currentStep, totalSteps }: WorkflowTimelineProps) {
  if (steps.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="w-4 h-4" />
        <span>No approval workflow configured</span>
      </div>
    )
  }

  const getStepIcon = (status: WorkflowStep["status"], actions: WorkflowStep["actions"]) => {
    const hasRejection = actions.some((a) => a.action === "REJECTED")

    if (status === "COMPLETED") {
      return hasRejection ? (
        <XCircle className="w-5 h-5 text-red-500" />
      ) : (
        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
      )
    }
    if (status === "ACTIVE") {
      return <Clock className="w-5 h-5 text-amber-500 animate-pulse" />
    }
    return <Circle className="w-5 h-5 text-gray-300" />
  }

  const getActionBadge = (action: WorkflowStep["actions"][0]["action"]) => {
    switch (action) {
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
            <CheckCircle2 className="w-3 h-3" />
            Approved
          </span>
        )
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded">
            <XCircle className="w-3 h-3" />
            Rejected
          </span>
        )
      case "SKIPPED":
        return (
          <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
            Skipped
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        )
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Approval Progress</span>
        <span className="text-muted-foreground">
          Step {currentStep + 1} of {totalSteps}
        </span>
      </div>
      
      <div className="relative">
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />
        
        <div className="space-y-6">
          {steps.map((step) => (
            <div key={step.order} className="relative flex gap-4">
              <div className="relative z-10 flex-shrink-0">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center bg-white border-2",
                  step.status === "ACTIVE" && "border-amber-400",
                  step.status === "COMPLETED" && "border-emerald-500",
                  step.status === "PENDING" && "border-gray-300"
                )}>
                  {getStepIcon(step.status, step.actions)}
                </div>
              </div>
              
              <div className="flex-1 pt-1">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "font-medium",
                    step.status === "ACTIVE" && "text-amber-600",
                    step.status === "COMPLETED" && "text-emerald-600",
                    step.status === "PENDING" && "text-gray-500"
                  )}>
                    {step.name}
                  </span>
                  {step.status === "ACTIVE" && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                      In Progress
                    </span>
                  )}
                </div>
                
                {step.actions.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {step.actions.map((action, actionIndex) => (
                      <div 
                        key={actionIndex}
                        className="flex items-center gap-3 text-sm bg-gray-50 p-2 rounded-lg"
                      >
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="flex-1">{action.approverName}</span>
                        {getActionBadge(action.action)}
                        {action.actedAt && (
                          <span className="text-xs text-gray-400">
                            {new Date(action.actedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    ))}
                    {step.actions.length > 1 && (
                      <div className="text-xs text-muted-foreground">
                        {step.actions.filter(a => a.action === "APPROVED").length} of {step.actions.length} approved
                      </div>
                    )}
                  </div>
                )}
                
                {step.status === "PENDING" && step.actions.length === 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Waiting for approvals...
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
