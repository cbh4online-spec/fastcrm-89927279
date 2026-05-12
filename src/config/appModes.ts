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

/**
 * Whitelist de routes visíveis no sidebar/search quando em modo 'leadchef'.
 * - keys: chaves explícitas do RouteEntry
 * - hrefPrefixes: prefixos de path para o guard de rotas
 */
export const LEADCHEF_MODE_WHITELIST = {
  keys: new Set<string>([
    "leadchef",
    "leadchef-admin",
    "inbox",
    "calendar",
    "settings-main",
    "profile",
    "settings-team",
    "settings-billing",
    "settings-workspace",
  ]),
  hrefPrefixes: [
    "/dashboard/leadchef",
    "/dashboard/inbox",
    "/dashboard/scheduling",
    "/dashboard/profile",
    "/settings",
  ],
};

/** Path para onde o guard redireciona quando a rota não é permitida */
export const LEADCHEF_HOME_PATH = "/dashboard/leadchef/today";
