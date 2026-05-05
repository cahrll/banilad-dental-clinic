# Banilad Dental Clinic

A full-stack, role-aware dental practice management system built with **Next.js 16**, **React 19**, and **MongoDB**. Patients book visits and view their records on a portal; clinic staff run scheduling, treatments, billing, inventory, and reporting from a separate dashboard.

> **Built by:** _Cahrl Louize Loyloy_

---

## Highlights

- **Custom session auth** -- DB-backed sessions with `crypto.randomBytes` tokens and SHA-256 hashes stored server-side; httpOnly cookies, 7-day TTL, instant revocation by row delete.
- **Role-aware access for four user types** -- admin, dentist, receptionist, and patient, each with their own routes and the four guards (`requireUser`, `requireRole`, `requireStaff`, `requirePatient`) re-checking on the server.
- **Single source of truth for availability** -- `lib/availability.ts` exports `CLINIC_HOURS`, `dentistHasConflict`, and `getAvailableSlots`; one Prisma findMany per request, indexed against `@@index([dentistId, startsAt])`, no N+1.
- **Calendly-style booking picker** -- month calendar with available-day dots, per-dentist slot generation, 2-hour patient lead-time floor, conflict-recovery on submit via refresh-key bump.
- **Greedy lane allocator for the calendar** -- pure column-packing function; per-cluster lane counts, not per-day, so disjoint clusters don't pollute each other's width.
- **Responsive without hydration mismatch** -- both `WeekView` and `DayView` ship in the SSR DOM and swap via Tailwind's `hidden md:block` / `md:hidden`.
- **Interactive FDI dental chart** -- per-tooth conditions and treatment history; multi-select powers procedure recording with optional resulting status per tooth.
- **Atomic stock movements for inventory** -- `recordStockMovementAction` runs the count delta and `StockMovement` insert in one `prisma.$transaction`; rejects when stock would go negative.
- **Collision-safe invoice numbering** -- `INV-YYYYMM-NNNN` assigned by `reserveInvoiceNumber()` with retry on the unique-index conflict; `recomputeInvoice()` keeps subtotal, total, and status derivable from items and payments after every mutation.
- **Linear-inspired theme** -- token-driven design system, light/dark/system toggle inside the user dropdown, mode-aware `--chart-1..5` palette, `@media print` block forces light tokens for clean invoice prints.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router, Server Components, Server Actions, Proxy, Turbopack) |
| **UI** | React 19 |
| **Language** | TypeScript 5 (strict) |
| **Styling** | Tailwind CSS v4 + shadcn/ui (`radix-nova` preset) |
| **Components** | Radix UI primitives, Lucide icons |
| **Forms** | React Hook Form + Zod 4 schema validation |
| **Database** | MongoDB Atlas |
| **ORM** | Prisma 6 |
| **Auth** | Custom -- DB-backed sessions, bcryptjs password hashing, httpOnly cookies |
| **Charts** | recharts via the shadcn `chart` wrapper |
| **Theming** | next-themes (class strategy) |

---

## Architecture

```
┌──────────────┐   Server Actions    ┌────────────────────┐    Prisma queries   ┌───────────────┐
│              │  ─────────────────► │                    │  ─────────────────► │               │
│    Client    │                     │  Next.js 16 Server │                     │ MongoDB Atlas │
│              │ ◄─────────────────  │   (App Router)     │ ◄─────────────────  │               │
└──────────────┘   Server Components └────────────────────┘    Indexed reads    └───────────────┘
                                              │
                                              │  proxy.ts (edge)
                                              ▼
                                     cookie-presence gating
```

### Key architectural decisions

1. **Proxy-based session gating at the edge** -- `proxy.ts` (Next.js 16's replacement for `middleware.ts`) reads only the session cookie's presence and redirects unauthenticated requests away from `/dashboard` and `/portal` before any page renders. Real role enforcement lives server-side.
2. **Custom session auth, no third-party library** -- sessions are MongoDB rows. Revocation is a single delete, no JWT staleness window, no dependency surface for a thing that's three functions. The full auth surface is five files under `lib/auth/`.
3. **Single source of truth for availability** -- `lib/availability.ts` owns clinic hours, the conflict query, and the slot generator. All three booking flows and the calendar picker call into it. One Prisma findMany per availability request.
4. **Greedy lane allocator** -- `lib/calendar-layout.ts` is a pure function that packs overlapping appointments into per-cluster lanes. Back-to-back appointments share a lane; truly overlapping ones don't. No React, no DOM, no Prisma.
5. **CSS-only responsive switch on the calendar** -- both `WeekView` and `DayView` ship in the same SSR DOM and swap via Tailwind utility classes. No `window.innerWidth` reads at render, no hydration mismatch. The grid auto-extends past the default end hour when an appointment runs late.
6. **Mongo-aware soft-delete** -- `where: { deletedAt: { equals: null } }` matches fields stored as `null` but not missing fields in MongoDB. Every insert writes `deletedAt: null` explicitly so the active filter actually filters.
7. **Server-action-first mutation surface** -- every mutation is a Zod-validated server action with `revalidatePath`. The only Route Handler in the app is the auth-gated GET at `/api/availability` that powers the booking picker.

---

## Project Structure

```
app/
  (auth)/                       login, register, shared auth layout
  dashboard/                    staff routes (requireStaff in the layout)
    page.tsx                    KPI cards + low-stock list + quick links
    appointments/               week + day calendar, full-page booking
      week-grid.tsx             WeekView + DayView + lane positioning
      new/                      staff create form
      [id]/reschedule/          staff reschedule form
    patients/                   list, create, 4-tab detail, edit
    treatments/new/             full-page record form with the dental chart
    billing/[id]/               invoice detail, line items, payments, print view
    inventory/                  list + detail + movement log
    staff/                      admin-only CRUD + role assignment
    reports/                    revenue, appointments, top procedures
  portal/                       patient routes (requirePatient in the layout)
    appointments/               book, cancel, history
    treatments/                 read-only history
    invoices/                   read-only with portal-safe filtering
    profile/                    read-only profile
  api/availability/             auth-gated GET that powers the picker
  page.tsx                      marketing landing
  layout.tsx                    Inter font, ThemeProvider, TooltipProvider

lib/
  auth/                         sessions, guards, cookies, password, server actions
  availability.ts               CLINIC_HOURS, dentistHasConflict, getAvailableSlots
  calendar-layout.ts            pure greedy lane allocator
  actions/                      server actions, one file per domain
  validators/                   Zod schemas, one file per domain
  datetime.ts                   week math, calendar constants
  teeth.ts                      FDI tooth list, status helpers
  money.ts                      cents/decimal conversion, PHP formatting
  db.ts                         Prisma client singleton

components/
  ui/                           shadcn primitives
  app/                          composite components
    booking-picker.tsx          shared calendar + slot list
    dental-chart.tsx            FDI 11-48 chart, view + multi-select modes
    sidebar-nav.tsx             role-aware sidebar
    sidebar-user-menu.tsx       footer dropdown with theme toggle + logout
    theme-provider.tsx          next-themes wrapper

prisma/
  schema.prisma                 16 models, 8 enums, 21 indexes
  seed.ts                       one user per role

proxy.ts                        edge cookie-presence gating
```

---

## Features in Detail

### Patient Records
Demographics, sex, date of birth, address, emergency contact, medical history, allergies, insurance, and notes. Soft-delete via `deletedAt` keeps the row but hides it from the active filter. Hard delete is admin-only and blocked when appointments, treatments, or invoices reference the record. The detail page has four tabs: Info, Dental Chart, Treatments, Invoices.

### Appointments
Week and day calendar with conflict detection backed by `@@index([dentistId, startsAt])`. Status transitions follow `SCHEDULED → CONFIRMED → COMPLETED` with `CANCELLED` and `NO_SHOW` as off-ramps and re-open paths back to `SCHEDULED`. The calendar packs overlapping appointments into side-by-side lanes; in combined-dentist view each card carries a `--chart-1..5` left-edge hue keyed to the dentist.

### Booking
Calendly-style picker shared by all three booking flows. The calendar surfaces only days with at least one available slot; the slot list shows per-dentist availability with a 2-hour lead-time floor on the patient flow. Conflict on submit clears the selection and bumps a refresh key so the picker re-fetches. The picker is UX; the server action is the authoritative boundary.

### Treatments
Interactive FDI 11-48 chart. View mode: click a tooth to set or update its `ToothCondition`. Multi-select mode: pick affected teeth, log a procedure with optional fee and resulting status, and the chart upserts every selected tooth in one transaction. The full-page record form mirrors the billing draft creator: arrives with `?patientId=`, loads dentists and existing tooth conditions server-side, redirects on success.

### Billing & Invoicing
Draft → Issued → Paid lifecycle with `PARTIAL` and `VOID` as terminal states. `reserveInvoiceNumber()` assigns `INV-YYYYMM-NNNN` with retry on the unique-index conflict. `recomputeInvoice()` recalculates subtotal, total, and status after every mutation -- line item add or remove, discount edit, tax edit, payment recorded, payment deleted. Print view via `@media print` and `window.print()`.

### Inventory
Items, stock-on-hand reconstructable from the movement log, low-stock highlight by reorder point. `recordStockMovementAction` runs the count delta and the `StockMovement` insert inside one `prisma.$transaction` and rejects when stock would go below zero. Movement types are `IN`, `OUT`, and `ADJUSTMENT` with a signed direction. Hard-deleting an item is admin-only and blocked when any non-opening movements exist.

### Staff Management
Admin-only routes for staff CRUD with role-conditional profile fields (DENTIST writes a `Dentist` row; ADMIN and RECEPTIONIST write a `StaffProfile`). Role transitions rewire the profile but block DENTIST → other when the user has appointments or treatments on file, to avoid orphans. Reset password (custom or auto-generated) revokes all sessions for that user. Deactivating a user revokes sessions on the way out.

### Reports
Range-aware (30 / 90 / 365 days), admin and dentist scopes. KPI cards: revenue, appointments and completed count, new patients, current outstanding with overdue count. Charts: revenue line (daily for short ranges, monthly otherwise), appointments-per-dentist horizontal bar, top procedures with revenue in tooltip. All chart series read from `--chart-1..5` so light and dark stay correct.

### Patient Portal
Book and cancel appointments, see treatment history, view issued invoices (drafts excluded), and a read-only profile. Same `requirePatient` guard in the layout, page, and server actions. The booking flow uses the same picker the staff use.

### Dark Mode
System-aware theme toggle inside the sidebar user dropdown. Light, Dark, and System with a check icon for the current mode. `next-themes` with `attribute="class"`, `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange`. Persists across sessions.

---

## Data Model

16 models, 8 enums, 21 indexes. ObjectId convention. No `onDelete: Cascade` on user-data relations -- soft-delete or block.

### Identity & Auth

```
User
  id, email (unique), passwordHash, role, name, phone, isActive
  → Patient | Dentist | StaffProfile (one-of by role)
  → Session[]

Session
  id, userId, tokenHash (unique, SHA-256), expiresAt, lastSeenAt, userAgent, ip
```

### Profile records (one-of per User by role)

```
Patient
  id, userId (unique), firstName, lastName, sex, dateOfBirth
  phone, address, emergencyContact*, medicalHistory, allergies
  insuranceProvider, insurancePolicyNo, notes
  deletedAt (nullable, written explicitly)

Dentist
  id, userId (unique), licenseNo, specialty, bio, workingHours (Json, reserved)

StaffProfile
  id, userId (unique), position, hireDate
```

### Clinical operations

```
Appointment
  id, patientId, dentistId, startsAt, endsAt
  status (SCHEDULED | CONFIRMED | COMPLETED | CANCELLED | NO_SHOW)
  reason, notes, createdById
  @@index([dentistId, startsAt]) -- backs conflict detection
  @@index([patientId, startsAt])
  @@index([status])

TreatmentRecord
  id, patientId, dentistId, appointmentId?
  procedure, diagnosis, notes, performedAt, feeCents

ToothTreatmentEntry
  id, treatmentId, toothNumber (FDI 11-48), surface, note

ToothCondition
  id, patientId, toothNumber, status (ToothStatus), note
  @@unique([patientId, toothNumber])
```

### Billing

```
Invoice
  id, patientId, appointmentId?
  number (unique, INV-YYYYMM-NNNN), status (DRAFT | ISSUED | PAID | PARTIAL | VOID)
  issuedAt, dueAt, subtotalCents, discountCents, taxCents, totalCents

InvoiceItem
  id, invoiceId, description, quantity, unitPriceCents, totalCents

Payment
  id, invoiceId, amountCents, method (PaymentMethod), reference, paidAt, recordedById
```

### Inventory

```
InventoryItem
  id, name, sku (unique), unit, stockOnHand (cache), reorderPoint
  unitCostCents, supplier, notes, isActive

StockMovement
  id, itemId, type (IN | OUT | ADJUSTMENT), quantity (positive)
  reason, recordedById, recordedAt
```

### Documents

```
Document
  id, patientId, kind (DocumentKind), url, originalName, sizeBytes
  uploadedById, uploadedAt
```

### Audit

```
AuditLog
  id, actorUserId?, action, entity, entityId?, metadata (Json), createdAt
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- A MongoDB Atlas cluster (or local MongoDB)

### Setup

1. Clone the repository.

   ```bash
   git clone https://github.com/18103864/banilad-dental-clinic.git
   cd banilad-dental-clinic
   ```

2. Install dependencies.

   ```bash
   npm install
   ```

3. Configure environment variables.

   ```bash
   cp .env.example .env
   ```

   Set `DATABASE_URL`. Atlas's connection-string copy button leaves out the database name; Prisma's MongoDB connector requires it. Add `/banilad_dental` between the host and the `?`:

   ```
   mongodb+srv://USER:PASSWORD@HOST.mongodb.net/banilad_dental?appName=BaniladDentalClinic
   ```

4. Push the Prisma schema to MongoDB.

   ```bash
   npm run db:push
   ```

5. Start the dev server.

   ```bash
   npm run dev
   ```

### Scripts

| Script | Description |
|---|---|
| `npm run dev` | Next.js dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Production server |
| `npm run lint` | ESLint |
| `npm run db:generate` | Generate the Prisma client into `generated/prisma/` |
| `npm run db:push` | Sync `prisma/schema.prisma` to MongoDB |
