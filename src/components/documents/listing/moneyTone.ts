/**
 * Regras de cor (semáforo) para valores nas listagens IX.
 * Apenas tokens semânticos — nunca cores fixas.
 */

export type MoneyKind = "revenue" | "paid" | "pending" | "overdue" | "neutral";

const ZERO = "text-muted-foreground/60";

/** Classe de texto para um valor monetário, consoante o seu papel. */
export function moneyToneClass(kind: MoneyKind, value: number | null | undefined): string {
  const v = Number(value) || 0;
  if (Math.abs(v) < 0.01) return ZERO;
  switch (kind) {
    case "overdue":
      return "text-destructive";
    case "pending":
      return "text-warning-foreground dark:text-warning";
    case "paid":
      return "text-success dark:text-success";
    case "revenue":
      return "text-foreground";
    default:
      return "text-foreground";
  }
}

/** Classe de badge (fundo + texto) para estados financeiros. */
export function statusToneClass(kind: MoneyKind): string {
  switch (kind) {
    case "overdue":
      return "bg-destructive/10 text-destructive";
    case "pending":
      return "bg-warning/15 text-warning-foreground dark:text-warning";
    case "paid":
      return "bg-success/10 text-success";
    default:
      return "bg-muted text-muted-foreground";
  }
}

/** Escala de cor 0-100 (scores: PARE, ICP, engagement). */
export function scoreToneClass(score: number | null | undefined): string {
  const v = Number(score) || 0;
  if (v <= 0) return ZERO;
  if (v >= 70) return "text-success";
  if (v >= 40) return "text-warning-foreground dark:text-warning";
  return "text-destructive";
}

/** Cor por categoria ABC. */
export function abcToneClass(category?: string | null): string {
  switch ((category || "").toUpperCase()) {
    case "A":
      return "bg-success/10 text-success";
    case "B":
      return "bg-warning/15 text-warning-foreground dark:text-warning";
    case "C":
      return "bg-muted text-muted-foreground";
    default:
      return "";
  }
}

/** Variação percentual entre dois períodos; null quando não é comparável. */
export function variation(current: number, previous: number): number | null {
  const c = Number(current) || 0;
  const p = Number(previous) || 0;
  if (Math.abs(p) < 0.01) return null;
  return ((c - p) / Math.abs(p)) * 100;
}
