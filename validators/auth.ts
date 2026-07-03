import { z } from "zod";

// Password de la CUENTA (Supabase Auth). NO es la master password.
// Se documenta en CRYPTO_FLOW.md: son deliberadamente distintas.
const accountPasswordSchema = z
  .string()
  .min(10, "Minimo 10 caracteres")
  .max(128, "Maximo 128 caracteres");

export const emailSchema = z.string().trim().toLowerCase().email("Email invalido");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Requerido"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    email: emailSchema,
    password: accountPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Los passwords no coinciden",
  });
export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: accountPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Los passwords no coinciden",
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
