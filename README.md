# Expenses Tracker

Multi-tenant SaaS-style expense management for teams. Organisations are isolated by `organizationId` on every query; access is enforced with membership and role checks.

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm

## Setup

1. **Clone and install**

   ```bash
   npm install
   ```

2. **Environment**

   Copy `.env.example` to `.env` and set:

   - `DATABASE_URL` — PostgreSQL connection string
   - `NEXTAUTH_SECRET` and/or `AUTH_SECRET` — long random string for JWT signing (Auth.js v5 reads either)
   - `NEXTAUTH_URL` — public app URL (e.g. `http://localhost:3000` in development)
   - `RECEIPT_STORAGE_PATH` — root directory for receipt files (defaults under `/var/data/...` if unset; ensure the process can write here)

3. **Database**

   ```bash
   npx prisma migrate dev --name init
   npm run db:seed
   ```

   Or without migrations during prototyping:

   ```bash
   npm run db:push
   npm run db:seed
   ```

4. **Run**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Seeded accounts

After `npm run db:seed`:

| Email            | Password     | Role in Acme |
| ---------------- | ------------ | ------------- |
| owner@test.com   | password123  | Owner         |
| member@test.com  | password123  | Member        |

Organisation: **Acme Inc**, slug `acme` — sign in and go to `/org/acme/dashboard`.

## Production (nginx + pm2)

- Build: `npm run build`
- Start: `npm run start` (or run via `pm2 start npm --name expenses-tracker -- start`)
- Set `NEXTAUTH_URL` to your public HTTPS URL
- Configure nginx `client_max_body_size` to at least **12M** for receipt uploads
- Ensure `RECEIPT_STORAGE_PATH` exists and is writable by the Node process

## Stack

Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Prisma, PostgreSQL, Auth.js v5 (credentials + bcrypt), Recharts, Sonner.

## V1 scope

Email delivery, billing, exports, and accounting integrations are intentionally out of scope.
