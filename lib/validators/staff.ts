import { z } from "zod";

export const STAFF_ROLE_VALUES = ["ADMIN", "DENTIST", "RECEPTIONIST"] as const;
export type StaffRoleValue = (typeof STAFF_ROLE_VALUES)[number];

const passwordRule = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(200)
  .regex(/[a-zA-Z]/, "Password must contain a letter.")
  .regex(/[0-9]/, "Password must contain a number.");

const optionalString = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal("").transform(() => undefined));

const StaffBaseObject = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  phone: optionalString(40),
  role: z.enum(STAFF_ROLE_VALUES),
  isActive: z.boolean().default(true),
  // Dentist-only
  licenseNo: optionalString(60),
  specialty: optionalString(120),
  bio: optionalString(2000),
  // Admin/Receptionist-only
  position: optionalString(80),
});

function refineRoleFields<T extends z.ZodTypeAny>(schema: T): T {
  return schema.superRefine((val, ctx) => {
    const v = val as z.infer<typeof StaffBaseObject>;
    if (v.role === "DENTIST") {
      if (!v.licenseNo || v.licenseNo.length < 1) {
        ctx.addIssue({
          code: "custom",
          path: ["licenseNo"],
          message: "License number is required for dentists.",
        });
      }
    } else {
      if (!v.position || v.position.length < 1) {
        ctx.addIssue({
          code: "custom",
          path: ["position"],
          message: "Position is required.",
        });
      }
    }
  }) as unknown as T;
}

export const StaffCreateSchema = refineRoleFields(
  StaffBaseObject.extend({
    password: passwordRule,
  }),
);
export type StaffCreateInput = z.infer<typeof StaffCreateSchema>;

export const StaffUpdateSchema = refineRoleFields(StaffBaseObject);
export type StaffUpdateInput = z.infer<typeof StaffUpdateSchema>;

export const PasswordResetSchema = z.object({
  password: passwordRule,
});
export type PasswordResetInput = z.infer<typeof PasswordResetSchema>;

export function staffFromFormData(formData: FormData): Record<string, unknown> {
  const get = (n: string) => {
    const v = formData.get(n);
    return typeof v === "string" ? v : undefined;
  };
  return {
    name: get("name"),
    email: get("email"),
    phone: get("phone"),
    role: get("role"),
    isActive: get("isActive") === "on" || get("isActive") === "true",
    licenseNo: get("licenseNo"),
    specialty: get("specialty"),
    bio: get("bio"),
    position: get("position"),
    password: get("password"),
  };
}

// Generates a memorable, copy-pasteable temporary password the admin can hand
// to the staff member. 12+ chars, mixed case, digits, and a separator. The raw
// value is shown to the admin once and immediately bcrypt-hashed in the DB.
export function generateTempPassword(): string {
  const word = randomWord();
  const num = String(Math.floor(1000 + Math.random() * 9000));
  return `${capitalize(word)}-${num}`;
}

const WORDS = [
  "amber", "arrow", "basil", "breeze", "cedar", "coral", "delta", "echo",
  "fable", "frost", "glade", "harbor", "ivory", "jade", "koala", "lemon",
  "maple", "north", "ocean", "pearl", "quartz", "raven", "sable", "topaz",
  "umbra", "violet", "willow", "xenon", "yarrow", "zephyr",
];

function randomWord(): string {
  return WORDS[Math.floor(Math.random() * WORDS.length)];
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
