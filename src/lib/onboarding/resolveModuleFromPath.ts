/**
 * Resolve module slug + display name from a URL pathname.
 * Used by the global onboarding shortcut (Shift+G) to open the right guide
 * for whatever screen the user is on.
 *
 * Order matters — first match wins. Use the most specific prefixes first.
 */
export interface ResolvedModule {
  slug: string;
  name: string;
}

const RULES: Array<{ test: RegExp; slug: string; name: string }> = [
  // CRM
  { test: /^\/dashboard\/contacts/, slug: "contacts", name: "Contactos" },
  { test: /^\/dashboard\/leads/, slug: "leads", name: "Leads" },
  { test: /^\/dashboard\/opportunities|^\/dashboard\/pipeline/, slug: "pipeline", name: "Pipeline" },
  { test: /^\/dashboard\/deals/, slug: "deals", name: "Negócios" },
  { test: /^\/dashboard\/clients/, slug: "clients", name: "Clientes" },
  { test: /^\/dashboard\/proposals/, slug: "proposals", name: "Propostas" },
  { test: /^\/dashboard\/tasks/, slug: "tasks", name: "Tarefas" },
  { test: /^\/dashboard\/calendar|^\/dashboard\/agenda/, slug: "calendar", name: "Calendário" },

  // Comms
  { test: /^\/dashboard\/inbox/, slug: "inbox", name: "Inbox" },
  { test: /^\/dashboard\/email-marketing|^\/dashboard\/campaigns/, slug: "email-marketing", name: "Email Marketing" },
  { test: /^\/dashboard\/whatsapp/, slug: "whatsapp", name: "WhatsApp" },
  { test: /^\/dashboard\/sms/, slug: "sms", name: "SMS" },

  // Sales / commerce
  { test: /^\/dashboard\/products|^\/dashboard\/catalog/, slug: "products", name: "Produtos" },
  { test: /^\/dashboard\/orders/, slug: "orders", name: "Encomendas" },
  { test: /^\/dashboard\/invoices/, slug: "invoices", name: "Faturas" },
  { test: /^\/dashboard\/store/, slug: "store", name: "Loja" },
  { test: /^\/dashboard\/checkout/, slug: "checkout", name: "Checkout" },

  // Ops
  { test: /^\/dashboard\/automations/, slug: "automations", name: "Automações" },
  { test: /^\/dashboard\/reports/, slug: "reports", name: "Relatórios" },
  { test: /^\/dashboard\/intelligence/, slug: "intelligence", name: "Intelligence" },
  { test: /^\/dashboard\/team/, slug: "team", name: "Equipa" },
  { test: /^\/dashboard\/hr/, slug: "hr", name: "RH" },
  { test: /^\/dashboard\/security/, slug: "security", name: "Segurança" },
  { test: /^\/dashboard\/knowledge/, slug: "knowledge-base", name: "Base de Conhecimento" },
  { test: /^\/dashboard\/ai/, slug: "ai", name: "IA" },

  // Fallback for any /dashboard root → general dashboard guide
  { test: /^\/dashboard\/?$/, slug: "dashboard", name: "Dashboard" },
];

export function resolveModuleFromPath(pathname: string): ResolvedModule | null {
  for (const r of RULES) {
    if (r.test.test(pathname)) return { slug: r.slug, name: r.name };
  }
  // Final fallback: derive from first /dashboard segment
  const m = pathname.match(/^\/dashboard\/([^/?#]+)/);
  if (m) {
    const slug = m[1].toLowerCase();
    return { slug, name: slug.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) };
  }
  return null;
}
