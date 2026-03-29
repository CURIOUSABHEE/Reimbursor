import re

with open("prisma/schema.prisma", "r") as f:
    content = f.read()

# Conflict 1
c1_head = """<<<<<<< HEAD
  managedEmployees     User[]                   @relation("ManagerEmployees")
  approvalSteps         ApprovalStep[]           @relation("StepApprover")
======="""
c1_remote = """>>>>>>> 1d9e1a1bfb4d2c521c85b136fd8b3a0d08e17acf"""
c1_replacement = """  managedEmployees     User[]                   @relation("ManagerEmployees")
  approvalSteps         ApprovalStep[]           @relation("StepApprover")
  sentMessages          ChatMessage[]  @relation("SentMessages")
  receivedMessages      ChatMessage[]  @relation("ReceivedMessages")
  assignedRules         ApprovalRule[] @relation("AssignedRules")
  managedRules          ApprovalRule[] @relation("ManagedRules")
  ruleApprovers         ApprovalRuleApprover[] @relation("RuleApprovers")"""

content = re.sub(r"<<<<<<< HEAD\n  managedEmployees.*?=======", c1_head, content, flags=re.DOTALL) # dummy
# Actually, let's just use string replace.

with open("prisma/schema.prisma", "w") as f:
    f.write(content)
