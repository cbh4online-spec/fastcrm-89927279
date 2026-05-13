/**
 * LeadChef — Auto Pós-Demo
 * Configuração armazenada em leadchef_app_config.features.auto_post_demo:
 *   { enabled: boolean, template_id: string | null, delay_hours: number }
 */
export interface LeadChefAutoPostDemoConfig {
  enabled: boolean;
  template_id: string | null;
  delay_hours: number;
}

export const DEFAULT_AUTO_POST_DEMO: LeadChefAutoPostDemoConfig = {
  enabled: true,
  template_id: null,
  delay_hours: 24,
};

export function readAutoPostDemoConfig(features: unknown): LeadChefAutoPostDemoConfig {
  const f = (features ?? {}) as Record<string, any>;
  const v = f.auto_post_demo ?? {};
  return {
    enabled: typeof v.enabled === "boolean" ? v.enabled : DEFAULT_AUTO_POST_DEMO.enabled,
    template_id: typeof v.template_id === "string" ? v.template_id : null,
    delay_hours:
      typeof v.delay_hours === "number" && v.delay_hours > 0
        ? v.delay_hours
        : DEFAULT_AUTO_POST_DEMO.delay_hours,
  };
}

/** Render simples de variáveis {{firstName}} {{agentName}} {{appointmentDate}} {{appointmentTime}}. */
export function renderTemplateBody(
  body: string,
  ctx: {
    firstName?: string | null;
    agentName?: string | null;
    appointmentDate?: string | null;
    appointmentTime?: string | null;
    referrerName?: string | null;
  },
): string {
  const map: Record<string, string> = {
    firstName: (ctx.firstName ?? "").split(/\s+/)[0] ?? "",
    agentName: ctx.agentName ?? "",
    appointmentDate: ctx.appointmentDate ?? "",
    appointmentTime: ctx.appointmentTime ?? "",
    referrerName: (ctx.referrerName ?? "").split(/\s+/)[0] ?? "",
  };
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => map[k] ?? "");
}
