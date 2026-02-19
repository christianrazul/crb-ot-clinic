# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev              # Start dev server at localhost:3000

# Build & Production
npm run build            # Build for production
npm run start            # Run production build
npm run lint             # Run ESLint

# Database (Prisma)
npm run db:generate      # Generate Prisma client
npm run db:push          # Push schema to database (no migration)
npm run db:migrate       # Create and apply migrations
npm run db:seed          # Seed database (npx tsx prisma/seed.ts)
npm run db:studio        # Open Prisma Studio GUI
```

## Architecture

### Tech Stack
- **Next.js 14** with App Router (not Pages Router)
- **TypeScript**, **Tailwind CSS**, **Radix UI** (Shadcn/ui patterns)
- **Prisma** with PostgreSQL
- **NextAuth v5-beta** with JWT strategy (Credentials provider)
- **Zod** for validation, **React Hook Form** for forms

### Project Structure
```
/src
├── /app                    # App Router routes
│   ├── /(auth)/login       # Public login page
│   ├── /(dashboard)/...    # Protected routes (dashboard, clients, sessions, etc.)
│   └── /api/auth/[...nextauth]
├── /actions                # Server Actions (all data fetching/mutations)
├── /components
│   ├── /ui                 # Radix/Shadcn primitives
│   ├── /layout             # Header, Sidebar
│   └── /{feature}          # Feature-specific components
├── /lib
│   ├── /auth               # NextAuth config, permissions (RBAC)
│   ├── /db                 # Prisma client singleton
│   ├── /audit              # Audit logging utilities
│   └── /validations        # Zod schemas
└── /types                  # TypeScript declarations
```

### Data Fetching Pattern
All data operations use **Server Actions** (`"use server"`), not API routes:
```typescript
// Pattern in /src/actions/{domain}/index.ts
export async function createEntity(data: FormData) {
  const session = await auth();
  if (!hasPermission(session.user.role, "required_permission")) {
    return { error: "Unauthorized" };
  }
  const validated = schema.safeParse(data);
  // ... Prisma operation, audit log, revalidatePath()
  return { success: true, data };
}
```

Return type is standardized `ActionState`: `{ error?, success?, data? }`

### Authentication & Authorization
- **Middleware** (`/src/middleware.ts`): Route protection, redirects
- **RBAC** (`/src/lib/auth/permissions.ts`): 5 roles (owner, secretary, licensed_ot, unlicensed_ot, st) with 22 permissions
- Permission checks are inline in Server Actions via `hasPermission(role, permission)`
- JWT stores `id`, `role`, `primaryClinicId`

### Key Domain Models (Prisma)
- **Clinic**: Multi-tenant organization
- **User**: Staff with role-based access
- **Client**: Therapy recipients with primary/backup therapists
- **Session**: Appointments with status tracking
- **AttendanceLog**: Guardian presence tracking
- **AuditLog**: Compliance trail for all actions

### Component Patterns
- Dialog-based CRUD (create-client-dialog, edit-client-dialog)
- Feature-specific view components (attendance-view, schedule-view)
- Role-based navigation in Sidebar using `hasPermission()`

### Important Conventions
- Multi-tenant: All queries filter by `clinicId`
- Soft deletes: Use `isActive` boolean, never hard delete
- Audit logging: Call `createAuditLog()` for significant actions
- Cache invalidation: Use `revalidatePath()` after mutations
