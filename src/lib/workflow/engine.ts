import { prisma } from "@/lib/prisma"
import { ActionStatus, StepType, ExpenseStatus } from "@prisma/client"

export interface WorkflowStep {
  id: string
  stepOrder: number
  name: string
  approverIds: string[]
  type: StepType
  minApprovalPercent: number
  specificApproverId: string | null
  approverRole: string | null
  autoComplete: boolean
}

export interface ApprovalActionInput {
  expenseId: string
  stepId: string
  approverId: string
  stepOrder: number
}

export interface StepEvaluationResult {
  stepComplete: boolean
  approved: boolean
  rejected: boolean
  approvalPercent: number
  approvedCount: number
  rejectedCount: number
  pendingCount: number
  skippedCount: number
  totalRequired: number
  specificApproverApproved: boolean
  shouldMoveToNext: boolean
  shouldTerminate: boolean
}

const IDEMPOTENCY_PREFIX = "approval_action"

export class WorkflowEngine {
  private expenseId: string
  private companyId: string

  constructor(expenseId: string, companyId: string) {
    this.expenseId = expenseId
    this.companyId = companyId
  }

  async createApprovalWorkflow(): Promise<{
    success: boolean
    error?: string
    workflowId?: string
  }> {
    try {
      const expense = await prisma.expense.findUnique({
        where: { id: this.expenseId },
        include: {
          employee: {
            include: {
              manager: true,
            },
          },
        },
      })

      if (!expense) {
        return { success: false, error: "Expense not found" }
      }

      if (expense.status !== ExpenseStatus.DRAFT) {
        return { success: false, error: "Expense is not in DRAFT status" }
      }

      const workflow = await prisma.approvalWorkflow.findFirst({
        where: {
          companyId: this.companyId,
          isActive: true,
        },
        include: {
          steps: {
            orderBy: { stepOrder: "asc" },
          },
        },
      })

      if (!workflow || workflow.steps.length === 0) {
        await prisma.expense.update({
          where: { id: this.expenseId },
          data: {
            status: ExpenseStatus.APPROVED,
            currentWorkflowStep: -1,
          },
        })
        return { success: true, workflowId: undefined }
      }

      const firstStepOrder = workflow.steps[0].stepOrder
      const createdActions = await this.createApprovalActionsForStep(workflow.steps[0], expense)

      if (createdActions.length === 0) {
        return {
          success: false,
          error: `No approvers resolved for workflow step ${firstStepOrder}`,
        }
      }

      await prisma.expense.update({
        where: { id: this.expenseId },
        data: {
          status: ExpenseStatus.PENDING,
          currentWorkflowStep: firstStepOrder,
        },
      })

      return { success: true, workflowId: workflow.id }
    } catch (error) {
      console.error("Error creating approval workflow:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  private async createApprovalActionsForStep(
    step: WorkflowStep,
    expense: {
      id: string
      employeeId: string
      companyId: string
    }
  ): Promise<ApprovalActionInput[]> {
    const approverIds: string[] = []
    if (step.approverIds?.length) {
      approverIds.push(...step.approverIds)
    } else if (step.specificApproverId) {
      approverIds.push(step.specificApproverId)
    } else if (step.approverRole) {
      const users = await prisma.user.findMany({
        where: {
          companyId: expense.companyId,
          role: step.approverRole as "ADMIN" | "MANAGER" | "EMPLOYEE",
        },
        select: { id: true },
      })
      approverIds.push(...users.map((u) => u.id))
    } else {
      const employee = await prisma.user.findUnique({
        where: { id: expense.employeeId },
        include: { manager: true },
      })

      if (employee?.managerId) {
        approverIds.push(employee.managerId)
      }
    }

    const actions: ApprovalActionInput[] = []
    const uniqueApproverIds = Array.from(new Set(approverIds))

    for (const approverId of uniqueApproverIds) {
      await prisma.approvalAction.create({
        data: {
          expenseId: this.expenseId,
          stepId: step.id,
          approverId,
          stepOrder: step.stepOrder,
          action: ActionStatus.PENDING,
        },
      })
      actions.push({
        expenseId: this.expenseId,
        stepId: step.id,
        approverId,
        stepOrder: step.stepOrder,
      })
    }

    return actions
  }

  async handleApprovalAction(
    approverId: string,
    action: "APPROVED" | "REJECTED",
    comment?: string
  ): Promise<{
    success: boolean
    error?: string
    stepComplete?: boolean
    expenseComplete?: boolean
    newStatus?: ExpenseStatus
  }> {
    const idempotencyKey = `${IDEMPOTENCY_PREFIX}:${this.expenseId}:${approverId}:${action}`

    const existingAction = await prisma.approvalAction.findFirst({
      where: {
        expenseId: this.expenseId,
        approverId,
        idempotencyKey,
      },
    })

    if (existingAction && existingAction.action !== ActionStatus.PENDING) {
      return {
        success: true,
        stepComplete: false,
        expenseComplete: false,
        error: "Action already processed (idempotent)",
      }
    }

    const approvalAction = await prisma.approvalAction.findFirst({
      where: {
        expenseId: this.expenseId,
        approverId,
        action: ActionStatus.PENDING,
      },
      include: {
        step: true,
      },
    })

    if (!approvalAction) {
      return { success: false, error: "No pending approval action found" }
    }

    await prisma.$transaction(async (tx) => {
      await tx.approvalAction.update({
        where: { id: approvalAction.id },
        data: {
          action: action === "APPROVED" ? ActionStatus.APPROVED : ActionStatus.REJECTED,
          comment,
          actedAt: new Date(),
          idempotencyKey,
        },
      })
    })

    const stepResult = await this.evaluateStep(approvalAction.stepOrder)

    if (stepResult.shouldTerminate) {
      await prisma.expense.update({
        where: { id: this.expenseId },
        data: { status: ExpenseStatus.REJECTED },
      })
      return {
        success: true,
        stepComplete: true,
        expenseComplete: true,
        newStatus: ExpenseStatus.REJECTED,
      }
    }

    if (stepResult.shouldMoveToNext) {
      const nextStepResult = await this.moveToNextStep()
      if (!nextStepResult.success) {
        return { success: false, error: nextStepResult.error || "Failed moving to next step" }
      }

      if (nextStepResult.expenseApproved) {
        return {
          success: true,
          stepComplete: true,
          expenseComplete: true,
          newStatus: ExpenseStatus.APPROVED,
        }
      }
      return {
        success: true,
        stepComplete: true,
        expenseComplete: false,
        newStatus: ExpenseStatus.PENDING,
      }
    }

    return {
      success: true,
      stepComplete: false,
      expenseComplete: false,
      newStatus: ExpenseStatus.PENDING,
    }
  }

  async evaluateStep(stepOrder: number): Promise<StepEvaluationResult> {
    const stepActions = await prisma.approvalAction.findMany({
      where: {
        expenseId: this.expenseId,
        stepOrder,
      },
      include: {
        step: {
          include: {
            specificApprover: {
              select: { id: true }
            }
          }
        },
      },
    })

    if (stepActions.length === 0) {
      return {
        stepComplete: false,
        approved: false,
        rejected: false,
        approvalPercent: 0,
        approvedCount: 0,
        rejectedCount: 0,
        pendingCount: 0,
        skippedCount: 0,
        totalRequired: 0,
        specificApproverApproved: false,
        shouldMoveToNext: false,
        shouldTerminate: false,
      }
    }

    const step = stepActions[0].step
    const total = stepActions.length
    const approvedCount = stepActions.filter(
      (a) => a.action === ActionStatus.APPROVED
    ).length
    const rejectedCount = stepActions.filter(
      (a) => a.action === ActionStatus.REJECTED
    ).length
    const skippedCount = stepActions.filter(
      (a) => a.action === ActionStatus.SKIPPED
    ).length
    const pendingCount = stepActions.filter(
      (a) => a.action === ActionStatus.PENDING
    ).length

    const activeCount = total - skippedCount
    const approvalPercent = activeCount > 0 ? (approvedCount / activeCount) * 100 : 0

    const specificApproverApproved =
      step?.specificApproverId &&
      stepActions.some(
        (a) =>
          a.approverId === step.specificApproverId &&
          a.action === ActionStatus.APPROVED
      )

    let shouldMoveToNext = false
    let shouldTerminate = false
    let stepComplete = false

    if (step?.type === StepType.ANY_ONE) {
      stepComplete = approvedCount >= 1 || rejectedCount >= 1
      shouldTerminate = rejectedCount >= 1
      shouldMoveToNext = approvedCount >= 1 && !shouldTerminate
    } else {
      const thresholdMet =
        approvalPercent >= (step?.minApprovalPercent || 100) ||
        specificApproverApproved === true

      stepComplete = pendingCount === 0
      shouldTerminate = rejectedCount > 0
      shouldMoveToNext = thresholdMet && !shouldTerminate
    }

    return {
      stepComplete,
      approved: approvedCount > 0,
      rejected: rejectedCount > 0,
      approvalPercent,
      approvedCount,
      rejectedCount,
      pendingCount,
      skippedCount,
      totalRequired: total,
      specificApproverApproved: specificApproverApproved || false,
      shouldMoveToNext,
      shouldTerminate,
    }
  }

  async moveToNextStep(): Promise<{
    success: boolean
    error?: string
    nextStepIndex?: number
    expenseApproved?: boolean
  }> {
    try {
      const expense = await prisma.expense.findUnique({
        where: { id: this.expenseId },
      })

      if (!expense) {
        return { success: false, error: "Expense not found" }
      }

      const currentStep = expense.currentWorkflowStep

      await prisma.approvalAction.updateMany({
        where: {
          expenseId: this.expenseId,
          stepOrder: currentStep,
          action: ActionStatus.PENDING,
        },
        data: {
          action: ActionStatus.SKIPPED,
          actedAt: new Date(),
        },
      })

      const workflow = await prisma.approvalWorkflow.findFirst({
        where: {
          companyId: this.companyId,
          isActive: true,
        },
        include: {
          steps: {
            where: {
              stepOrder: { gt: currentStep },
            },
            orderBy: { stepOrder: "asc" },
            take: 1,
          },
        },
      })

      if (!workflow || workflow.steps.length === 0) {
        await prisma.expense.update({
          where: { id: this.expenseId },
          data: {
            status: ExpenseStatus.APPROVED,
            currentWorkflowStep: -1,
          },
        })
        return { success: true, nextStepIndex: -1, expenseApproved: true }
      }

      const nextStep = workflow.steps[0]

      await this.createApprovalActionsForStep(nextStep, {
        id: expense.id,
        employeeId: expense.employeeId,
        companyId: expense.companyId,
      })

      await prisma.expense.update({
        where: { id: this.expenseId },
        data: {
          currentWorkflowStep: nextStep.stepOrder,
        },
      })

      return {
        success: true,
        nextStepIndex: nextStep.stepOrder,
        expenseApproved: false,
      }
    } catch (error) {
      console.error("Error moving to next step:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  async getWorkflowStatus(): Promise<{
    currentStep: number
    totalSteps: number
    steps: Array<{
      order: number
      name: string
      status: string
      actions: Array<{
        approverId: string
        approverName: string
        action: string
        comment?: string
        actedAt?: Date
      }>
    }>
  }> {
    const expense = await prisma.expense.findUnique({
      where: { id: this.expenseId },
    })

    if (!expense) {
      throw new Error("Expense not found")
    }

    const workflow = await prisma.approvalWorkflow.findFirst({
      where: {
        companyId: this.companyId,
        isActive: true,
      },
      include: {
        steps: {
          orderBy: { stepOrder: "asc" },
        },
      },
    })

    const actions = await prisma.approvalAction.findMany({
      where: { expenseId: this.expenseId },
      include: {
        approver: { select: { id: true, name: true } },
        step: { select: { name: true } },
      },
      orderBy: { stepOrder: "asc" },
    })

    const stepGroups = new Map<number, typeof actions>()
    for (const action of actions) {
      const existing = stepGroups.get(action.stepOrder) || []
      existing.push(action)
      stepGroups.set(action.stepOrder, existing)
    }

    const steps = Array.from(stepGroups.entries()).map(([order, stepActions]) => ({
      order,
      name: stepActions[0]?.step?.name || `Step ${order}`,
      status:
        order === expense.currentWorkflowStep
          ? "ACTIVE"
          : order < expense.currentWorkflowStep
          ? "COMPLETED"
          : "PENDING",
      actions: stepActions.map((a) => ({
        approverId: a.approver.id,
        approverName: a.approver.name,
        action: a.action,
        comment: a.comment || undefined,
        actedAt: a.actedAt || undefined,
      })),
    }))

    return {
      currentStep: expense.currentWorkflowStep,
      totalSteps: workflow?.steps.length || 0,
      steps,
    }
  }

  async skipStepForUser(userId: string): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      const action = await prisma.approvalAction.findFirst({
        where: {
          expenseId: this.expenseId,
          approverId: userId,
          action: ActionStatus.PENDING,
        },
      })

      if (!action) {
        return { success: false, error: "No pending action found for user" }
      }

      await prisma.approvalAction.update({
        where: { id: action.id },
        data: {
          action: ActionStatus.SKIPPED,
          actedAt: new Date(),
        },
      })

      const stepResult = await this.evaluateStep(action.stepOrder)

      if (stepResult.stepComplete && !stepResult.shouldTerminate) {
        await this.moveToNextStep()
      }

      return { success: true }
    } catch (error) {
      console.error("Error skipping step:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }
}

export async function createWorkflowEngine(
  expenseId: string,
  companyId: string
): Promise<WorkflowEngine> {
  return new WorkflowEngine(expenseId, companyId)
}

export async function getWorkflowForExpense(
  expenseId: string,
  companyId: string
): Promise<WorkflowEngine> {
  return new WorkflowEngine(expenseId, companyId)
}
