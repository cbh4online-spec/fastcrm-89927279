import { z } from "zod";
import { isValidPhoneNumber } from "libphonenumber-js";

export const checkoutStep1Schema = z.object({
  name: z.string().trim().min(1, "Preencha o nome").max(100, "Nome demasiado longo"),
  phone: z
    .string()
    .trim()
    .min(1, "Preencha o telefone")
    .refine((val) => isValidPhoneNumber(val, "PT"), "Número de telefone inválido"),
});

export const checkoutStep2Schema = z.object({
  email: z.string().trim().min(1, "Preencha o email").email("Email inválido"),
});

export type CheckoutStep1Data = z.infer<typeof checkoutStep1Schema>;
export type CheckoutStep2Data = z.infer<typeof checkoutStep2Schema>;
