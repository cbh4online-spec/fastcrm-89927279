import { z } from "zod";

export const leaveRequestSchema = z.object({
  employee_id: z.string().min(1, "Selecione um funcionário"),
  absence_type_id: z.string().min(1, "Selecione o tipo de ausência"),
  start_date: z.string().min(1, "Data de início é obrigatória"),
  end_date: z.string().min(1, "Data de fim é obrigatória"),
  reason: z.string().max(1000, "Máximo 1000 caracteres").default(""),
}).refine(
  (data) => {
    if (data.start_date && data.end_date) {
      return data.start_date <= data.end_date;
    }
    return true;
  },
  { message: "Data de início deve ser anterior ou igual à data de fim", path: ["start_date"] }
);

export type LeaveRequestFormValues = z.infer<typeof leaveRequestSchema>;
