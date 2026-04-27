import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const PASSWORDS = {
  admin: "Admin#12345",
  dentist: "Dentist#12345",
  receptionist: "Reception#12345",
  patient: "Patient#12345",
} as const;

async function main() {
  console.log("Seeding Banilad Dental Clinic baseline data...\n");

  const [adminHash, dentistHash, receptionistHash, patientHash] = await Promise.all([
    hash(PASSWORDS.admin, 12),
    hash(PASSWORDS.dentist, 12),
    hash(PASSWORDS.receptionist, 12),
    hash(PASSWORDS.patient, 12),
  ]);

  // ---- Admin ----
  await prisma.user.upsert({
    where: { email: "admin@banilad.local" },
    update: { passwordHash: adminHash, role: "ADMIN", isActive: true },
    create: {
      email: "admin@banilad.local",
      passwordHash: adminHash,
      role: "ADMIN",
      name: "Avery Admin",
    },
  });

  // ---- Dentist ----
  await prisma.user.upsert({
    where: { email: "dentist@banilad.local" },
    update: { passwordHash: dentistHash, role: "DENTIST", isActive: true },
    create: {
      email: "dentist@banilad.local",
      passwordHash: dentistHash,
      role: "DENTIST",
      name: "Dr. Dana Dentist",
      dentist: {
        create: {
          licenseNo: "PRC-DENT-000123",
          specialty: "General dentistry",
          bio: "Seeded demo dentist.",
        },
      },
    },
  });

  // ---- Receptionist ----
  await prisma.user.upsert({
    where: { email: "reception@banilad.local" },
    update: { passwordHash: receptionistHash, role: "RECEPTIONIST", isActive: true },
    create: {
      email: "reception@banilad.local",
      passwordHash: receptionistHash,
      role: "RECEPTIONIST",
      name: "Riley Receptionist",
      staff: {
        create: { position: "Receptionist" },
      },
    },
  });

  // ---- Patient ----
  await prisma.user.upsert({
    where: { email: "patient@banilad.local" },
    update: { passwordHash: patientHash, role: "PATIENT", isActive: true },
    create: {
      email: "patient@banilad.local",
      passwordHash: patientHash,
      role: "PATIENT",
      name: "Pat Patient",
      patient: {
        create: {
          firstName: "Pat",
          lastName: "Patient",
          sex: "UNDISCLOSED",
          dateOfBirth: new Date("1990-01-15"),
          phone: "+63 32 000 0000",
        },
      },
    },
  });

  console.log("Done. Use these credentials to sign in:\n");
  printCreds("Admin",        "admin@banilad.local",      PASSWORDS.admin);
  printCreds("Dentist",      "dentist@banilad.local",    PASSWORDS.dentist);
  printCreds("Receptionist", "reception@banilad.local",  PASSWORDS.receptionist);
  printCreds("Patient",      "patient@banilad.local",    PASSWORDS.patient);
}

function printCreds(label: string, email: string, password: string) {
  console.log(`  ${label.padEnd(13)} ${email.padEnd(28)} ${password}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
