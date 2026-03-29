import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"
import { StepType } from "@prisma/client"

interface WorkflowStepInput {
  stepOrder: number
  approvers: string[]
  ruleType: "ALL" | "PERCENTAGE" | "SPECIFIC" | "HYBRID"
  percent: number
  specificApproverId: string | null
}

function mapRuleTypeToStepType(ruleType: string): StepType {
  switch (ruleType) {
    case "ALL":
      return StepType.SEQUENTIAL
    case "PERCENTAGE":
    case "HYBRID":
      return StepType.PARALLEL
    case "SPECIFIC":
      return StepType.ANY_ONE
    default:
      return StepType.SEQUENTIAL
  }
}

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const workflow = await prisma.approvalWorkflow.findFirst({
    where: {
      companyId: session.user.companyId,
      isActive: true,
    },
    include: {
      steps: {
        orderBy: { stepOrder: "asc" },
        include: {
          specificApprover: {
            select: { id: true, name: true },
          },
        },
      },
    },
  })

  if (!workflow) {
    return NextResponse.json({ steps: [] })
  }

  const steps = workflow.steps.map((step) => ({
    id: step.id,
    stepOrder: step.stepOrder,
    name: step.name,
    approvers: [], 
    ruleType: step.type === StepType.SEQUENTIAL 
      ? "ALL" 
      : step.type === StepType.ANY_ONE 
        ? "SPECIFIC" 
        : "PERCENTAGE",
    percent: step.minApprovalPercent,
    specificApproverId: step.specificApproverId,
  }))

  return NextResponse.json({ workflowId: workflow.id, workflowName: workflow.name, steps })
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { workflowName, steps } = body as { workflowName: string; steps: WorkflowStepInput[] }

    if (!steps || steps.length === 0) {
      return NextResponse.json(
        { error: "At least one step is required" },
        { status: 400 }
      )
    }

    for (const step of steps) {
      if (!step.approvers || step.approvers.length === 0) {
        return NextResponse.json(
          { error: `Step ${step.stepOrder}: At least one approver is required` },
          { status: 400 }
        )
      }

      if ((step.ruleType === "PERCENTAGE" || step.ruleType === "HYBRID") && (step.percent < 1 || step.percent > 100)) {
        return NextResponse.json(
          { error: `Step ${step.stepOrder}: Percentage must be between 1 and 100` },
          { status: 400 }
        )
      }

      if ((step.ruleType === "SPECIFIC" || step.ruleType === "HYBRID") && !step.specificApproverId) {
        return NextResponse.json(
          { error: `Step ${step.stepOrder}: Specific approver is required` },
          { status: 400 }
        )
      }
    }

    const companyId = session.user.companyId

    await prisma.$transaction(async (tx) => {
      const existingWorkflow = await tx.approvalWorkflow.findFirst({
        where: { companyId, isActive: true },
      })

      if (existingWorkflow) {
        await tx.approvalStep.deleteMany({
          where: { workflowId: existingWorkflow.id },
        })
        await tx.approvalWorkflow.delete({
          where: { id: existingWorkflow.id },
        })
      }

      const workflow = await tx.approvalWorkflow.create({
        data: {
          companyId,
          name: workflowName || "Default Approval Workflow",
          isActive: true,
        },
      })

      for (const step of steps) {
        await tx.approvalStep.create({
          data: {
            workflowId: workflow.id,
            stepOrder: step.stepOrder,
            name: `Step ${step.stepOrder}`,
            type: mapRuleTypeToStepType(step.ruleType),
            minApprovalPercent: step.percent,
            specificApproverId: step.specificApproverId,
            autoComplete: false,
          },
        })
      }
    })

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error("Save workflow error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
