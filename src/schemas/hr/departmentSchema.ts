import { z } from "zod";

export const departmentSchema = z.object({
  name: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres").max(100, "Máximo 100 caracteres"),
  description: z.string().max(500, "Máximo 500 caracteres").default(""),
  parent_department_id: z.string().nullable().default(null),
  head_id: z.string().nullable().default(null),
});

export type DepartmentFormValues = z.infer<typeof departmentSchema>;
