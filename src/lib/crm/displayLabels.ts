/** Rótulos pt-PT para valores internos (as chaves na base de dados não mudam). */
const LABELS: Record<string, string> = {
  consumidor_final: "Consumidor final",
  empresa: "Empresa",
  eni: "Empresário em nome individual",
  new: "Novo",
  contacted: "Contactado",
  qualified: "Qualificado",
  customer: "Cliente",
  owner: "Proprietário",
  admin: "Administrador",
  agent: "Agente",
  viewer: "Leitor",
  medium: "Média",
  high: "Alta",
  low: "Baixa",
};
export function displayLabel(value?: string | null): string {
  if (!value) return "—";
  return LABELS[value] ?? LABELS[value.toLowerCase()] ?? value;
}
/** Singular/plural pt-PT: plural(1,"contacto","contactos") → "1 contacto". */
export function plural(n: number, one: string, many: string): string {
  return `${n.toLocaleString("pt-PT")} ${n === 1 ? one : many}`;
}
