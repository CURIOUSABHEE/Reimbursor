
# AGENTS.md
This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Existing guidance files
- `README.md` exists and is the primary project guide.
- No `WARP.md`, `CLAUDE.md`, `.cursorrules`, `.cursor/rules/*`, or `.github/copilot-instructions.md` were found.

## Development commands
- Install dependencies: `npm install`
- Start dev server: `npm run dev`
- Build production app: `npm run build`
- Start production server: `npm run start`
- Lint: `npm run lint`
- Type-check (no npm script yet): `npx tsc --noEmit`

## Database and Prisma commands
- Generate Prisma client: `npx prisma generate`
- Apply schema to DB (project currently uses this flow in README): `npx prisma db push`
- Open Prisma Studio: `npx prisma studio`

## Tests
- There is currently no test script in `package.json` and no committed `*.test.*` / `*.spec.*` files.
- Running a single test is not available until a test runner is added.

## Runtime architecture (big picture)
- Framework: Next.js 14 App Router with route groups:
  - `src/app/(auth)` for public auth pages
  - `src/app/(app)` for authenticated product pages
  - `src/app/api/*` for server endpoints
- Authentication/authorization:
  - NextAuth credentials-based JWT sessions (`src/lib/auth.ts`)
  - Route protection and role gating in `src/middleware.ts` (notably `/admin` and `/approvals`)
  - Session is provided client-side via `src/app/providers.tsx`
- Data layer:
  - Prisma + PostgreSQL (`prisma/schema.prisma`, `src/lib/prisma.ts`)
  - Multi-tenant boundary is `companyId` and should be preserved in queries/mutations
- Core business flow:
  - Expenses are created as `DRAFT` (`src/app/api/expenses/route.ts`)
  - Submission endpoint (`src/app/api/expenses/[id]/submit/route.ts`) instantiates workflow state via `WorkflowEngine`
  - Approval actions endpoint (`src/app/api/approvals/route.ts`) delegates decision logic to `WorkflowEngine.handleApprovalAction`
  - Admin override path is implemented as a server action (`src/app/actions/adminOverride.ts`)

## Approval system details to understand before edits
- Active approval execution is implemented with:
  - `ApprovalWorkflow` + `ApprovalStep` + `ApprovalAction`
  - orchestration in `src/lib/workflow/engine.ts`
- There is also a separate `ApprovalRule` / `ApprovalRuleApprover` model and `/api/approval-rules` admin UI flow.
- Treat these as distinct systems: workflow execution currently depends on `ApprovalWorkflow`/`ApprovalStep`, not `ApprovalRule`.

## Notifications architecture
- Notifications are event-driven through:
  - event registry + emitter (`src/lib/notifications/eventDispatcher.ts`)
  - handlers + persistence (`src/lib/notifications/notificationService.ts`)
- Expense submission and approval endpoints initialize handlers and emit domain events.
- Notification idempotency keys are important; preserve them when modifying event behavior.

## Validation and API conventions
- Request payload validation uses Zod schemas in `src/lib/validations.ts`.
- Most endpoints return `NextResponse.json(...)` with explicit status codes; maintain this style.
- For auth-protected APIs, pattern is `getServerSession(authOptions)` followed by role checks.

## Practical entry points when debugging
- Auth/session issues: `src/lib/auth.ts`, `src/middleware.ts`, `src/app/api/auth/[...nextauth]/route.ts`
- Expense lifecycle: `src/app/api/expenses/route.ts`, `src/app/api/expenses/[id]/submit/route.ts`, `src/app/api/approvals/route.ts`
- Workflow logic: `src/lib/workflow/engine.ts`
- Notifications: `src/lib/notifications/*`
- Admin controls: `src/app/(app)/admin/*`, `src/app/actions/adminOverride.ts`
