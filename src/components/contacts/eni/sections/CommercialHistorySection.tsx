import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, DollarSign, Calendar, BarChart3, ShoppingCart } from "lucide-react";
import { ENIContact, ABCCategory } from "../ENIContactTypes";
import { cn } from "@/lib/utils";

interface CommercialHistorySectionProps {
  contact: ENIContact;
}

const ABC_COLORS: Record<string, string> = {
  A: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  B: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  C: "bg-slate-500/10 text-slate-600 border-slate-500/30",
};

function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString('pt-PT');
}

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  className?: string;
}

function StatCard({ label, value, icon, className }: StatCardProps) {
  return (
    <div className={cn(
      "flex items-center gap-3 p-4 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors",
      className
    )}>
      <div className="p-2 rounded-md bg-primary/10">
        {icon}
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold">{value}</p>
      </div>
    </div>
  );
}

export function CommercialHistorySection({ contact }: CommercialHistorySectionProps) {
  const abcCategory = contact.abc_category as ABCCategory;

  return (
    <Card className="border-border/50 bg-gradient-to-br from-card to-card/80 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-blue-500/10">
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </div>
            Histórico Comercial
          </CardTitle>
          <div className="flex items-center gap-2">
            {abcCategory && (
              <Badge 
                variant="outline" 
                className={cn("text-xs font-bold", ABC_COLORS[abcCategory])}
              >
                Categoria {abcCategory}
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs">automático</Badge>
          </div>
        </div>
        <CardDescription>Dados automáticos de vendas e faturação.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <StatCard
            label="Receita Total"
            value={formatCurrency(contact.total_revenue)}
            icon={<DollarSign className="h-4 w-4 text-emerald-500" />}
          />
          <StatCard
            label="Vendas 2024"
            value={formatCurrency(contact.sales_2024)}
            icon={<BarChart3 className="h-4 w-4 text-blue-500" />}
          />
          <StatCard
            label="Vendas 2025"
            value={formatCurrency(contact.sales_2025)}
            icon={<BarChart3 className="h-4 w-4 text-indigo-500" />}
          />
          <StatCard
            label="Ticket Médio"
            value={formatCurrency(contact.average_ticket)}
            icon={<ShoppingCart className="h-4 w-4 text-purple-500" />}
          />
          <StatCard
            label="Última Compra"
            value={formatDate(contact.last_purchase_date)}
            icon={<Calendar className="h-4 w-4 text-amber-500" />}
            className="col-span-2 md:col-span-1"
          />
        </div>
      </CardContent>
    </Card>
  );
}
