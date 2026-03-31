export interface PreflightResult {
  errors: PreflightItem[];
  warnings: PreflightItem[];
  score: number;
}

export interface PreflightItem {
  code: string;
  message: string;
}

interface FunnelData {
  slug?: string;
  consent_required?: boolean;
  consent_text?: string;
  privacy_policy_url?: string;
  seo_title?: string;
  seo_description?: string;
  og_image_url?: string;
}

interface StepData {
  id: string;
  name: string;
  step_type: string;
  sort_order: number;
  content: Record<string, unknown>;
}

const FORM_STEP_TYPES = ["optin", "squeeze", "application"];

export function runFunnelPreflight(funnel: FunnelData, steps: StepData[]): PreflightResult {
  const errors: PreflightItem[] = [];
  const warnings: PreflightItem[] = [];

  // Slug
  if (!funnel.slug?.trim()) {
    errors.push({ code: "slug_empty", message: "O funil não tem slug definido." });
  } else if (!/^[a-z0-9-]+$/.test(funnel.slug)) {
    errors.push({ code: "slug_invalid", message: "O slug contém caracteres inválidos." });
  }

  // Steps
  if (steps.length === 0) {
    errors.push({ code: "no_steps", message: "O funil não tem nenhum step." });
  }

  // Step order
  const orders = steps.map(s => s.sort_order);
  const uniqueOrders = new Set(orders);
  if (uniqueOrders.size !== orders.length) {
    warnings.push({ code: "duplicate_order", message: "Existem steps com a mesma ordem." });
  }

  // Form steps validation
  for (const step of steps) {
    if (FORM_STEP_TYPES.includes(step.step_type)) {
      const content = step.content || {};
      const formFields = content.form_fields as unknown[];
      if (!formFields || !Array.isArray(formFields) || formFields.length === 0) {
        errors.push({
          code: "form_empty",
          message: `Step "${step.name}" (${step.step_type}) não tem campos de formulário.`,
        });
      }
    }

    // Empty content check
    const content = step.content || {};
    if (!content.headline && !content.body && !content.form_fields) {
      warnings.push({
        code: "step_empty",
        message: `Step "${step.name}" não tem conteúdo (título, corpo ou formulário).`,
      });
    }
  }

  // Consent validation
  if (funnel.consent_required) {
    if (!funnel.consent_text?.trim()) {
      errors.push({ code: "consent_no_text", message: "Consentimento obrigatório mas sem texto de consentimento." });
    }
    if (!funnel.privacy_policy_url?.trim()) {
      errors.push({ code: "consent_no_privacy", message: "Consentimento obrigatório mas sem URL de Política de Privacidade." });
    }
  }

  // SEO warnings
  if (!funnel.seo_title?.trim()) {
    warnings.push({ code: "no_seo_title", message: "Sem título SEO definido." });
  }
  if (!funnel.seo_description?.trim()) {
    warnings.push({ code: "no_seo_description", message: "Sem descrição SEO definida." });
  }
  if (!funnel.og_image_url?.trim()) {
    warnings.push({ code: "no_og_image", message: "Sem imagem OG definida." });
  }

  // Score: start at 100, subtract for issues
  const totalChecks = 10;
  const failedChecks = errors.length + warnings.length * 0.5;
  const score = Math.max(0, Math.round(((totalChecks - failedChecks) / totalChecks) * 100));

  return { errors, warnings, score };
}
