import { z } from "zod";

export const jobOpeningSchema = z.object({
  title: z.string().trim().min(2, "Título deve ter pelo menos 2 caracteres").max(200, "Máximo 200 caracteres"),
  description: z.string().max(5000, "Máximo 5000 caracteres").default(""),
  employment_type: z.enum(["full_time", "part_time", "contract", "intern"]).default("full_time"),
  remote_option: z.enum(["office", "remote", "hybrid"]).default("office"),
  location: z.string().max(200, "Máximo 200 caracteres").default(""),
  currency: z.string().max(3).default("EUR"),
  salary_min: z.coerce.number().min(0, "Valor mínimo é 0").nullable().default(null),
  salary_max: z.coerce.number().min(0, "Valor mínimo é 0").nullable().default(null),
  requirements_text: z.string().default(""),
  nice_to_have_text: z.string().default(""),
}).refine(
  (data) => {
    if (data.salary_min != null && data.salary_max != null) {
      return data.salary_min <= data.salary_max;
    }
    return true;
  },
  { message: "Salário mínimo deve ser inferior ao máximo", path: ["salary_min"] }
);

export type JobOpeningFormValues = z.infer<typeof jobOpeningSchema>;
