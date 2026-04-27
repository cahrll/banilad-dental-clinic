# Banilad Dental Clinic

A dental practice management system for the Banilad Dental Clinic — built with Next.js 16, Prisma (MongoDB), Tailwind v4, and shadcn/ui (`radix-nova`). Custom server-side authentication, no third-party auth libraries.

> **Status:** Phase 1 (Foundation) — schema, custom auth, role-protected layouts, dashboard + portal shells, marketing landing. Business modules ship in subsequent phases.

## Stack

- **Next.js 16.2.4** (App Router, `proxy.ts` route gating, async `cookies()` / `params`)
- **React 19.2.4**
- **Prisma 6.19** with **MongoDB Atlas** connector (`prisma db push`, no migrations)
- **Tailwind CSS v4** + shadcn/ui (`radix-nova` style, `neutral` base, `lucide` icons)
- **TypeScript** strict, **zod 4** for validation, **bcryptjs** for password hashing

## Project structure

```
app/
  (auth)/login | register   sign-in / patient self-registration
  dashboard/                 staff portal (layout calls requireStaff)
  portal/                    patient portal (layout calls requirePatient)
  forbidden/                 role-denied landing
  page.tsx                   marketing landing
proxy.ts                     edge route gating (cookie presence only)
lib/
  db.ts                      Prisma client singleton
  auth/                      custom auth: password, tokens, sessions, cookies, guards, actions
components/
  ui/                        shadcn primitives
  app/                       composite components (sidebar nav, role badge, logout, …)
prisma/
  schema.prisma              full data model
  seed.ts                    one user per role with printed credentials
generated/prisma/            Prisma client output (gitignored)
```

## Setup

1. **Copy and fill in env vars**
   ```bash
   cp .env.example .env
   ```
   Update `DATABASE_URL` with your MongoDB Atlas connection string. Atlas does **not** include a database name in the path it gives you — you must add one (e.g. `/banilad_dental`) before the `?` for Prisma's MongoDB connector to accept it.

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Generate the Prisma client and push the schema**
   ```bash
   npm run db:generate
   npm run db:push
   ```

4. **Seed demo accounts**
   ```bash
   npm run db:seed
   ```
   The script prints credentials for each role at the end.

5. **Run the dev server**
   ```bash
   npm run dev
   ```

## Demo accounts (after `npm run db:seed`)

| Role         | Email                       | Password         |
|--------------|-----------------------------|------------------|
| Admin        | `admin@banilad.local`       | `Admin#12345`    |
| Dentist      | `dentist@banilad.local`     | `Dentist#12345`  |
| Receptionist | `reception@banilad.local`   | `Reception#12345`|
| Patient      | `patient@banilad.local`     | `Patient#12345`  |

Admin/Dentist/Receptionist land at `/dashboard`. Patient lands at `/portal`.

## Custom authentication

- Passwords hashed with **bcryptjs** (cost 12).
- Session token: 32 random bytes (`crypto.randomBytes`) hex-encoded. The **raw token** lives only in the `bdc_session` cookie (`httpOnly`, `secure` in prod, `SameSite=Lax`); the **SHA-256 hash** is what's stored in the `Session` collection.
- 7-day session lifetime. **Logout deletes the row** so the token is instantly revoked everywhere.
- `getCurrentUser()` in `lib/auth/current-user.ts` is wrapped in `React.cache` so multiple guards in the same render share one DB lookup.
- `requireUser`, `requireRole`, `requireStaff`, `requirePatient` (in `lib/auth/guards.ts`) enforce server-side. Use them in **layouts**, **pages**, **server actions**, and **route handlers** — never trust the client.
- `proxy.ts` does **optimistic** cookie-presence redirects only; real role enforcement is server-side.

> **Deferred:** rate-limiting, account lockout, and email verification are not in Phase 1. They go in a hardening pass before public deploy.

## Scripts

| Script                | What it does                                          |
|-----------------------|-------------------------------------------------------|
| `npm run dev`         | Next.js dev server (Turbopack)                        |
| `npm run build`       | Production build                                      |
| `npm run start`       | Production server                                     |
| `npm run lint`        | ESLint (`next build` no longer auto-lints in v16)     |
| `npm run db:generate` | Generate Prisma client into `generated/prisma/`       |
| `npm run db:push`     | Sync `prisma/schema.prisma` to MongoDB                |
| `npm run db:seed`     | Run `prisma/seed.ts` (also wired via `prisma db seed`)|

## Roadmap

- **Phase 1** ✅ Foundation — schema, auth, shells, marketing.
- **Phase 2** Patient management — list, create, detail (4 tabs), edit, soft-delete.
- **Phase 3** Appointments & scheduling — calendar, conflict detection, patient booking.
- **Phase 4** Treatments & dental chart — interactive tooth chart, history.
- **Phase 5** Billing — invoices from completed treatments, payments, balances.
- **Phase 6** Inventory — items, low-stock alerts, movement log.
- **Phase 7** Staff management (admin) — CRUD dentists/staff, role assignment.
- **Phase 8** Reports & polish — recharts dashboards, security review.
