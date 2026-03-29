"use client"

import { cn } from "@/lib/utils"
import { Check, X, Clock, FileText } from "lucide-react"

export interface TimelineEvent {
  id: string
  type: "submitted" | "approved" | "rejected" | "pending" | "info"
  title: string
  description?: string
  timestamp: string
  user?: {
    name: string
    role?: string
  }
}

interface TimelineProps {
  events: TimelineEvent[]
  className?: string
}

const eventConfig = {
  submitted: {
    icon: FileText,
    color: "text-blue-600 bg-blue-100",
    dotColor: "bg-blue-500",
  },
  approved: {
    icon: Check,
    color: "text-emerald-600 bg-emerald-100",
    dotColor: "bg-emerald-500",
  },
  rejected: {
    icon: X,
    color: "text-red-600 bg-red-100",
    dotColor: "bg-red-500",
  },
  pending: {
    icon: Clock,
    color: "text-amber-600 bg-amber-100",
    dotColor: "bg-amber-500",
  },
  info: {
    icon: FileText,
    color: "text-gray-600 bg-gray-100",
    dotColor: "bg-gray-500",
  },
}

export function Timeline({ events, className }: TimelineProps) {
  return (
    <div className={cn("relative", className)}>
      <div className="absolute left-5 top-0 bottom-0 w-px bg-border/50" />
      <div className="space-y-6">
        {events.map((event, index) => {
          const config = eventConfig[event.type]
          const Icon = config.icon
          const isLast = index === events.length - 1
          
          return (
            <div key={event.id} className="relative flex gap-4">
              <div className={cn(
                "relative z-10 flex items-center justify-center w-10 h-10 rounded-full",
                config.color
              )}>
                <Icon className="w-5 h-5" />
              </div>
              <div className={cn(
                "flex-1 pb-6",
                isLast ? "" : "border-b border-border/30"
              )}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">{event.title}</p>
                    {event.description && (
                      <p className="text-sm text-muted-foreground mt-0.5">{event.description}</p>
                    )}
                    {event.user && (
                      <p className="text-xs text-muted-foreground mt-1">
                        by {event.user.name}
                        {event.user.role && (
                          <span className="ml-1 text-muted-foreground/70">
                            ({event.user.role.toLowerCase()})
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatTimestamp(event.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function ApprovalFlowTimeline({ 
  currentStatus, 
  approverName 
}: { 
  currentStatus: string
  approverName?: string 
}) {
  const steps = [
    { key: "draft", label: "Draft Created" },
    { key: "pending", label: "Pending Approval", approver: approverName },
    { key: "final", label: currentStatus === "APPROVED" ? "Approved" : currentStatus === "REJECTED" ? "Rejected" : "Final" },
  ]

  const getStepState = (stepKey: string) => {
    const statusOrder = ["DRAFT", "PENDING", "APPROVED", "REJECTED"]
    const currentIndex = statusOrder.indexOf(currentStatus)
    const stepIndex = statusOrder.findIndex((_, i) => {
      const stepKeys = ["draft", "pending", "final"]
      return stepKeys[i] === stepKey
    })
    
    if (currentIndex >= stepIndex) {
      if (currentStatus === "APPROVED" && (stepKey === "pending" || stepKey === "final")) return "completed"
      if (currentStatus === "REJECTED" && stepKey === "final") return "rejected"
      if (stepKey === "draft" || (currentStatus !== "REJECTED" && stepKey === "pending") || (currentStatus !== "REJECTED" && stepKey === "final" && currentStatus === "APPROVED")) return "completed"
    }
    if (stepIndex === currentIndex || (stepKey === "pending" && currentStatus === "PENDING")) return "active"
    return "pending"
  }

  return (
    <div className="flex items-center justify-between">
      {steps.map((step, index) => {
        const state = getStepState(step.key)
        const isLast = index === steps.length - 1
        
        return (
          <div key={step.key} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                state === "completed" && "bg-emerald-500 text-white",
                state === "rejected" && "bg-red-500 text-white",
                state === "active" && "bg-primary text-white ring-4 ring-primary/20",
                state === "pending" && "bg-surface-highest text-muted-foreground"
              )}>
                {state === "completed" ? (
                  <Check className="w-5 h-5" />
                ) : state === "rejected" ? (
                  <X className="w-5 h-5" />
                ) : state === "active" ? (
                  <Clock className="w-5 h-5" />
                ) : (
                  <span className="text-sm font-semibold">{index + 1}</span>
                )}
              </div>
              <span className={cn(
                "mt-2 text-xs font-medium text-center",
                state === "pending" ? "text-muted-foreground" : "text-foreground"
              )}>
                {step.label}
              </span>
              {step.approver && (
                <span className="text-xs text-muted-foreground mt-0.5">
                  {step.approver}
                </span>
              )}
            </div>
            {!isLast && (
              <div className={cn(
                "flex-1 h-0.5 mx-4",
                state === "completed" ? "bg-emerald-500" : "bg-surface-highest"
              )} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}
