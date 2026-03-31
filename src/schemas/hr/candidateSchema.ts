import { z } from "zod";

export const candidateSchema = z.object({
  first_name: z.string().trim().min(1, "Nome é obrigatório").max(100, "Máximo 100 caracteres"),
  last_name: z.string().trim().min(1, "Apelido é obrigatório").max(100, "Máximo 100 caracteres"),
  email: z.string().trim().email("Email inválido").max(255, "Máximo 255 caracteres"),
  phone: z.string().max(30, "Máximo 30 caracteres").default(""),
  linkedin_url: z.string().url("URL inválido").or(z.literal("")).default(""),
  job_posting_id: z.string().nullable().default(null),
  source: z.string().default("manual"),
});

export type CandidateFormValues = z.infer<typeof candidateSchema>;
