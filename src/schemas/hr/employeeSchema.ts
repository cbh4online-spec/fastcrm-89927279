import { z } from "zod";

export const employeeSchema = z.object({
  department_id: z.string().nullable().default(null),
  position_id: z.string().nullable().default(null),
  manager_id: z.string().nullable().default(null),
  employee_number: z.string().max(50, "Máximo 50 caracteres").default(""),
  contract_type: z.enum(["full_time", "part_time", "contractor", "contract", "intern"], {
    required_error: "Selecione um tipo de contrato",
  }).default("full_time"),
  start_date: z.string().default(""),
  weekly_hours: z.coerce
    .number({ invalid_type_error: "Introduza um número válido" })
    .min(1, "Horas semanais devem ser superiores a 0")
    .max(168, "Máximo 168 horas por semana")
    .default(40),
  notes: z.string().max(2000, "Máximo 2000 caracteres").default(""),
  status: z.enum(["active", "inactive", "on_leave", "terminated", "suspended"]).default("active"),
});

export type EmployeeFormValues = z.infer<typeof employeeSchema>;
