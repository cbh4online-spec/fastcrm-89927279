import { z } from "zod";

export const positionSchema = z.object({
  name: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres").max(100, "Máximo 100 caracteres"),
  description: z.string().max(1000, "Máximo 1000 caracteres").default(""),
  department_id: z.string().nullable().default(null),
  level: z.string().max(50, "Máximo 50 caracteres").default(""),
  salary_min: z.coerce.number().min(0, "Valor mínimo é 0").nullable().default(null),
  salary_max: z.coerce.number().min(0, "Valor mínimo é 0").nullable().default(null),
  currency: z.enum(["EUR", "USD", "GBP"]).default("EUR"),
}).refine(
  (data) => {
    if (data.salary_min != null && data.salary_max != null) {
      return data.salary_min <= data.salary_max;
    }
    return true;
  },
  { message: "Salário mínimo deve ser inferior ao máximo", path: ["salary_min"] }
);

export type PositionFormValues = z.infer<typeof positionSchema>;
