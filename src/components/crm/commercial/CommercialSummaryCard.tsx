import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, FileText, Receipt, TrendingUp } from "lucide-react";
import { useCommercialCycle } from "@/hooks/useCommercialCycle";
import { formatRelativeTime } from "@/lib/formatters";
import { Skeleton } from "@/components/ui/skeleton";

interface CommercialSummaryCardProps {
  entityType: "contact" | "company";
  entityId: string;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value);
}

export function CommercialSummaryCard({ entityType, entityId }: CommercialSummaryCardProps) {
  const { t } = useTranslation('crm');
  const { data, isLoading } = useCommercialCycle(entityType, entityId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            {t('commercialSummary', 'Resumo Comercial')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  if (!data || (data.opportunities.total === 0 && data.proposals.total === 0 && data.invoices.total === 0)) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          {t('commercialSummary', 'Resumo Comercial')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pipeline */}
        {data.opportunities.total > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Briefcase className="w-3.5 h-3.5" />
              {t('pipeline', 'Pipeline')}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">{t('open', 'Abertas')}: </span>
                <span className="font-medium">{data.opportunities.open}</span>
                {data.opportunities.openValue > 0 && (
                  <span className="text-muted-foreground"> ({formatCurrency(data.opportunities.openValue)})</span>
                )}
              </div>
              <div>
                <span className="text-muted-foreground">{t('wonShort', 'Ganhas')}: </span>
                <span className="font-medium">{data.opportunities.won}</span>
              </div>
              <div>
                <span className="text-muted-foreground">{t('winRate', 'Win Rate')}: </span>
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                  {data.opportunities.winRate.toFixed(0)}%
                </Badge>
              </div>
              {data.opportunities.wonValue > 0 && (
                <div>
                  <span className="text-muted-foreground">{t('revenue', 'Revenue')}: </span>
                  <span className="font-medium">{formatCurrency(data.opportunities.wonValue)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Proposals */}
        {data.proposals.total > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <FileText className="w-3.5 h-3.5" />
              {t('proposals', 'Propostas')}
            </div>
            <div className="text-xs">
              <span className="text-muted-foreground">{t('sent', 'Enviadas')}: </span>
              <span className="font-medium">{data.proposals.sent}</span>
              <span className="mx-2 text-muted-foreground">·</span>
              <span className="text-muted-foreground">{t('accepted', 'Aceites')}: </span>
              <span className="font-medium">{data.proposals.accepted}</span>
            </div>
          </div>
        )}

        {/* Invoices */}
        {data.invoices.total > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Receipt className="w-3.5 h-3.5" />
              {t('invoicing', 'Faturação')}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">{t('paid', 'Pagas')}: </span>
                <span className="font-medium">{data.invoices.paid}</span>
              </div>
              <div>
                <span className="text-muted-foreground">{t('pending', 'Pendentes')}: </span>
                <span className="font-medium">{data.invoices.pending}</span>
              </div>
              {data.invoices.overdue > 0 && (
                <div className="col-span-2">
                  <Badge variant="destructive" className="text-[10px]">
                    {data.invoices.overdue} {t('overdue', 'em atraso')}
                  </Badge>
                </div>
              )}
              <div className="col-span-2">
                <span className="text-muted-foreground">{t('totalRevenue', 'Total')}: </span>
                <span className="font-medium">{formatCurrency(data.invoices.paidRevenue)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Last activity */}
        {data.lastActivityAt && (
          <div className="text-[11px] text-muted-foreground pt-1 border-t">
            {t('lastCommercialActivity', 'Última atividade comercial')}: {formatRelativeTime(data.lastActivityAt)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
