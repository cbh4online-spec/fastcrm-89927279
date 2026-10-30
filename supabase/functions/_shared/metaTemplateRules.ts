// Regras da Meta para modelos de mensagem (partilhadas front + back, sem Deno).

export const META_CATEGORIES = ["UTILITY", "MARKETING", "AUTHENTICATION"] as const;
export type MetaCategory = typeof META_CATEGORIES[number];

export type MetaTemplateDraft = {
  name: string;
  category: MetaCategory;
  language: string;
  header?: string;
  body: string;
  footer?: string;
  examples: string[];
};

/** Variáveis {{1}}, {{2}}… em ordem; devolve o maior índice. */
export function countBodyVariables(body: string): number {
  const nums = Array.from(body.matchAll(/\{\{\s*(\d+)\s*\}\}/g)).map((m) => Number(m[1]));
  return nums.length ? Math.max(...nums) : 0;
}

/** Nome Meta: minúsculas, dígitos e _ (converte espaços/acentos). */
export function toMetaTemplateName(raw: string): string {
  return raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 512);
}

export function validateMetaTemplate(d: MetaTemplateDraft): string[] {
  const errs: string[] = [];
  if (!/^[a-z0-9_]{1,512}$/.test(d.name)) errs.push("O nome só pode ter letras minúsculas, números e _.");
  if (!META_CATEGORIES.includes(d.category)) errs.push("Categoria inválida.");
  if (!/^[a-z]{2}(_[A-Z]{2})?$/.test(d.language)) errs.push("Idioma inválido.");
  const body = d.body.trim();
  if (!body) errs.push("O corpo é obrigatório.");
  if (body.length > 1024) errs.push("O corpo tem mais de 1024 caracteres.");
  if (d.header && d.header.length > 60) errs.push("O cabeçalho tem mais de 60 caracteres.");
  if (d.header && /\{\{/.test(d.header)) errs.push("O cabeçalho não pode ter variáveis.");
  if (d.footer && d.footer.length > 60) errs.push("O rodapé tem mais de 60 caracteres.");
  if (d.footer && /\{\{/.test(d.footer)) errs.push("O rodapé não pode ter variáveis.");
  const n = countBodyVariables(body);
  const found = new Set(Array.from(body.matchAll(/\{\{\s*(\d+)\s*\}\}/g)).map((m) => Number(m[1])));
  for (let i = 1; i <= n; i++) if (!found.has(i)) { errs.push(`Falta a variável {{${i}}} (têm de ser seguidas).`); break; }
  if (d.examples.length < n || d.examples.slice(0, n).some((e) => !e?.trim())) errs.push("Indique um exemplo para cada variável.");
  if (/^\s*\{\{\d+\}\}|\{\{\d+\}\}\s*$/.test(body)) errs.push("O corpo não pode começar nem acabar numa variável.");
  const words = body.replace(/\{\{\s*\d+\s*\}\}/g, " ").split(/\s+/).filter(Boolean).length;
  if (n > 0 && words < n * 3 + 3) errs.push("Escreva mais texto à volta das variáveis (a Meta recusa textos curtos).");
  return errs;
}

export function buildMetaComponents(d: MetaTemplateDraft): unknown[] {
  const comps: unknown[] = [];
  if (d.header?.trim()) comps.push({ type: "HEADER", format: "TEXT", text: d.header.trim() });
  const n = countBodyVariables(d.body);
  comps.push(n > 0
    ? { type: "BODY", text: d.body.trim(), example: { body_text: [d.examples.slice(0, n).map((e) => e.trim())] } }
    : { type: "BODY", text: d.body.trim() });
  if (d.footer?.trim()) comps.push({ type: "FOOTER", text: d.footer.trim() });
  return comps;
}
