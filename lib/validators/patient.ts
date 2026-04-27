import { z } from "zod";

const optionalTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal("").transform(() => undefined));

export const PatientCreateSchema = z.object({
  // Account credentials (only required when admin/staff is creating a patient
  // record without an existing user — controlled by `withAccount` flag in the action).
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(200)
    .optional()
    .or(z.literal("").transform(() => undefined)),

  firstName: z.string().trim().min(1, "First name is required.").max(80),
  lastName: z.string().trim().min(1, "Last name is required.").max(80),
  sex: z.enum(["MALE", "FEMALE", "OTHER", "UNDISCLOSED"]),
  dateOfBirth: z
    .string()
    .min(1, "Date of birth is required.")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Enter a valid date."),

  phone: optionalTrimmed(40),
  address: optionalTrimmed(500),
  emergencyContactName: optionalTrimmed(120),
  emergencyContactPhone: optionalTrimmed(40),
  medicalHistory: optionalTrimmed(2000),
  allergies: optionalTrimmed(1000),
  insuranceProvider: optionalTrimmed(120),
  insurancePolicyNo: optionalTrimmed(80),
  notes: optionalTrimmed(2000),
});

export type PatientCreateInput = z.infer<typeof PatientCreateSchema>;

export const PatientUpdateSchema = PatientCreateSchema.omit({
  email: true,
  password: true,
});

export type PatientUpdateInput = z.infer<typeof PatientUpdateSchema>;

export function patientFromFormData(formData: FormData): Record<string, unknown> {
  const get = (name: string) => {
    const v = formData.get(name);
    return typeof v === "string" ? v : undefined;
  };
  return {
    email: get("email"),
    password: get("password"),
    firstName: get("firstName"),
    lastName: get("lastName"),
    sex: get("sex"),
    dateOfBirth: get("dateOfBirth"),
    phone: get("phone"),
    address: get("address"),
    emergencyContactName: get("emergencyContactName"),
    emergencyContactPhone: get("emergencyContactPhone"),
    medicalHistory: get("medicalHistory"),
    allergies: get("allergies"),
    insuranceProvider: get("insuranceProvider"),
    insurancePolicyNo: get("insurancePolicyNo"),
    notes: get("notes"),
  };
}
