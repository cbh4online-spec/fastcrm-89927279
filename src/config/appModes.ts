/**
 * App-mode configuration.
 *
 * Controls whether a workspace renders the full FastCRM shell or a minimal
 * "LeadChef" shell (sidebar reduzida + branding LeadChef).
 *
 * Detection:
 * - workspaces.ui_mode = 'fastcrm' | 'leadchef' → forçado
 * - workspaces.ui_mode = 'auto' (default) → derivado dos módulos instalados:
 *     se o workspace tem o módulo 'leadchef' instalado e NÃO tem nenhum
 *     dos módulos listados em FASTCRM_PRODUCT_MODULES → 'leadchef'
 *     caso contrário → 'fastcrm'
 */

export type AppMode = "fastcrm" | "leadchef";

/** Slug do módulo LeadChef no marketplace */
export const LEADCHEF_MODULE_SLUG = "leadchef";

/**
 * Lista de slugs de módulos que sinalizam "FastCRM completo".
 * Se algum destes estiver instalado, o workspace fica em modo 'fastcrm'
 * mesmo que o LeadChef também esteja activo.
 */
export const FASTCRM_PRODUCT_MODULES: string[] = [
  "crm-core",
  "online-store",
  "marketplace",
  "hr-management",
  "whatsapp-business",
  "partner-center",
  "communications-pro",
  "ai-sdr",
  "lead-enrichment-pro",
  "voicehub",
];
