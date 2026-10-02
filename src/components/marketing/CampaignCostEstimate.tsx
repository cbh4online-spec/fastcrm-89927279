import { useCostGuardRates } from "@/hooks/useCostGuard";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  recipientCount: number;
}

const FALLBACK_PRICE = 0.0015; // €/email (Resend + 50% margem)

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(v);

/** Custo estimado da campanha com base na tarifa de email ativa. */
export function CampaignCostEstimate({ recipientCount }: Props) {
  const { data: rates = [], isLoading } = useCostGuardRates();
  const rate = (rates as any[]).find((r) => r.usage_type === "email_newsletter");
  const unit = Number(rate?.billable_unit_amount ?? FALLBACK_PRICE);
  const total = unit * Math.max(0, recipientCount || 0);

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 p-4">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Custo estimado do envio</p>
          <p className="text-sm text-muted-foreground">
            {recipientCount} destinatário(s) × {fmt(unit)} por email ({fmt(unit * 1000)} por 1.000)
          </p>
        </div>
        <p className="text-2xl font-bold text-foreground" aria-live="polite">
          {isLoading ? "…" : fmt(total)}
        </p>
      </CardContent>
    </Card>
  );
}
