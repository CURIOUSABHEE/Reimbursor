export type RuleType = 'ALL' | 'PERCENTAGE' | 'SPECIFIC' | 'HYBRID'

export interface WorkflowStep {
  id: string
  stepOrder: number
  name: string
  approvers: string[]
  ruleType: RuleType
  percent: number
  specificApproverId: string | null
}

export interface User {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE'
}

export interface WorkflowStepFormData {
  stepOrder: number
  approvers: string[]
  ruleType: RuleType
  percent: number
  specificApproverId: string | null
}
