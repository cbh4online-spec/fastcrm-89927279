import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, Calendar, Receipt, ShoppingCart } from "lucide-react";
import { ENIContact } from "../ENIContactTypes";

interface CommercialHistorySectionProps {
  contact: ENIContact;
}

function formatCurrency(value: number | null | undefined): string {
  if (!value) return '€ 0,00';
  return `€ ${value.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`;
}

export function CommercialHistorySection({ contact }: CommercialHistorySectionProps) {
  const stats = [
    {
      label: 'Receita Total',
      value: formatCurrency(contact.total_revenue),
      icon: TrendingUp,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    },
    {
      label: 'Vendas 2024',
      value: formatCurrency(contact.sales_2024),
      icon: BarChart3,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      label: 'Vendas 2025',
      value: formatCurrency(contact.sales_2025),
      icon: BarChart3,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    },
    {
      label: 'Ticket Médio',
      value: formatCurrency(contact.average_ticket),
      icon: Receipt,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Histórico Comercial
            </CardTitle>
            <CardDescription>Dados calculados automaticamente.</CardDescription>
          </div>
          <Badge variant="outline" className="text-xs">automático</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat) => (
            <div 
              key={stat.label} 
              className={`p-3 rounded-lg ${stat.bgColor} flex items-start gap-3`}
            >
              <stat.icon className={`h-5 w-5 ${stat.color} mt-0.5`} />
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-sm font-semibold">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Last Purchase */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShoppingCart className="h-4 w-4" />
            Última Compra
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {contact.last_purchase_date 
                ? new Date(contact.last_purchase_date).toLocaleDateString('pt-PT')
                : 'Sem compras'}
            </span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center pt-2">
          Calculado a partir de propostas aceites e pagamentos confirmados.
        </p>
      </CardContent>
    </Card>
  );
}
