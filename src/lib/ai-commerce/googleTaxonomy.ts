/**
 * Mapeamento de categorias internas → taxonomia oficial do Google Shopping.
 *
 * O Google Merchant Center aceita `g:google_product_category` como string
 * taxonómica completa (EN) ou como ID numérico. Usamos a string EN porque é
 * estável entre versões da taxonomia e legível em auditoria.
 *
 * Regra: nunca inventar categoria. Se não houver correspondência segura, o
 * campo fica vazio e o validador emite um aviso (não um erro) — a Google
 * infere a categoria, mas a segmentação de campanhas fica pior.
 */

export interface TaxonomyRule {
  /** Palavras-chave (minúsculas, sem acentos) que ativam a regra. */
  keywords: string[];
  /** Caminho completo da taxonomia Google (EN). */
  path: string;
}

/** Normaliza texto para comparação: minúsculas, sem acentos nem pontuação. */
export function normalizeTaxonomyText(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Regras ordenadas por especificidade (as mais específicas primeiro).
 * Cobrem segurança eletrónica, redes, domótica, software e serviços — os
 * domínios efetivamente presentes no catálogo.
 */
export const TAXONOMY_RULES: TaxonomyRule[] = [
  {
    keywords: ["camara ip", "camara de vigilancia", "videovigilancia", "cctv", "dome", "bullet", "nvr", "dvr"],
    path: "Business & Industrial > Work Safety Protective Gear > Surveillance Cameras",
  },
  {
    keywords: ["alarme", "sirene", "detetor de movimento", "detector de movimento", "pir", "central de alarme", "ajax"],
    path: "Hardware > Building Consumables > Security Devices",
  },
  {
    keywords: ["detetor de fumo", "detector de fumo", "deteccao de incendio", "en54", "sprinkler", "extintor"],
    path: "Business & Industrial > Work Safety Protective Gear > Fire Safety Equipment",
  },
  {
    keywords: ["controlo de acesso", "leitor de cartao", "fechadura eletronica", "videoporteiro", "intercomunicador"],
    path: "Hardware > Hardware Accessories > Access Control Devices",
  },
  {
    keywords: ["router", "switch", "access point", "poe", "firewall", "gateway", "modem"],
    path: "Electronics > Networking > Networking Devices",
  },
  {
    keywords: ["cabo", "fibra otica", "utp", "rj45", "conector", "patch panel", "calha"],
    path: "Electronics > Electronics Accessories > Cable Management",
  },
  {
    keywords: ["bateria", "fonte de alimentacao", "ups", "transformador", "carregador"],
    path: "Electronics > Electronics Accessories > Power > Batteries",
  },
  {
    keywords: ["domotica", "smart home", "interruptor inteligente", "tomada inteligente", "termostato"],
    path: "Hardware > Home Automation & Security Devices",
  },
  {
    keywords: ["software", "licenca", "subscricao", "saas", "plataforma", "crm", "app"],
    path: "Software > Computer Software > Business & Productivity Software",
  },
  {
    keywords: ["formacao", "consultoria", "instalacao", "manutencao", "servico", "curso"],
    path: "Business & Industrial",
  },
  {
    keywords: ["ferramenta", "chave de fendas", "alicate", "broca", "furadora"],
    path: "Hardware > Tools",
  },
];

/**
 * Resolve a categoria Google a partir dos campos do produto.
 * Procura por ordem: categoria explícita → subcategoria → tipo de produto → nome.
 */
export function resolveGoogleProductCategory(input: {
  google_product_category?: string | null;
  category?: string | null;
  subcategory?: string | null;
  product_type?: string | null;
  name?: string | null;
}): string {
  const explicit = String(input.google_product_category ?? "").trim();
  if (explicit) return explicit;

  const haystacks = [input.category, input.subcategory, input.product_type, input.name]
    .map(normalizeTaxonomyText)
    .filter(Boolean);

  for (const haystack of haystacks) {
    for (const rule of TAXONOMY_RULES) {
      if (rule.keywords.some((keyword) => haystack.includes(keyword))) return rule.path;
    }
  }
  return "";
}
