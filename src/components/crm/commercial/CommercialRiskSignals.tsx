import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, FileWarning, Receipt } from "lucide-react";
import { useCommercialCycle } from "@/hooks/useCommercialCycle";

interface CommercialRiskSignalsProps {
  entityType: "contact" | "company";
  entityId: string;
}

export function CommercialRiskSignals({ entityType, entityId }: CommercialRiskSignalsProps) {
  const { t } = useTranslation('crm');
  const { data } = useCommercialCycle(entityType, entityId);

  if (!data) return null;

  const signals: { icon: typeof AlertTriangle; label: string; variant: "destructive" | "secondary" }[] = [];

  if (data.invoices.overdue > 0) {
    signals.push({
      icon: Receipt,
      label: t('overdueInvoices', '{{count}} fatura(s) em atraso', { count: data.invoices.overdue }),
      variant: "destructive",
    });
  }

  if (data.opportunities.open > 0 && data.opportunities.winRate < 20 && data.opportunities.total >= 3) {
    signals.push({
      icon: AlertTriangle,
      label: t('lowWinRate', 'Win rate baixo ({{rate}}%)', { rate: data.opportunities.winRate.toFixed(0) }),
      variant: "secondary",
    });
  }

  if (signals.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-destructive">
          <AlertTriangle className="w-4 h-4" />
          {t('riskSignals', 'Sinais de Risco')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {signals.map((signal, i) => (
          <div key={i} className="flex items-center gap-2">
            <signal.icon className="w-3.5 h-3.5 text-muted-foreground" />
            <Badge variant={signal.variant} className="text-[10px]">
              {signal.label}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
