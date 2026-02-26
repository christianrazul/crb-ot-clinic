This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Database (Prisma)

### Commands

```bash
npm run db:generate   # Generate Prisma client after schema changes
npm run db:push       # Push schema to database (no migration file)
npm run db:migrate    # Create and apply a migration
npm run db:studio     # Open Prisma Studio GUI
npm run db:seed       # Seed the database
```

### db:push vs db:migrate

| Command | Use When | What It Does |
|---------|----------|--------------|
| `db:push` | Local development, prototyping | Syncs schema directly to DB without creating migration files. Can cause data loss on destructive changes. |
| `db:migrate` | Production-ready changes, team collaboration | Creates a versioned migration file in `prisma/migrations/`, then applies it. Safe, trackable, reversible. |

### Workflow

**Local development (solo prototyping):**
1. Edit `prisma/schema.prisma`
2. Run `npm run db:push`
3. Run `npm run db:generate` (if push doesn't auto-generate)

**Production-ready changes:**
1. Edit `prisma/schema.prisma`
2. Run `npm run db:migrate` — you'll be prompted to name the migration
3. Commit the migration file to version control
4. On deployment, migrations run automatically (or via `npx prisma migrate deploy`)

### When to use each

- **Use `db:push`** when you're iterating quickly on schema design and don't care about migration history yet
- **Use `db:migrate`** when the schema change is finalized and needs to be tracked/shared with the team or deployed to production

### Caution

- `db:push` can drop columns/tables if you remove them from the schema — back up data if needed
- Never use `db:push` in production; always use `db:migrate` or `migrate deploy`

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
