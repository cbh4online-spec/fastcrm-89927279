export interface PreflightItem {
  key: string;
  label: string;
  severity: "error" | "warning";
  passed: boolean;
}

export interface PreflightResult {
  items: PreflightItem[];
  errors: PreflightItem[];
  warnings: PreflightItem[];
  score: number; // 0-100
  canPublish: boolean;
}

interface PreflightEbook {
  title?: string;
  slug?: string;
  chapters?: { id: string; title: string; content?: string }[];
  cover_url?: string | null;
  lead_gate_enabled?: boolean;
  consent_required?: boolean;
  consent_text?: string | null;
  privacy_policy_url?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  contact_page?: { email?: string; phone?: string; website?: string } | null;
}

interface PreflightCta {
  label: string;
  target_url?: string | null;
  is_active: boolean;
  cta_type: string;
}

export function runPreflight(ebook: PreflightEbook, ctas: PreflightCta[] = []): PreflightResult {
  const items: PreflightItem[] = [];

  // Errors (bloqueantes)
  items.push({
    key: "title",
    label: "Título do eBook preenchido",
    severity: "error",
    passed: !!(ebook.title && ebook.title.trim().length > 0),
  });

  items.push({
    key: "slug",
    label: "Slug válido",
    severity: "error",
    passed: !!(ebook.slug && /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(ebook.slug)),
  });

  const chapters = ebook.chapters || [];
  items.push({
    key: "has_chapters",
    label: "Pelo menos 1 capítulo",
    severity: "error",
    passed: chapters.length > 0,
  });

  const emptyChapters = chapters.filter(ch => !ch.content || ch.content.trim().length < 50);
  items.push({
    key: "chapters_content",
    label: "Capítulos com conteúdo mínimo (50 chars)",
    severity: "error",
    passed: emptyChapters.length === 0,
  });

  if (ebook.lead_gate_enabled && ebook.consent_required) {
    items.push({
      key: "consent_text",
      label: "Texto de consentimento configurado (consentimento obrigatório)",
      severity: "error",
      passed: !!(ebook.consent_text && ebook.consent_text.trim().length > 0),
    });
    items.push({
      key: "privacy_policy_url",
      label: "URL da política de privacidade (consentimento obrigatório)",
      severity: "error",
      passed: !!(ebook.privacy_policy_url && ebook.privacy_policy_url.trim().length > 0),
    });
  } else if (ebook.lead_gate_enabled) {
    items.push({
      key: "consent_text",
      label: "Texto de consentimento configurado (lead gate ativo)",
      severity: "warning",
      passed: !!(ebook.consent_text && ebook.consent_text.trim().length > 0),
    });
  }

  const activeCtas = ctas.filter(c => c.is_active);
  const ctasWithoutUrl = activeCtas.filter(c => c.cta_type !== "contact" && (!c.target_url || !c.target_url.trim()));
  if (activeCtas.length > 0) {
    items.push({
      key: "cta_urls",
      label: "CTAs ativos com URL válido",
      severity: "error",
      passed: ctasWithoutUrl.length === 0,
    });
  }

  // Warnings (não bloqueantes)
  items.push({
    key: "cover",
    label: "Capa do eBook definida",
    severity: "warning",
    passed: !!ebook.cover_url,
  });

  items.push({
    key: "seo_title",
    label: "SEO título configurado",
    severity: "warning",
    passed: !!(ebook.seo_title && ebook.seo_title.trim().length > 0),
  });

  items.push({
    key: "seo_description",
    label: "SEO descrição configurada",
    severity: "warning",
    passed: !!(ebook.seo_description && ebook.seo_description.trim().length > 0),
  });

  const shortChapters = chapters.filter(ch => ch.content && ch.content.trim().length >= 50 && ch.content.trim().length < 200);
  items.push({
    key: "chapters_short",
    label: "Capítulos com conteúdo substancial (200+ chars)",
    severity: "warning",
    passed: shortChapters.length === 0,
  });

  const contactCtas = activeCtas.filter(c => c.cta_type === "contact");
  if (contactCtas.length > 0) {
    items.push({
      key: "contact_page",
      label: "Página de contacto configurada (CTA tipo contacto)",
      severity: "warning",
      passed: !!(ebook.contact_page?.email || ebook.contact_page?.phone),
    });
  }

  const errors = items.filter(i => i.severity === "error" && !i.passed);
  const warnings = items.filter(i => i.severity === "warning" && !i.passed);
  const passed = items.filter(i => i.passed).length;
  const score = items.length > 0 ? Math.round((passed / items.length) * 100) : 100;

  return {
    items,
    errors,
    warnings,
    score,
    canPublish: errors.length === 0,
  };
}
