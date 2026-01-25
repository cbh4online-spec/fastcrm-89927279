import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Opportunity } from "@/types/opportunity";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

interface OpportunityDetailsGridProps {
  opportunity: Opportunity;
}

export function OpportunityDetailsGrid({ opportunity }: OpportunityDetailsGridProps) {
  const formatCurrency = (value: number, currency: string = "EUR") => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Generate a short ID for display
  const shortId = `OP-${opportunity.id.slice(0, 3).toUpperCase()}`;

  return (
    <div className="space-y-6">
      {/* Opportunity Details */}
      <div>
        <h3 className="text-base font-semibold mb-4">Detalhes da Oportunidade</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-muted-foreground mb-1">ID da Oportunidade</p>
            <p className="text-sm font-medium">{shortId}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Indústria</p>
            <p className="text-sm font-medium">{(opportunity.company as any)?.industry || "Tecnologia"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Data de Fecho</p>
            <p className="text-sm font-medium">
              {opportunity.expected_close_date
                ? format(new Date(opportunity.expected_close_date), "yyyy-MM-dd", { locale: pt })
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Probabilidade de Fecho</p>
            <p className="text-sm font-medium">{opportunity.probability || 50}%</p>
          </div>
        </div>
      </div>

      {/* Financials */}
      <div>
        <h3 className="text-base font-semibold mb-4">Financeiros</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Receita Esperada</p>
            <p className="text-sm font-medium">
              {formatCurrency(Number(opportunity.value) || 0, opportunity.currency || "EUR")}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Desconto Oferecido</p>
            <p className="text-sm font-medium">
              {(opportunity as any).discount_percent || 0}%
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Detalhes Subscrição</p>
            <p className="text-sm font-medium">
              {(opportunity as any).mrr_amount
                ? `${formatCurrency((opportunity as any).mrr_amount, opportunity.currency || "EUR")}/mês`
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Preço Concorrente</p>
            <p className="text-sm font-medium">
              {(opportunity as any).competitor_price
                ? formatCurrency((opportunity as any).competitor_price, opportunity.currency || "EUR")
                : "—"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
