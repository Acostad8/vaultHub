import { z } from "zod";

// Master password del VAULT (distinta de la password de cuenta).
// Recomendacion conservadora: 12+ chars.
const masterPasswordSchema = z
  .string()
  .min(12, "Minimo 12 caracteres")
  .max(256, "Maximo 256 caracteres");

export const setupVaultSchema = z
  .object({
    masterPassword: masterPasswordSchema,
    confirmPassword: z.string(),
    acknowledge: z
      .boolean()
      .refine((v) => v === true, {
        message: "Debes confirmar que entiendes la irrecuperabilidad",
      }),
  })
  .refine((d) => d.masterPassword === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Los passwords no coinciden",
  });
export type SetupVaultInput = z.infer<typeof setupVaultSchema>;

export const unlockVaultSchema = z.object({
  masterPassword: z.string().min(1, "Requerido"),
});
export type UnlockVaultInput = z.infer<typeof unlockVaultSchema>;

// Helpers de string opcional que aceptan "" del form.
const optStr = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));
const nameField = z.string().trim().min(1, "Nombre requerido").max(200);

// Schemas por tipo de item. Aceptan "" para conveniencia del form.
export const passwordItemSchema = z.object({
  name: nameField,
  url: optStr(500),
  username: optStr(200),
  password: z.string().max(1000).optional().or(z.literal("")),
  notes: optStr(10_000),
});
export type PasswordItemInput = z.infer<typeof passwordItemSchema>;

export const noteItemSchema = z.object({
  name: nameField,
  body: z.string().max(100_000).default(""),
});
export type NoteItemInput = z.infer<typeof noteItemSchema>;

export const apiKeyItemSchema = z.object({
  name: nameField,
  key: z.string().max(4_000).default(""),
  notes: optStr(10_000),
});
export type ApiKeyItemInput = z.infer<typeof apiKeyItemSchema>;

export const sshKeyItemSchema = z.object({
  name: nameField,
  private_key: z.string().max(50_000).default(""),
  public_key: optStr(50_000),
  passphrase: z.string().max(1000).optional().or(z.literal("")),
  notes: optStr(10_000),
});
export type SshKeyItemInput = z.infer<typeof sshKeyItemSchema>;

export const cardItemSchema = z.object({
  name: nameField,
  cardholder: z.string().trim().min(1, "Requerido").max(200),
  number: z.string().trim().min(1, "Requerido").max(50),
  exp_month: z.string().trim().regex(/^(0?[1-9]|1[0-2])$/, "01-12"),
  exp_year: z.string().trim().regex(/^\d{2,4}$/, "2 o 4 digitos"),
  cvv: z.string().max(10).optional().or(z.literal("")),
  notes: optStr(10_000),
});
export type CardItemInput = z.infer<typeof cardItemSchema>;

export const identityItemSchema = z.object({
  name: nameField,
  full_name: optStr(200),
  document_number: optStr(100),
  birth_date: optStr(20),
  address: optStr(500),
  notes: optStr(10_000),
});
export type IdentityItemInput = z.infer<typeof identityItemSchema>;

export const totpItemSchema = z.object({
  name: nameField,
  secret: z
    .string()
    .trim()
    .min(1, "Secret requerido")
    .regex(/^[A-Z2-7\s]+=*$/i, "Debe ser base32 (RFC 4648)"),
  issuer: optStr(200),
});
export type TotpItemInput = z.infer<typeof totpItemSchema>;

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Nombre requerido").max(100),
  color: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i, "Formato #rrggbb")
    .optional()
    .or(z.literal("")),
});
export type CategoryInput = z.infer<typeof categorySchema>;

export const tagSchema = z.object({
  name: z.string().trim().min(1, "Nombre requerido").max(50),
  color: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i, "Formato #rrggbb")
    .optional()
    .or(z.literal("")),
});
export type TagInput = z.infer<typeof tagSchema>;
