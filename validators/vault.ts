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

// Form de un item tipo password. Otros tipos añadiran su propio schema.
export const passwordItemSchema = z.object({
  name: z.string().trim().min(1, "Nombre requerido").max(200),
  url: z.string().trim().max(500).optional().or(z.literal("")),
  username: z.string().trim().max(200).optional().or(z.literal("")),
  password: z.string().max(1000).optional().or(z.literal("")),
  notes: z.string().max(10_000).optional().or(z.literal("")),
});
export type PasswordItemInput = z.infer<typeof passwordItemSchema>;
