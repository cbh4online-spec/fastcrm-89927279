/**
 * Variáveis curtas Z-API friendly para templates WhatsApp.
 *
 * Mantém-se compatível com a sintaxe genérica `{{namespace.campo}}`
 * (ver src/lib/templateVariables.ts) mas oferece atalhos curtos e
 * intuitivos para o utilizador final no compositor rápido.
 */

export interface QuickVariableDef {
  key: string; // sem chavetas
  label: string;
  example: string;
  category: "contacto" | "produto" | "loja" | "data" | "remetente";
  description?: string;
}

export const QUICK_VARIABLES: QuickVariableDef[] = [
  { key: "nome", label: "Nome completo", example: "João Silva", category: "contacto" },
  { key: "primeiro_nome", label: "Primeiro nome", example: "João", category: "contacto" },
  { key: "email", label: "Email", example: "joao@exemplo.com", category: "contacto" },
  { key: "telefone", label: "Telefone", example: "+351 912 345 678", category: "contacto" },
  { key: "empresa", label: "Empresa do contacto", example: "Acme, Lda.", category: "contacto" },

  { key: "produto", label: "Nome do produto", example: "iPhone 15 Pro 256GB", category: "produto" },
  { key: "preco", label: "Preço com IVA", example: "1.299,00 €", category: "produto" },
  { key: "preco_promo", label: "Preço promocional", example: "1.099,00 €", category: "produto" },
  { key: "link", label: "Link do produto/checkout", example: "https://loja.exemplo.com/p/xyz", category: "produto" },
  { key: "cupao", label: "Código de cupão", example: "BEMVINDO10", category: "produto" },

  { key: "loja", label: "Nome da loja", example: "Loja Exemplo", category: "loja" },
  { key: "morada_loja", label: "Morada da loja", example: "Rua A, 1, Lisboa", category: "loja" },

  { key: "data", label: "Data atual", example: "10/05/2026", category: "data" },
  { key: "hora", label: "Hora atual", example: "14:30", category: "data" },
  { key: "saudacao", label: "Saudação por hora do dia", example: "Boa tarde", category: "data" },

  { key: "agente", label: "Nome do agente", example: "Ana", category: "remetente" },
];

export const QUICK_VARIABLE_REGEX = /\{\{\s*([\w.-]+)\s*\}\}/g;

/** Contexto que pode ser fornecido ao renderer (todos os campos opcionais). */
export interface QuickVariableContext {
  contact?: { name?: string | null; email?: string | null; phone?: string | null; company?: string | null };
  product?: { name?: string | null; price?: string | null; promoPrice?: string | null; url?: string | null; coupon?: string | null };
  workspace?: { name?: string | null; address?: string | null };
  user?: { name?: string | null };
  /** Overrides explícitos ganham prioridade absoluta sobre tudo o resto. */
  overrides?: Record<string, string>;
}

function saudacao(d = new Date()): string {
  const h = d.getHours();
  if (h < 12) return "Bom dia";
  if (h < 19) return "Boa tarde";
  return "Boa noite";
}

function firstName(full?: string | null): string {
  if (!full) return "";
  return full.trim().split(/\s+/)[0] ?? "";
}

/**
 * Resolve todas as variáveis curtas a partir do contexto, com defaults vazios.
 */
export function resolveQuickVariables(ctx: QuickVariableContext = {}): Record<string, string> {
  const now = new Date();
  const dateStr = now.toLocaleDateString("pt-PT");
  const timeStr = now.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });

  const resolved: Record<string, string> = {
    nome: ctx.contact?.name ?? "",
    primeiro_nome: firstName(ctx.contact?.name),
    email: ctx.contact?.email ?? "",
    telefone: ctx.contact?.phone ?? "",
    empresa: ctx.contact?.company ?? "",

    produto: ctx.product?.name ?? "",
    preco: ctx.product?.price ?? "",
    preco_promo: ctx.product?.promoPrice ?? "",
    link: ctx.product?.url ?? "",
    cupao: ctx.product?.coupon ?? "",

    loja: ctx.workspace?.name ?? "",
    morada_loja: ctx.workspace?.address ?? "",

    data: dateStr,
    hora: timeStr,
    saudacao: saudacao(now),

    agente: ctx.user?.name ?? "",
  };

  if (ctx.overrides) {
    for (const [k, v] of Object.entries(ctx.overrides)) {
      if (typeof v === "string") resolved[k] = v;
    }
  }
  return resolved;
}

/**
 * Renderiza um template usando o resolvedor de variáveis curtas.
 * Variáveis desconhecidas mantêm-se na string original (`{{xpto}}`).
 */
export function renderQuickTemplate(body: string, ctx: QuickVariableContext = {}): string {
  const vars = resolveQuickVariables(ctx);
  return body.replace(QUICK_VARIABLE_REGEX, (raw, key: string) => {
    const v = vars[key];
    return v && v.length > 0 ? v : raw;
  });
}

/** Devolve o conjunto de variáveis (chaves) detetadas no body. */
export function detectQuickVariables(body: string): string[] {
  const found = new Set<string>();
  let m: RegExpExecArray | null;
  const re = new RegExp(QUICK_VARIABLE_REGEX.source, "g");
  while ((m = re.exec(body))) found.add(m[1]);
  return Array.from(found);
}

/** Categorias agrupadas (útil para UI de picker de variáveis). */
export const QUICK_VARIABLE_CATEGORIES: Record<QuickVariableDef["category"], QuickVariableDef[]> = QUICK_VARIABLES.reduce(
  (acc, v) => {
    (acc[v.category] ||= []).push(v);
    return acc;
  },
  {} as Record<QuickVariableDef["category"], QuickVariableDef[]>,
);

/** Biblioteca pronta-a-usar de templates de exemplo (sem dependência da Meta). */
export interface QuickTemplateSeed {
  name: string;
  category: string;
  body: string;
  tags?: string[];
}

export const QUICK_TEMPLATE_SEEDS: QuickTemplateSeed[] = [
  {
    name: "Boas-vindas (curto)",
    category: "boas_vindas",
    tags: ["quick", "boas-vindas"],
    body: "{{saudacao}}, {{primeiro_nome}}! 👋\n\nObrigado pelo teu interesse na {{loja}}. Em que posso ajudar hoje?",
  },
  {
    name: "Produto + Link",
    category: "vendas",
    tags: ["quick", "produto"],
    body: "Olá {{primeiro_nome}}! 🛒\n\nO produto que pediste está disponível:\n*{{produto}}* — {{preco}}\n\nCompra aqui: {{link}}",
  },
  {
    name: "Promoção com cupão",
    category: "vendas",
    tags: ["quick", "promo"],
    body: "🎁 {{primeiro_nome}}, oferta especial só para ti:\n\n*{{produto}}*\nDe ~{{preco}}~ por *{{preco_promo}}*\n\nUsa o código *{{cupao}}* em: {{link}}",
  },
  {
    name: "Recuperar carrinho",
    category: "recuperacao",
    tags: ["quick", "recuperacao"],
    body: "{{primeiro_nome}}, deixaste o *{{produto}}* no teu carrinho 🛒\n\nFinaliza em segurança aqui: {{link}}\n\nSe tiveres dúvidas, basta responder a esta mensagem.",
  },
  {
    name: "Agendamento confirmado",
    category: "operacional",
    tags: ["quick", "agendamento"],
    body: "{{saudacao}}, {{primeiro_nome}} ✅\n\nO teu agendamento está confirmado para *{{data}}* às *{{hora}}*.\n\nObrigado! — {{agente}} ({{loja}})",
  },
  {
    name: "Follow-up pós-venda",
    category: "pos_venda",
    tags: ["quick", "pos-venda"],
    body: "Olá {{primeiro_nome}}! 🙌\n\nTudo bem com o teu *{{produto}}*? Se precisares de apoio, responde aqui que eu ajudo.\n\nObrigado por confiares na {{loja}}.",
  },
];
