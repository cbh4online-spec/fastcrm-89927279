/**
 * Engine de expansão de variáveis para snippets do Inbox.
 * Substitui ocorrências de {{variavel}} no texto com base num contexto.
 *
 * Variáveis suportadas (case-insensitive, espaços/underscores aceites):
 *  - nome / nome_completo        → nome do contacto
 *  - primeiro_nome               → primeiro token do nome
 *  - email                       → email do contacto
 *  - telefone / phone            → telefone do contacto
 *  - empresa / company           → empresa do contacto
 *  - agente                      → nome do operador atual
 *  - data                        → data de hoje (pt-PT, dd/mm/aaaa)
 *  - hora                        → hora actual (HH:mm)
 *  - saudacao                    → "Bom dia" / "Boa tarde" / "Boa noite"
 */

export interface SnippetVariableContext {
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  contactCompany?: string | null;
  agentName?: string | null;
  /** Variáveis customizadas adicionais, opcional. */
  extra?: Record<string, string | number | null | undefined>;
}

export interface ExpandResult {
  text: string;
  /** Variáveis encontradas no template original. */
  found: string[];
  /** Variáveis que ficaram por resolver (mantêm-se literais). */
  unresolved: string[];
}

const VARIABLE_RE = /\{\{\s*([a-zA-Z0-9_\s]+?)\s*\}\}/g;

function normalizeKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "_");
}

function timeGreeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return "Bom dia";
  if (h < 19) return "Boa tarde";
  return "Boa noite";
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

export function buildVariableMap(
  ctx: SnippetVariableContext,
  now: Date = new Date(),
): Record<string, string> {
  const fullName = (ctx.contactName ?? "").trim();
  const firstName = fullName.split(/\s+/).filter(Boolean)[0] ?? "";

  const map: Record<string, string> = {
    nome: fullName,
    nome_completo: fullName,
    primeiro_nome: firstName,
    email: ctx.contactEmail ?? "",
    telefone: ctx.contactPhone ?? "",
    phone: ctx.contactPhone ?? "",
    empresa: ctx.contactCompany ?? "",
    company: ctx.contactCompany ?? "",
    agente: ctx.agentName ?? "",
    data: `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`,
    hora: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
    saudacao: timeGreeting(now),
  };

  if (ctx.extra) {
    for (const [k, v] of Object.entries(ctx.extra)) {
      if (v == null) continue;
      map[normalizeKey(k)] = String(v);
    }
  }

  return map;
}

export function expandSnippetVariables(
  template: string,
  ctx: SnippetVariableContext,
  now: Date = new Date(),
): ExpandResult {
  const map = buildVariableMap(ctx, now);
  const found: string[] = [];
  const unresolved: string[] = [];

  const text = template.replace(VARIABLE_RE, (match, rawKey: string) => {
    const key = normalizeKey(rawKey);
    found.push(key);
    const value = map[key];
    if (value !== undefined && value !== "") {
      return value;
    }
    unresolved.push(key);
    return match; // mantém literal {{xxx}} para o operador editar
  });

  return { text, found, unresolved };
}

/** Lista canónica de variáveis disponíveis para mostrar na UI. */
export const AVAILABLE_VARIABLES: Array<{ key: string; label: string; example: string }> = [
  { key: "nome", label: "Nome do contacto", example: "João Silva" },
  { key: "primeiro_nome", label: "Primeiro nome", example: "João" },
  { key: "email", label: "Email do contacto", example: "joao@empresa.pt" },
  { key: "telefone", label: "Telefone", example: "+351 912 345 678" },
  { key: "empresa", label: "Empresa", example: "Empresa Lda" },
  { key: "agente", label: "Nome do operador", example: "Maria" },
  { key: "saudacao", label: "Saudação automática", example: "Bom dia" },
  { key: "data", label: "Data de hoje", example: "05/05/2026" },
  { key: "hora", label: "Hora actual", example: "14:30" },
];
