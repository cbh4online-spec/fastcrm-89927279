import { z } from "npm:zod@3.23.8";

const item = z.object({ text: z.string().trim().min(1).max(400), indicator_id: z.string().max(64) });

export const insightsSchema = z.object({
  summary: z.string().trim().min(1).max(1200),
  highlights: z.array(item).max(6).default([]),
  alerts: z.array(item).max(6).default([]),
  objectives_at_risk: z.array(item).max(6).default([]),
  actions: z.array(item).max(5).default([]),
});
export type BgiInsights = z.infer<typeof insightsSchema>;

/** Valida a resposta e remove afirmações sobre indicadores não permitidos. */
export function sanitizeInsights(raw: unknown, allowedIds: ReadonlySet<string>): BgiInsights | null {
  const parsed = insightsSchema.safeParse(raw);
  if (!parsed.success) return null;
  const keep = (xs: { text: string; indicator_id: string }[]) => xs.filter((x) => allowedIds.has(x.indicator_id));
  const v = parsed.data;
  return { summary: v.summary, highlights: keep(v.highlights), alerts: keep(v.alerts), objectives_at_risk: keep(v.objectives_at_risk), actions: keep(v.actions) };
}
