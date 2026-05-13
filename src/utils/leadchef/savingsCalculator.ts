/**
 * LeadChef — Calculadora de poupança Demo Bebé.
 * Quantidades ajustáveis por lead; preços por unidade fixos (alinhados com
 * o template "Poupança mensal — Demo Bebé").
 */

export interface SavingsItem {
  key: "boioes" | "papas" | "sopas";
  label: string;
  unitLabel: string; // singular para a frase "por X"
  emoji: string;
  marketPrice: number; // EUR/un
  bimbyPrice: number; // EUR/un
}

export const SAVINGS_ITEMS: SavingsItem[] = [
  {
    key: "boioes",
    label: "Boiões de Maçã",
    unitLabel: "boião",
    emoji: "🍼",
    marketPrice: 0.5,
    bimbyPrice: 0.16,
  },
  {
    key: "papas",
    label: "Papas de Farinha de Arroz",
    unitLabel: "papa",
    emoji: "🥣",
    marketPrice: 0.53,
    bimbyPrice: 0.19,
  },
  {
    key: "sopas",
    label: "Sopas fora de casa",
    unitLabel: "dose",
    emoji: "🥕",
    marketPrice: 1.99,
    bimbyPrice: 0.5,
  },
];

export type SavingsQuantities = Record<SavingsItem["key"], number>;

export const DEFAULT_QUANTITIES: SavingsQuantities = {
  boioes: 30,
  papas: 15,
  sopas: 4,
};

export interface SavingsLine {
  item: SavingsItem;
  qty: number;
  unitSaving: number;
  monthly: number;
}

export interface SavingsResult {
  lines: SavingsLine[];
  totalMonthly: number;
  totalYearly: number;
}

export function calcSavings(qty: SavingsQuantities): SavingsResult {
  const lines: SavingsLine[] = SAVINGS_ITEMS.map((item) => {
    const q = Math.max(0, Math.floor(Number(qty[item.key]) || 0));
    const unitSaving = item.marketPrice - item.bimbyPrice;
    return { item, qty: q, unitSaving, monthly: q * unitSaving };
  });
  const totalMonthly = lines.reduce((s, l) => s + l.monthly, 0);
  return { lines, totalMonthly, totalYearly: totalMonthly * 12 };
}

const fmt = (v: number) =>
  v.toLocaleString("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + "€";

export const formatEuro = fmt;

export const NAME_MAX_LENGTH = 40;
// Letras (com acentos), espaços, hífens e apóstrofos.
export const NAME_REGEX = /^[\p{L}][\p{L}\s'’-]*$/u;

export function sanitizeName(raw: unknown): string {
  if (raw === undefined || raw === null) return "";
  const s = String(raw)
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return s.slice(0, NAME_MAX_LENGTH);
}

export function validateName(raw: unknown): { ok: true; value: string } | { ok: false; error: string } {
  const value = sanitizeName(raw);
  if (!value) return { ok: true, value: "" };
  if (value.length < 2) return { ok: false, error: "Mínimo 2 caracteres." };
  if (value.length > NAME_MAX_LENGTH) return { ok: false, error: `Máximo ${NAME_MAX_LENGTH} caracteres.` };
  if (!NAME_REGEX.test(value)) return { ok: false, error: "Apenas letras, espaços, hífens e apóstrofos." };
  return { ok: true, value };
}

export interface RenderSavingsOptions {
  agentName?: string | null;
  babyName?: string | null;
}

export function renderSavingsMessage(
  result: SavingsResult,
  options: RenderSavingsOptions = {},
): string {
  const agentName = sanitizeName(options.agentName);
  const babyName = sanitizeName(options.babyName);


  const blocks = result.lines
    .filter((l) => l.qty > 0)
    .map(
      (l) =>
        `${l.item.emoji} *${l.qty} ${l.item.label} / mês*\n` +
        `• Compra: ${fmt(l.item.marketPrice)} cada\n` +
        `• Bimby: ${fmt(l.item.bimbyPrice)} cada\n` +
        `• Poupança por ${l.item.unitLabel}: *${fmt(l.unitSaving)}*\n` +
        `  ➡️ *Poupança mensal: ${fmt(l.monthly)}*`,
    );

  const title = babyName
    ? `*POUPANÇA MENSAL — ${babyName.toUpperCase()}* 👶`
    : "*POUPANÇA MENSAL — DEMO BEBÉ* 👶";

  const intro = babyName
    ? `Olá! Fiz as contas da poupança mensal para a/o *${babyName}* 👇\n\n`
    : "";

  const signature = agentName ? `\n\nUm abraço,\n*${agentName}* 💚` : "";

  return (
    title + "\n\n" +
    intro +
    (blocks.length ? blocks.join("\n\n") + "\n\n" : "") +
    "*TOTAL POUPADO POR MÊS*\n" +
    `💚 *${fmt(result.totalMonthly)}*\n\n` +
    `_Por ano isso são *${fmt(result.totalYearly)}*._\n\n` +
    "—\n\n" +
    "_E isto sem contar com a restante família._\n\n" +
    "Na receita _“boiões da semana”_ consegues preparar *13 refeições em apenas 30 minutos*.\n\n" +
    "👉 Caro e cansativo é mesmo *não ter uma Bimby* numa fase que devia ser a melhor das nossas vidas." +
    signature
  );
}

