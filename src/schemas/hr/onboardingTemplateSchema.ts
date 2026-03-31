import { z } from "zod";

export const onboardingStartSchema = z.object({
  employee_id: z.string().min(1, "Selecione um colaborador"),
  template_id: z.string().min(1, "Selecione um template"),
  buddy_id: z.string().nullable().default(null),
  expected_end_date: z.string().default(""),
});

export type OnboardingStartFormValues = z.infer<typeof onboardingStartSchema>;

export const onboardingTemplateSchema = z.object({
  name: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres").max(100, "Máximo 100 caracteres"),
  description: z.string().max(500, "Máximo 500 caracteres").default(""),
});

export type OnboardingTemplateFormValues = z.infer<typeof onboardingTemplateSchema>;

export const taskTemplateSchema = z.object({
  title: z.string().trim().min(1, "Título é obrigatório").max(200, "Máximo 200 caracteres"),
  description: z.string().max(1000, "Máximo 1000 caracteres").default(""),
  category: z.enum(["hr", "it", "manager", "team", "self"]).default("hr"),
  due_offset_days: z.coerce.number().min(0, "Mínimo 0 dias").max(365, "Máximo 365 dias").default(0),
});

export type TaskTemplateFormValues = z.infer<typeof taskTemplateSchema>;
