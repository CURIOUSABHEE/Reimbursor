# Reimbursor - Expense Management System

A modern, multi-tenant expense management system built with Next.js 14, Prisma, and PostgreSQL. Designed for businesses to streamline employee expense submissions, approval workflows, and financial oversight.

## 🎯 Purpose

Reimbursor automates the expense reimbursement process by providing:

- **For Employees**: Easy expense submission with multi-currency support
- **For Managers**: Streamlined approval workflows with real-time notifications
- **For Admins**: Complete visibility and override capabilities across the organization

## 🏗️ Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | Next.js 14 (App Router), React 18, Tailwind CSS, shadcn/ui |
| Backend | Next.js API Routes, Prisma ORM |
| Database | PostgreSQL |
| Authentication | NextAuth.js (JWT Strategy) |
| Email | Nodemailer (SMTP) |
| Monitoring | Sentry |
| Validation | Zod |

## 👥 User Roles

| Role | Capabilities |
|------|--------------|
| **Employee** | Submit expenses, view own expense history, receive status notifications |
| **Manager** | Approve/reject team expenses, view pending approvals, see converted amounts |
| **Admin** | View all company expenses, override any approval, manage users, set currency |

## 📋 Features

### Authentication & Authorization

- [x] **User Registration** - Sign up with company creation
- [x] **Login/Logout** - Secure session-based authentication
- [x] **Password Reset** - Forgot/reset password via email
- [x] **Role-based Access** - Middleware-protected routes
- [x] **JWT Sessions** - Secure token-based authentication

### User Management

- [x] **Auto Company Creation** - New signup creates company automatically
- [x] **Role Assignment** - Assign Employee, Manager, or Admin roles
- [x] **Manager Relationships** - Link employees to managers
- [x] **User CRUD** - Create, read, update, delete users (Admin only)

### Expense Management

- [x] **Create Expense** - Submit with amount, category, description, date
- [x] **Multi-currency Support** - Submit in any currency with exchange rate
- [x] **Currency Conversion** - Automatic conversion to company base currency
- [x] **Expense Categories** - Travel, Meals, Accommodation, Transportation, Supplies, Equipment, Other
- [x] **Expense History** - View all submitted expenses with status
- [x] **Expense Details** - View individual expense with full information

### Approval Workflow

- [x] **Draft to Pending** - Submit expense for approval
- [x] **Approval Rules** - Configurable rules based on amount thresholds
- [x] **Multi-step Approvals** - Sequential approval chains
- [x] **Approve/Reject** - Managers can approve or reject expenses
- [x] **Approval Comments** - Include comments with decisions
- [x] **Workflow Progression** - Auto-advance when all approvers approve

### Admin Override

- [x] **View All Expenses** - See every expense in the company
- [x] **Force Approve/Reject** - Override any expense decision
- [x] **Override Comments** - Record reason for override
- [x] **Override Tracking** - Log who overrode and when

### Notifications System

- [x] **Real-time Notifications** - Bell icon with unread count
- [x] **Event-driven Architecture** - Centralized notification service
- [x] **Notification Types**:
  - `EXPENSE_SUBMITTED` - New expense submitted
  - `APPROVAL_REQUIRED` - Approval needed
  - `APPROVAL_ACTION` - Expense approved/rejected
  - `EXPENSE_APPROVED` - Fully approved
  - `EXPENSE_REJECTED` - Rejected with reason
- [x] **Idempotency** - No duplicate notifications
- [x] **Deep Linking** - Click to navigate to expense
- [x] **Mark as Read** - Individual or mark all

### Production Features

- [x] **Input Validation** - Zod schemas for all API endpoints
- [x] **Error Boundaries** - Graceful error handling
- [x] **Rate Limiting** - Prevent abuse
- [x] **Structured Logging** - Performance monitoring
- [x] **Sentry Integration** - Error tracking
- [x] **Database Indexing** - Optimized queries
- [x] **Query Optimization** - Parallel queries, N+1 prevention

## 📁 Project Structure

```
src/
├── app/
│   ├── (app)/                    # Protected routes (with navbar)
│   │   ├── admin/expenses/       # Admin expense management
│   │   ├── approvals/             # Manager approval page
│   │   ├── dashboard/            # User dashboard
│   │   ├── expenses/             # Expense list & detail
│   │   │   ├── [id]/           # Expense detail page
│   │   │   └── new/            # Create expense
│   │   ├── notifications/       # Notification center
│   │   └── layout.tsx          # App layout with navbar
│   ├── (auth)/                   # Public routes (no navbar)
│   │   ├── forgot-password/      # Password reset request
│   │   ├── login/              # Login page
│   │   ├── reset-password/      # Password reset form
│   │   ├── signup/             # Registration
│   │   └── layout.tsx          # Auth layout
│   ├── api/                     # API Routes
│   │   ├── auth/               # Auth endpoints
│   │   ├── approvals/           # Approval actions
│   │   ├── expenses/           # Expense CRUD & submit
│   │   ├── notifications/       # Notification management
│   │   ├── users/              # User management
│   │   └── countries/          # Country/currency data
│   ├── global-error.tsx        # Global error boundary
│   ├── layout.tsx              # Root layout
│   ├── page.tsx               # Root redirect
│   └── providers.tsx           # Session provider
├── components/
│   ├── ui/                     # shadcn/ui components
│   ├── Notifications.tsx       # Notification bell & list
│   ├── Navbar.tsx             # Navigation bar
│   └── ...
└── lib/
    ├── auth.ts                 # NextAuth configuration
    ├── dashboard.ts            # Dashboard data fetching
    ├── email.ts               # Email service
    ├── logger.ts               # Logging utilities
    ├── notifications/          # Notification system
    │   ├── eventDispatcher.ts  # Event handling
    │   ├── notificationService.ts
    │   └── index.ts
    ├── prisma.ts              # Prisma client
    ├── utils.ts               # Utility functions
    └── validations.ts        # Zod schemas
```

## 🔌 API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register new user & company |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password` | Reset password with token |

### Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List all company users |
| POST | `/api/users` | Create new user |
| GET | `/api/users/[id]` | Get user details |
| PATCH | `/api/users/[id]` | Update user (role, manager) |
| DELETE | `/api/users/[id]` | Delete user |

### Expenses

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/expenses` | List user's expenses |
| POST | `/api/expenses` | Create new expense |
| GET | `/api/expenses/[id]` | Get expense details |
| POST | `/api/expenses/[id]/submit` | Submit for approval |

### Approvals

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/approvals` | Get pending approvals |
| POST | `/api/approvals` | Approve or reject expense |

### Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | Get user notifications |
| PATCH | `/api/notifications` | Mark as read |

## 🗄️ Database Schema

### Models

- **Company** - Multi-tenant organization
- **User** - Employees with roles and manager relationships
- **Expense** - Expense claims with multi-currency support
- **ApprovalRule** - Configurable approval thresholds
- **ApprovalAction** - Individual approval decisions
- **Notification** - User notifications with idempotency
- **Receipt** - Attached receipt files
- **SendPasswordToken** - Password reset tokens

### Indexes

```prisma
@@index([employeeId, status])      // Expense
@@index([companyId, status])       // Expense
@@index([createdAt])              // Expense
@@index([userId, read])           // Notification
@@index([userId, createdAt])      // Notification
@@index([approverId, action])      // ApprovalAction
```

## 🔐 Environment Variables

```env
# Database
DATABASE_URL="postgresql://..."

# Auth
AUTH_SECRET="your-secret"
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"

# Email (SMTP)
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_USER="user"
SMTP_PASS="password"
EMAIL_FROM="noreply@example.com"

# Optional
DEFAULT_COUNTRY="United States"
NEXT_PUBLIC_SENTRY_DSN=""
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- SMTP server (optional)

### Installation

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Start development server
npm run dev
```

### Demo Users

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@demo.com | demo1234 |
| Manager | manager@demo.com | demo1234 |
| Employee | john@demo.com | demo1234 |
| Employee | jane@demo.com | demo1234 |

## 📈 Performance Optimizations

- **Parallel Queries** - Dashboard loads data with `Promise.all`
- **Database Indexes** - Optimized for common queries
- **Selective Fields** - Only fetch required data
- **Idempotent Operations** - Prevent duplicate processing
- **Event-driven Notifications** - Decoupled from business logic

## 🔒 Security Features

- Password hashing with bcrypt
- JWT session strategy
- Role-based middleware protection
- Input validation with Zod
- SQL injection prevention (Prisma)
- Rate limiting on API endpoints
