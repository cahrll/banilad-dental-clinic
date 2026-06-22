# Banilad Dental Clinic

A dental practice management system. Patients book visits and view records on a portal. Clinic staff run scheduling, treatments, billing, inventory, and reporting from a separate dashboard.

Built by Cahrl Louize Loyloy.

## Stack

Next.js 16 (App Router, Server Actions, Turbopack), React 19, TypeScript, Tailwind v4 with shadcn/ui, Prisma 6 against MongoDB Atlas, custom session auth with bcryptjs.

## Getting started

You need Node 20 or newer and a MongoDB cluster (Atlas, or local).

```bash
git clone https://github.com/18103864/banilad-dental-clinic.git
cd banilad-dental-clinic
npm install
cp .env.example .env
```

Set `DATABASE_URL` in `.env`. Atlas's copy-button connection string drops the database name, and Prisma's Mongo connector wants it. Wedge `/banilad_dental` between the host and the query string:

```
mongodb+srv://USER:PASSWORD@HOST.mongodb.net/banilad_dental?appName=BaniladDentalClinic
```

Then push the schema and start the dev server.

```bash
npm run db:push
npm run dev
```

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Production server |
| `npm run lint` | ESLint |
| `npm run db:generate` | Regenerate the Prisma client |
| `npm run db:push` | Sync schema.prisma to MongoDB |

## What's inside

Four roles: admin, dentist, receptionist, and patient. Each lands on its own routes, with server-side role guards re-checked on every page and action.

The **staff dashboard** has week and day calendars with conflict detection, patient records with an FDI dental chart and per-tooth condition history, treatment logging with multi-tooth select, a draft-to-paid invoice lifecycle, inventory with a movement log, staff CRUD with role-conditional profile fields, and revenue / appointments / top-procedure reports.

The **patient portal** has booking, cancellation, treatment history (read-only), and issued invoices (drafts hidden). The booking picker is shared with the staff side.

Sessions are MongoDB rows, so revoking access is a single delete. The Next.js proxy gates routes at the edge by checking cookie presence; real role enforcement happens in the page and action layers.

## Layout

```
app/
  (auth)/            login, register
  dashboard/         staff routes
  portal/            patient routes
  api/availability/  powers the booking picker
  page.tsx           landing

lib/
  auth/              sessions, guards, cookies, password, server actions
  availability.ts    clinic hours, conflict query, slot generation
  calendar-layout.ts greedy lane allocator
  actions/           server actions, one file per domain
  validators/        Zod schemas, one file per domain

components/
  ui/   shadcn primitives
  app/  booking picker, dental chart, sidebar, theme toggle, etc.

prisma/
  schema.prisma      16 models, 8 enums, 21 indexes
```

## A few notes for future me

Availability lives in `lib/availability.ts` only. Every booking flow and the calendar picker route through it, one indexed Prisma query per request.

The calendar packs overlapping appointments into lanes via a pure function in `lib/calendar-layout.ts`. Clusters are scoped, so disjoint groups don't widen each other. Week and Day views both ship in the SSR DOM and swap with Tailwind utility classes; no `window.innerWidth` at render and no hydration mismatch.

Invoice numbers (`INV-YYYYMM-NNNN`) get reserved with retry on the unique index. `recomputeInvoice()` re-derives subtotal, total, and status after every mutation, so the invoice row is a cache.

Soft delete uses `deletedAt: null` written explicitly on insert. Mongo's `equals: null` matches stored nulls but not missing fields, so the explicit write matters.

The print stylesheet (`@media print` in `app/globals.css`) forces light tokens for invoice printing. Don't strip it during theme work.
