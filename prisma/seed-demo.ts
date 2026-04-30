// Demo seed: ~2 months of clinic activity ending 2026-04-27.
// Resets non-user tables, then seeds patients, appointments, treatments,
// invoices, payments, inventory + movements, and tooth conditions.
// Deterministic via a fixed RNG seed.

import "dotenv/config";
import { hash } from "bcryptjs";
import { PrismaClient } from "../generated/prisma/client";
import type {
  AppointmentStatus,
  InvoiceStatus,
  PaymentMethod,
  Sex,
  StockMovementType,
  ToothStatus,
} from "../generated/prisma/client";
import { ALL_TEETH } from "../lib/teeth";

const prisma = new PrismaClient();

// ---------- Deterministic RNG (mulberry32) ----------
function makeRng(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = makeRng(20260427);
const rand = () => rng();
const randInt = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
const pick = <T>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];
const chance = (p: number) => rand() < p;
const shuffle = <T>(arr: T[]) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ---------- Window ----------
const TODAY = new Date("2026-04-27T00:00:00.000Z");
const WINDOW_DAYS = 60;
const WINDOW_START = new Date(TODAY);
WINDOW_START.setDate(WINDOW_START.getDate() - WINDOW_DAYS);

// ---------- Reference data ----------

const FIRST_NAMES_M = [
  "Juan", "Carlo", "Miguel", "Andres", "Rafael", "Joaquin", "Diego", "Lorenzo",
  "Mateo", "Emilio", "Vicente", "Gabriel", "Benjamin", "Felix", "Ignacio",
];
const FIRST_NAMES_F = [
  "Maria", "Sofia", "Isabela", "Camila", "Andrea", "Patricia", "Beatriz",
  "Carmen", "Lucia", "Nina", "Cristina", "Elena", "Gabriela", "Ines", "Rosa",
];
const LAST_NAMES = [
  "Reyes", "Cruz", "Santos", "Garcia", "Mendoza", "Tan", "Sy", "Lim", "Uy",
  "Ramos", "Aquino", "Bautista", "Castro", "Dela Cruz", "Espino", "Fajardo",
  "Galang", "Ignacio", "Lopez", "Macaraeg", "Navarro", "Ocampo", "Pascual",
  "Quizon", "Robles", "Salazar", "Tagle", "Ulanday", "Valdez", "Yap",
];
const STREETS = [
  "Banilad Road", "Gov. M. Cuenco Ave", "Salinas Drive", "Maria Luisa Road",
  "Talamban Road", "Gorordo Ave", "Escario St", "Fuente Osmena", "Mango Ave",
  "Wilson St", "F. Cabahug St", "P. del Rosario St", "Jakosalem St",
];
const SUFFIXES = [
  "Cebu City", "Mandaue City", "Lapu-Lapu City", "Talisay City", "Consolacion",
];

const ALLERGIES = [
  null, null, null, "Penicillin", "Latex", "Lidocaine", "Aspirin", "Ibuprofen",
];
const MEDICAL_HISTORY = [
  null, null, "Hypertension", "Diabetes type 2", "Asthma", "None reported",
  "Mild anxiety", "Pregnancy (2nd trimester)",
];
const INSURANCE = [
  null, null, null, "PhilHealth", "Maxicare", "Intellicare", "Medicard",
];

const PROCEDURES = [
  { name: "Cleaning (prophylaxis)",     fee: 1500_00, status: "HEALTHY"   as ToothStatus | null },
  { name: "Composite filling",          fee: 2200_00, status: "RESTORED" as ToothStatus | null },
  { name: "Tooth extraction",           fee: 3000_00, status: "EXTRACTED" as ToothStatus | null },
  { name: "Root canal therapy",         fee: 8500_00, status: "ROOT_CANAL" as ToothStatus | null },
  { name: "Porcelain crown",            fee: 12000_00, status: "CROWN"   as ToothStatus | null },
  { name: "Teeth whitening",            fee: 6500_00, status: null },
  { name: "Consultation",               fee: 500_00,  status: null },
  { name: "Dental X-ray",               fee: 800_00,  status: null },
  { name: "Fluoride treatment",         fee: 1200_00, status: null },
  { name: "Pit and fissure sealant",    fee: 1000_00, status: null },
  { name: "Dental implant placement",   fee: 45000_00, status: "IMPLANT" as ToothStatus | null },
  { name: "Caries removal",             fee: 1800_00, status: "RESTORED" as ToothStatus | null },
];

const APPOINTMENT_REASONS = [
  "Routine checkup", "Toothache", "Cleaning", "Follow-up", "Filling",
  "Consultation", "Extraction", "Crown fitting", "Whitening session",
  "X-ray review", "Sensitivity complaint", "Bleeding gums",
];

const INVENTORY_SEEDS = [
  { name: "Examination gloves (M)",    sku: "GLV-M",      unit: "box",   reorderPoint: 5,  unitCost: 250_00,  supplier: "Medisafe Cebu", openingStock: 18 },
  { name: "Surgical masks",            sku: "MSK-SURG",   unit: "box",   reorderPoint: 4,  unitCost: 180_00,  supplier: "Medisafe Cebu", openingStock: 12 },
  { name: "Lidocaine 2% w/ epi",       sku: "ANS-LID",    unit: "box",   reorderPoint: 3,  unitCost: 1200_00, supplier: "DentalPro Mfg", openingStock: 9 },
  { name: "Articaine 4%",              sku: "ANS-ART",    unit: "box",   reorderPoint: 2,  unitCost: 1450_00, supplier: "DentalPro Mfg", openingStock: 6 },
  { name: "Composite resin A2",        sku: "CMP-A2",     unit: "syringe", reorderPoint: 4, unitCost: 1800_00, supplier: "DentalPro Mfg", openingStock: 14 },
  { name: "Composite resin A3",        sku: "CMP-A3",     unit: "syringe", reorderPoint: 4, unitCost: 1800_00, supplier: "DentalPro Mfg", openingStock: 11 },
  { name: "Etching gel 37%",           sku: "ETC-37",     unit: "syringe", reorderPoint: 3, unitCost: 450_00,  supplier: "DentalPro Mfg", openingStock: 8 },
  { name: "Bonding agent",             sku: "BND-UN",     unit: "bottle", reorderPoint: 2,  unitCost: 1600_00, supplier: "DentalPro Mfg", openingStock: 5 },
  { name: "Glass ionomer cement",      sku: "GIC-01",     unit: "kit",    reorderPoint: 2,  unitCost: 2400_00, supplier: "DentalPro Mfg", openingStock: 4 },
  { name: "X-ray film (size 2)",       sku: "XRY-2",      unit: "box",    reorderPoint: 3,  unitCost: 950_00,  supplier: "ImageMed",      openingStock: 7 },
  { name: "Suction tips",              sku: "SUC-TIP",    unit: "pack",   reorderPoint: 5,  unitCost: 320_00,  supplier: "Medisafe Cebu", openingStock: 22 },
  { name: "Cotton rolls",              sku: "COT-ROLL",   unit: "pack",   reorderPoint: 6,  unitCost: 90_00,   supplier: "Medisafe Cebu", openingStock: 30 },
  { name: "Saliva ejectors",           sku: "SAL-EJ",     unit: "pack",   reorderPoint: 5,  unitCost: 200_00,  supplier: "Medisafe Cebu", openingStock: 18 },
  { name: "Disposable bibs",           sku: "BIB-DSP",    unit: "pack",   reorderPoint: 4,  unitCost: 250_00,  supplier: "Medisafe Cebu", openingStock: 16 },
  { name: "Sterilization pouches",     sku: "STR-POU",    unit: "box",    reorderPoint: 3,  unitCost: 600_00,  supplier: "AsepticPH",     openingStock: 9 },
  { name: "Polishing paste",           sku: "POL-PST",    unit: "tub",    reorderPoint: 2,  unitCost: 750_00,  supplier: "DentalPro Mfg", openingStock: 5 },
  { name: "Prophy cups",               sku: "PRO-CUP",    unit: "pack",   reorderPoint: 4,  unitCost: 350_00,  supplier: "DentalPro Mfg", openingStock: 12 },
  { name: "Whitening gel 16%",         sku: "WHT-16",     unit: "kit",    reorderPoint: 2,  unitCost: 3200_00, supplier: "BrightSmile",   openingStock: 4 },
  { name: "Endo files (assorted)",     sku: "END-FIL",    unit: "pack",   reorderPoint: 2,  unitCost: 2800_00, supplier: "DentalPro Mfg", openingStock: 5 },
  { name: "Gutta percha points",       sku: "GUT-PT",     unit: "box",    reorderPoint: 2,  unitCost: 850_00,  supplier: "DentalPro Mfg", openingStock: 6 },
  { name: "Crown impression material", sku: "IMP-MAT",    unit: "kit",    reorderPoint: 2,  unitCost: 3400_00, supplier: "DentalPro Mfg", openingStock: 4 },
  { name: "Disinfectant solution 1L",  sku: "DIS-1L",     unit: "bottle", reorderPoint: 3,  unitCost: 480_00,  supplier: "AsepticPH",     openingStock: 8 },
  { name: "Hand sanitizer 500ml",      sku: "SAN-500",    unit: "bottle", reorderPoint: 4,  unitCost: 280_00,  supplier: "AsepticPH",     openingStock: 14 },
  { name: "Local anesthetic needles",  sku: "NDL-LA",     unit: "box",    reorderPoint: 3,  unitCost: 380_00,  supplier: "Medisafe Cebu", openingStock: 9 },
  { name: "Dental burs (assorted)",    sku: "BUR-AST",    unit: "pack",   reorderPoint: 3,  unitCost: 1900_00, supplier: "DentalPro Mfg", openingStock: 6 },
];

const PAYMENT_METHODS: readonly PaymentMethod[] = ["CASH", "CARD", "BANK_TRANSFER", "INSURANCE"] as const;

// ---------- Time helpers ----------

function dateOnly(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}
function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}
function setLocalTime(d: Date, hour: number, minute: number): Date {
  const out = new Date(d);
  out.setHours(hour, minute, 0, 0);
  return out;
}
function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}

// ---------- Main ----------

async function main() {
  console.log("Banilad demo seed — 2 months of activity ending 2026-04-27\n");

  await wipeNonUserTables();
  const { dentists, receptionists, admin, patientUser } = await ensureStaffAndAdminUsers();
  const patients = await seedPatients(patientUser);
  await seedToothConditions(patients.map((p) => p.id));
  const inventory = await seedInventory();
  const appointmentDays = enumerateClinicDays();
  const appointments = await seedAppointments({
    patients,
    dentists,
    creators: [admin, ...receptionists],
    days: appointmentDays,
  });
  const treatments = await seedTreatments({ appointments });
  await applyResultingToothStatuses(treatments);
  await seedInvoicesAndPayments({ treatments, recorders: [admin, ...receptionists] });
  await seedInventoryMovements({ inventory, recorder: admin.id });

  console.log("\nSummary:");
  for (const [label, model] of [
    ["Patients", prisma.patient],
    ["Appointments", prisma.appointment],
    ["Treatments", prisma.treatmentRecord],
    ["Tooth conditions", prisma.toothCondition],
    ["Invoices", prisma.invoice],
    ["Invoice items", prisma.invoiceItem],
    ["Payments", prisma.payment],
    ["Inventory items", prisma.inventoryItem],
    ["Stock movements", prisma.stockMovement],
  ] as const) {
    // @ts-expect-error - tuple model has count
    const c = await model.count();
    console.log(`  ${label.padEnd(18)} ${c}`);
  }
  console.log("\nDone.");
}

// ---------- Wipe ----------

async function wipeNonUserTables() {
  console.log("Wiping non-user tables...");
  // Order matters: children first.
  await prisma.payment.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.toothTreatmentEntry.deleteMany();
  await prisma.treatmentRecord.deleteMany();
  await prisma.toothCondition.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.document.deleteMany();
  await prisma.auditLog.deleteMany();
  // Patient profiles for non-canonical patient users — deletes cascade by removing the row.
  // Keep the canonical seed users; delete demo-only patients (those whose user we'll also remove).
  const demoPatientUsers = await prisma.user.findMany({
    where: {
      role: "PATIENT",
      email: { not: "patient@banilad.local" },
    },
    select: { id: true },
  });
  if (demoPatientUsers.length > 0) {
    const ids = demoPatientUsers.map((u) => u.id);
    await prisma.patient.deleteMany({ where: { userId: { in: ids } } });
    await prisma.session.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  }
  // Also clear the canonical patient's profile so we re-seed it cleanly.
  await prisma.patient.deleteMany();
  // Demo dentist/receptionist staff that we'll re-create — leave canonical seed users alone.
  // Delete extra dentist/staff profiles whose users are tagged with the demo email suffix.
  const demoStaff = await prisma.user.findMany({
    where: { email: { endsWith: "@banilad.demo" } },
    select: { id: true },
  });
  if (demoStaff.length > 0) {
    const ids = demoStaff.map((u) => u.id);
    await prisma.dentist.deleteMany({ where: { userId: { in: ids } } });
    await prisma.staffProfile.deleteMany({ where: { userId: { in: ids } } });
    await prisma.session.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  }
}

// ---------- Users ----------

async function ensureStaffAndAdminUsers() {
  console.log("Ensuring staff/admin users...");

  const adminUser = await prisma.user.findUniqueOrThrow({
    where: { email: "admin@banilad.local" },
    select: { id: true, role: true, name: true },
  });

  // Canonical seed dentist
  const seedDentist = await prisma.user.findUnique({
    where: { email: "dentist@banilad.local" },
    select: { id: true, dentist: { select: { id: true } } },
  });
  if (!seedDentist?.dentist) {
    throw new Error("Run `npm run db:seed` first — canonical users missing.");
  }

  // Canonical seed receptionist
  const seedReception = await prisma.user.findUnique({
    where: { email: "reception@banilad.local" },
    select: { id: true },
  });
  if (!seedReception) throw new Error("Run `npm run db:seed` first.");

  // Canonical seed patient — recreate the Patient profile for them.
  const seedPatientUser = await prisma.user.findUnique({
    where: { email: "patient@banilad.local" },
    select: { id: true, name: true },
  });
  if (!seedPatientUser) throw new Error("Run `npm run db:seed` first.");

  // Two more dentists (demo)
  const passwordHash = await hash("Demo#12345", 12);
  const dentist2 = await prisma.user.create({
    data: {
      email: "dr.santos@banilad.demo",
      passwordHash,
      role: "DENTIST",
      name: "Dr. Marco Santos",
      dentist: {
        create: { licenseNo: "PRC-DENT-002201", specialty: "Orthodontics", bio: "Demo dentist." },
      },
    },
    select: { id: true, dentist: { select: { id: true } } },
  });
  const dentist3 = await prisma.user.create({
    data: {
      email: "dr.reyes@banilad.demo",
      passwordHash,
      role: "DENTIST",
      name: "Dr. Lara Reyes",
      dentist: {
        create: { licenseNo: "PRC-DENT-003342", specialty: "Endodontics", bio: "Demo dentist." },
      },
    },
    select: { id: true, dentist: { select: { id: true } } },
  });

  // One more receptionist
  const reception2 = await prisma.user.create({
    data: {
      email: "front.desk@banilad.demo",
      passwordHash,
      role: "RECEPTIONIST",
      name: "Maya Aquino",
      staff: { create: { position: "Front desk" } },
    },
    select: { id: true },
  });

  return {
    admin: adminUser,
    dentists: [
      { userId: seedDentist.id, dentistId: seedDentist.dentist.id, name: "Dr. Dana Dentist" },
      { userId: dentist2.id, dentistId: dentist2.dentist!.id, name: "Dr. Marco Santos" },
      { userId: dentist3.id, dentistId: dentist3.dentist!.id, name: "Dr. Lara Reyes" },
    ],
    receptionists: [
      { id: seedReception.id, name: "Riley Receptionist" },
      { id: reception2.id, name: "Maya Aquino" },
    ],
    patientUser: seedPatientUser,
  };
}

// ---------- Patients ----------

async function seedPatients(canonical: { id: string; name: string }) {
  console.log("Seeding patients (40)...");

  const patients: Array<{ id: string; firstName: string; lastName: string }> = [];

  // Canonical patient: rebuild their Patient profile.
  const canonicalProfile = await prisma.patient.create({
    data: {
      userId: canonical.id,
      firstName: "Pat",
      lastName: "Patient",
      sex: "UNDISCLOSED",
      dateOfBirth: new Date("1990-01-15"),
      phone: "+63 32 000 0000",
      address: `12 ${pick(STREETS)}, ${pick(SUFFIXES)}`,
      emergencyContactName: "Family contact",
      emergencyContactPhone: "+63 917 000 0001",
      medicalHistory: "None reported",
      allergies: null,
      insuranceProvider: "PhilHealth",
      // Mongo + Prisma: missing fields don't match `{ equals: null }`, so the
      // active-patients filter would skip records where deletedAt was never set.
      deletedAt: null,
    },
    select: { id: true, firstName: true, lastName: true },
  });
  patients.push(canonicalProfile);

  // 39 records-only demo patients (no User row).
  // The schema requires Patient.userId @unique → we need a stub User per patient.
  // We create lightweight, deactivated PATIENT users so the records are valid
  // but they cannot log in (passwordHash is random, isActive: false).
  for (let i = 0; i < 39; i++) {
    const isMale = chance(0.48);
    const firstName = pick(isMale ? FIRST_NAMES_M : FIRST_NAMES_F);
    const lastName = pick(LAST_NAMES);
    const sex: Sex = isMale ? "MALE" : "FEMALE";
    const yob = randInt(1955, 2018);
    const mob = randInt(1, 12);
    const dob = new Date(Date.UTC(yob, mob - 1, randInt(1, 28)));
    const stubEmail = `patient${String(i + 1).padStart(2, "0")}.${lastName.toLowerCase().replace(/[^a-z]/g, "")}@banilad.demo`;
    const stubPasswordHash = await hash(`stub-${i}-${Date.now()}-${rand()}`, 12);

    const u = await prisma.user.create({
      data: {
        email: stubEmail,
        passwordHash: stubPasswordHash,
        role: "PATIENT",
        name: `${firstName} ${lastName}`,
        isActive: false, // demo patients can't log in
        patient: {
          create: {
            firstName,
            lastName,
            sex,
            dateOfBirth: dob,
            phone: `+63 9${randInt(10, 99)} ${randInt(100, 999)} ${randInt(1000, 9999)}`,
            address: `${randInt(1, 999)} ${pick(STREETS)}, ${pick(SUFFIXES)}`,
            emergencyContactName: `${pick([...FIRST_NAMES_M, ...FIRST_NAMES_F])} ${pick(LAST_NAMES)}`,
            emergencyContactPhone: `+63 9${randInt(10, 99)} ${randInt(100, 999)} ${randInt(1000, 9999)}`,
            medicalHistory: pick(MEDICAL_HISTORY),
            allergies: pick(ALLERGIES),
            insuranceProvider: pick(INSURANCE),
            insurancePolicyNo: chance(0.4) ? `POL-${randInt(100000, 999999)}` : null,
            deletedAt: null,
          },
        },
      },
      select: { patient: { select: { id: true, firstName: true, lastName: true } } },
    });
    if (u.patient) patients.push(u.patient);
  }
  return patients;
}

// ---------- Tooth conditions ----------

async function seedToothConditions(patientIds: string[]) {
  console.log("Seeding tooth conditions...");
  const statuses: ToothStatus[] = ["HEALTHY", "CARIES", "RESTORED", "MISSING", "CROWN"];
  const rows: { patientId: string; toothNumber: number; status: ToothStatus }[] = [];
  for (const pid of patientIds) {
    const teethToFlag = shuffle([...ALL_TEETH]).slice(0, randInt(5, 14));
    for (const t of teethToFlag) {
      // Bias toward HEALTHY/CARIES/RESTORED; rarer MISSING/CROWN.
      const r = rand();
      const s: ToothStatus =
        r < 0.45 ? "HEALTHY" :
        r < 0.75 ? "CARIES" :
        r < 0.90 ? "RESTORED" :
        r < 0.96 ? "MISSING" :
        pick(statuses);
      rows.push({ patientId: pid, toothNumber: t, status: s });
    }
  }
  if (rows.length > 0) {
    await prisma.toothCondition.createMany({ data: rows });
  }
}

// ---------- Days ----------

function enumerateClinicDays(): Date[] {
  const days: Date[] = [];
  const start = dateOnly(WINDOW_START);
  // Run a few days past TODAY so the calendar has upcoming bookings.
  const end = addDays(dateOnly(TODAY), 7);
  for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
    if (isWeekend(d)) {
      // ~30% of Saturdays open; Sundays closed.
      if (d.getDay() === 6 && chance(0.3)) days.push(new Date(d));
      continue;
    }
    days.push(new Date(d));
  }
  return days;
}

// ---------- Appointments ----------

type DentistRef = { dentistId: string; userId: string; name: string };
type AppointmentRow = {
  id: string;
  patientId: string;
  dentistId: string;
  startsAt: Date;
  status: AppointmentStatus;
};

async function seedAppointments({
  patients,
  dentists,
  creators,
  days,
}: {
  patients: { id: string }[];
  dentists: DentistRef[];
  creators: { id: string }[];
  days: Date[];
}): Promise<AppointmentRow[]> {
  console.log("Seeding appointments...");
  const created: AppointmentRow[] = [];

  // Time slots: 09–12, 13–17 in 30-min increments.
  const slots: Array<{ h: number; m: number }> = [];
  for (let h = 9; h < 12; h++) {
    slots.push({ h, m: 0 }, { h, m: 30 });
  }
  for (let h = 13; h < 17; h++) {
    slots.push({ h, m: 0 }, { h, m: 30 });
  }

  for (const day of days) {
    const isFuture = day > TODAY;
    // Per-dentist booking sheet to avoid overlap.
    const taken = new Map<string, Set<string>>(); // dentistId -> set of "HH:MM"
    for (const d of dentists) taken.set(d.dentistId, new Set());

    const targetCount = isFuture ? randInt(2, 6) : randInt(8, 16);
    let attempts = 0;
    let placed = 0;
    while (placed < targetCount && attempts < targetCount * 4) {
      attempts++;
      const dentist = pick(dentists);
      const slot = pick(slots);
      const key = `${slot.h}:${slot.m}`;
      const dentistTaken = taken.get(dentist.dentistId)!;
      if (dentistTaken.has(key)) continue;
      // Block adjacent 30-min slot ~50% of the time (so the appointment is 60 min).
      const sixty = chance(0.5);
      const adjKey = `${slot.h + (slot.m === 30 ? 1 : 0)}:${slot.m === 30 ? 0 : 30}`;
      if (sixty && dentistTaken.has(adjKey)) continue;

      const patient = pick(patients);
      const startsAt = setLocalTime(day, slot.h, slot.m);
      const endsAt = new Date(startsAt.getTime() + (sixty ? 60 : 30) * 60_000);

      let status: AppointmentStatus;
      if (isFuture) {
        status = chance(0.4) ? "CONFIRMED" : "SCHEDULED";
      } else {
        const r = rand();
        status = r < 0.74 ? "COMPLETED" :
                 r < 0.84 ? "CONFIRMED" :
                 r < 0.92 ? "CANCELLED" :
                 r < 0.97 ? "NO_SHOW" :
                 "SCHEDULED";
      }

      const row = await prisma.appointment.create({
        data: {
          patientId: patient.id,
          dentistId: dentist.dentistId,
          startsAt,
          endsAt,
          status,
          reason: pick(APPOINTMENT_REASONS),
          createdById: pick(creators).id,
        },
        select: { id: true, patientId: true, dentistId: true, startsAt: true, status: true },
      });
      created.push(row);
      dentistTaken.add(key);
      if (sixty) dentistTaken.add(adjKey);
      placed++;
    }
  }
  return created;
}

// ---------- Treatments ----------

type TreatmentRow = {
  id: string;
  patientId: string;
  dentistId: string;
  appointmentId: string;
  performedAt: Date;
  procedure: string;
  feeCents: number;
  toothNumbers: number[];
  resultingStatus: ToothStatus | null;
};

async function seedTreatments({
  appointments,
}: {
  appointments: AppointmentRow[];
}): Promise<TreatmentRow[]> {
  console.log("Seeding treatments...");
  const treatments: TreatmentRow[] = [];

  for (const a of appointments) {
    if (a.status !== "COMPLETED") continue;
    if (!chance(0.85)) continue; // 85% of completed appts get a treatment

    const proc = pick(PROCEDURES);
    const teethCount = proc.status ? randInt(1, 4) : 0;
    const teeth = teethCount > 0 ? shuffle([...ALL_TEETH]).slice(0, teethCount) : [];
    const fee = proc.fee + (chance(0.3) ? randInt(-300_00, 300_00) : 0);

    const tr = await prisma.treatmentRecord.create({
      data: {
        patientId: a.patientId,
        dentistId: a.dentistId,
        appointmentId: a.id,
        procedure: proc.name,
        diagnosis: chance(0.6) ? pick(["Acute caries", "Gingivitis", "Pulpitis", "Worn filling", "Hypersensitivity", "Calculus buildup"]) : null,
        notes: chance(0.4) ? "Post-op instructions given." : null,
        performedAt: a.startsAt,
        feeCents: Math.max(100_00, fee),
        toothEntries: teeth.length > 0 ? {
          create: teeth.map((t) => ({ toothNumber: t })),
        } : undefined,
      },
      select: { id: true, feeCents: true },
    });
    treatments.push({
      id: tr.id,
      patientId: a.patientId,
      dentistId: a.dentistId,
      appointmentId: a.id,
      performedAt: a.startsAt,
      procedure: proc.name,
      feeCents: tr.feeCents,
      toothNumbers: teeth,
      resultingStatus: proc.status,
    });
  }
  return treatments;
}

async function applyResultingToothStatuses(treatments: TreatmentRow[]) {
  console.log("Applying resulting tooth statuses...");
  // Walk treatments in chronological order so the latest one wins per (patient, tooth).
  const ordered = [...treatments].sort((a, b) => a.performedAt.getTime() - b.performedAt.getTime());
  for (const t of ordered) {
    if (!t.resultingStatus || t.toothNumbers.length === 0) continue;
    for (const tooth of t.toothNumbers) {
      await prisma.toothCondition.upsert({
        where: { patientId_toothNumber: { patientId: t.patientId, toothNumber: tooth } },
        update: { status: t.resultingStatus },
        create: { patientId: t.patientId, toothNumber: tooth, status: t.resultingStatus },
      });
    }
  }
}

// ---------- Invoices & payments ----------

async function seedInvoicesAndPayments({
  treatments,
  recorders,
}: {
  treatments: TreatmentRow[];
  recorders: { id: string }[];
}) {
  console.log("Seeding invoices and payments...");

  // Group treatments by patient + day → one invoice per visit.
  const groups = new Map<string, TreatmentRow[]>();
  for (const t of treatments) {
    const key = `${t.patientId}_${t.performedAt.toISOString().slice(0, 10)}`;
    const arr = groups.get(key) ?? [];
    arr.push(t);
    groups.set(key, arr);
  }

  let seq = 0;
  const monthSequences = new Map<string, number>(); // yyyymm → next seq

  for (const [, group] of groups) {
    seq++;
    const performed = group[0].performedAt;
    const ymKey = `${performed.getFullYear()}${String(performed.getMonth() + 1).padStart(2, "0")}`;
    const nextSeq = (monthSequences.get(ymKey) ?? 0) + 1;
    monthSequences.set(ymKey, nextSeq);
    const number = `INV-${ymKey}-${String(nextSeq).padStart(4, "0")}`;

    const r = rand();
    let status: InvoiceStatus;
    if (r < 0.05) status = "DRAFT";
    else if (r < 0.10) status = "VOID";
    else if (r < 0.78) status = "PAID";
    else if (r < 0.92) status = "PARTIAL";
    else status = "ISSUED";

    const items = group.map((t) => ({
      description: `${t.procedure}${t.toothNumbers.length > 0 ? ` (${t.toothNumbers.join(", ")})` : ""}`,
      quantity: 1,
      unitPriceCents: t.feeCents,
      totalCents: t.feeCents,
    }));
    const subtotal = items.reduce((s, i) => s + i.totalCents, 0);
    const discount = chance(0.18) ? Math.round(subtotal * 0.05) : 0;
    const tax = chance(0.5) ? Math.round((subtotal - discount) * 0.12) : 0;
    const total = Math.max(0, subtotal - discount + tax);
    const issuedAt = status === "DRAFT" ? null : performed;
    const dueAt = status === "DRAFT" || status === "VOID" ? null : addDays(performed, 14);

    const invoice = await prisma.invoice.create({
      data: {
        patientId: group[0].patientId,
        appointmentId: group[0].appointmentId,
        number,
        status,
        issuedAt,
        dueAt,
        subtotalCents: subtotal,
        discountCents: discount,
        taxCents: tax,
        totalCents: total,
        items: { create: items },
      },
      select: { id: true },
    });

    if (status === "PAID") {
      await prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          amountCents: total,
          method: pick(PAYMENT_METHODS),
          paidAt: addDays(performed, randInt(0, 7)),
          recordedById: pick(recorders).id,
          reference: chance(0.4) ? `REF-${randInt(100000, 999999)}` : null,
        },
      });
    } else if (status === "PARTIAL") {
      const part = Math.round(total * (0.3 + rand() * 0.5));
      await prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          amountCents: part,
          method: pick(PAYMENT_METHODS),
          paidAt: addDays(performed, randInt(0, 5)),
          recordedById: pick(recorders).id,
        },
      });
    }
  }
  void seq;
}

// ---------- Inventory ----------

async function seedInventory() {
  console.log("Seeding inventory items...");
  const created: { id: string; name: string; reorderPoint: number }[] = [];
  for (const seed of INVENTORY_SEEDS) {
    const item = await prisma.inventoryItem.create({
      data: {
        name: seed.name,
        sku: seed.sku,
        unit: seed.unit,
        stockOnHand: seed.openingStock,
        reorderPoint: seed.reorderPoint,
        unitCostCents: seed.unitCost,
        supplier: seed.supplier,
      },
      select: { id: true, name: true, reorderPoint: true },
    });
    created.push(item);
  }
  return created;
}

async function seedInventoryMovements({
  inventory,
  recorder,
}: {
  inventory: { id: string; name: string; reorderPoint: number }[];
  recorder: string;
}) {
  console.log("Seeding stock movements...");
  // Record an opening IN movement for each item, then 2 months of consumption + restocks.
  for (const item of inventory) {
    const seed = INVENTORY_SEEDS.find((s) => s.name === item.name)!;
    await prisma.stockMovement.create({
      data: {
        itemId: item.id,
        type: "IN",
        quantity: seed.openingStock,
        reason: "Opening stock",
        recordedById: recorder,
        recordedAt: WINDOW_START,
      },
    });

    let onHand = seed.openingStock;
    let cursor = new Date(WINDOW_START);
    while (cursor <= TODAY) {
      // ~30% chance of activity per day per item.
      if (chance(0.3)) {
        const isOut = chance(0.75);
        if (isOut) {
          const qty = Math.min(onHand, randInt(1, Math.max(1, Math.floor(onHand / 4) || 1)));
          if (qty > 0) {
            await prisma.stockMovement.create({
              data: {
                itemId: item.id,
                type: "OUT" as StockMovementType,
                quantity: qty,
                reason: "Clinic use",
                recordedById: recorder,
                recordedAt: new Date(cursor),
              },
            });
            onHand -= qty;
          }
        } else {
          const qty = randInt(2, 8);
          await prisma.stockMovement.create({
            data: {
              itemId: item.id,
              type: "IN" as StockMovementType,
              quantity: qty,
              reason: "Restock from supplier",
              recordedById: recorder,
              recordedAt: new Date(cursor),
            },
          });
          onHand += qty;
        }
      }
      cursor = addDays(cursor, 1);
    }

    // Sync the item's stockOnHand to the resolved tally.
    await prisma.inventoryItem.update({
      where: { id: item.id },
      data: { stockOnHand: onHand },
    });
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
