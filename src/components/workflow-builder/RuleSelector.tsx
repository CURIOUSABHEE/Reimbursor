'use client'

import { RuleType } from './types'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface RuleSelectorProps {
  value: RuleType
  onChange: (value: RuleType) => void
  percent: number
  onPercentChange: (value: number) => void
  specificApproverId: string | null
  onSpecificApproverChange: (value: string | null) => void
  users: { id: string; name: string }[]
}

const ruleOptions: { value: RuleType; label: string; description: string }[] = [
  { value: 'ALL', label: 'All Must Approve', description: 'All selected approvers must approve' },
  { value: 'PERCENTAGE', label: 'Percentage-based', description: 'Minimum % of approvers must approve' },
  { value: 'SPECIFIC', label: 'Specific Approver', description: 'One specific person must approve' },
  { value: 'HYBRID', label: 'Hybrid', description: 'Percentage OR specific approver' },
]

export function RuleSelector({
  value,
  onChange,
  percent,
  onPercentChange,
  specificApproverId,
  onSpecificApproverChange,
  users,
}: RuleSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {ruleOptions.map((rule) => (
          <button
            key={rule.value}
            type="button"
            onClick={() => onChange(rule.value)}
            className={`p-3 rounded-lg border-2 text-left transition-all ${
              value === rule.value
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <div className="font-medium text-sm">{rule.label}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{rule.description}</div>
          </button>
        ))}
      </div>

      {(value === 'PERCENTAGE' || value === 'HYBRID') && (
        <div className="space-y-2">
          <Label htmlFor="percent" className="text-sm">
            Minimum Approval Percentage
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="percent"
              type="number"
              min={1}
              max={100}
              value={percent}
              onChange={(e) => onPercentChange(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
              className="w-24"
            />
            <span className="text-muted-foreground text-sm">%</span>
          </div>
        </div>
      )}

      {(value === 'SPECIFIC' || value === 'HYBRID') && (
        <div className="space-y-2">
          <Label htmlFor="specificApprover" className="text-sm">
            Specific Approver
          </Label>
          <select
            id="specificApprover"
            value={specificApproverId || ''}
            onChange={(e) => onSpecificApproverChange(e.target.value || null)}
            className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Select an approver...</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}

export function getRuleSummary(
  ruleType: RuleType,
  percent: number,
  specificApproverName: string | null
): string {
  switch (ruleType) {
    case 'ALL':
      return 'All approvers must approve'
    case 'PERCENTAGE':
      return `${percent}% of approvers must approve`
    case 'SPECIFIC':
      return specificApproverName
        ? `${specificApproverName} must approve`
        : 'Select an approver'
    case 'HYBRID':
      if (specificApproverName) {
        return `${percent}% OR ${specificApproverName}`
      }
      return `${percent}% approval required`
    default:
      return ''
  }
}
