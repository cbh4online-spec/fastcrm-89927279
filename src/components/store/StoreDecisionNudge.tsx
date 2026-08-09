import { AlertCircle } from "lucide-react";

interface StoreDecisionNudgeProps {
  trackStock?: boolean | null;
  stockQuantity?: number | null;
  isOutOfStock?: boolean;
  promoEndsAt?: string | null;
  soldLabel?: string | null;
}

/**
 * Aviso único de decisão. Substitui vários avisos dispersos por uma só mensagem,
 * escolhida por prioridade e sempre baseada em dados reais do produto.
 */
export function StoreDecisionNudge({
  trackStock,
  stockQuantity,
  isOutOfStock,
  promoEndsAt,
  soldLabel,
}: StoreDecisionNudgeProps) {
  if (isOutOfStock) return null;

  let message: string | null = null;

  if (trackStock && typeof stockQuantity === "number" && stockQuantity > 0 && stockQuantity <= 5) {
    message = `Restam apenas ${stockQuantity} unidade${stockQuantity > 1 ? "s" : ""} em stock.`;
  } else if (promoEndsAt) {
    const end = new Date(promoEndsAt);
    if (!Number.isNaN(end.getTime()) && end.getTime() > Date.now()) {
      const hours = Math.max(1, Math.round((end.getTime() - Date.now()) / 3_600_000));
      message =
        hours <= 48
          ? `Promoção termina em cerca de ${hours} hora${hours > 1 ? "s" : ""}.`
          : `Promoção válida até ${end.toLocaleDateString("pt-PT")}.`;
    }
  }

  if (!message && soldLabel) message = `${soldLabel} nesta loja.`;
  if (!message) return null;

  return (
    <div
      role="status"
      className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
