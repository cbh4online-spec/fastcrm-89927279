import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, DollarSign, Calendar, BarChart3, ShoppingCart, Clock } from "lucide-react";
import { ENIContact, ABCCategory } from "../ENIContactTypes";
import { InlineEditableField } from "@/components/custom-fields/InlineEditableField";
import { cn } from "@/lib/utils";

interface CommercialHistorySectionProps {
  contact: ENIContact;
  onFieldChange: (field: keyof ENIContact, value: unknown) => Promise<void>;
}

const ABC_COLORS: Record<string, string> = {
  A: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  B: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  C: "bg-slate-500/10 text-slate-600 border-slate-500/30",
};

const ABC_CATEGORIES = ['A', 'B', 'C'];

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getTimeAgo(dateString: string | null | undefined): string {
  if (!dateString) return "";
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return "agora mesmo";
  if (diffInSeconds < 3600) return `há ${Math.floor(diffInSeconds / 60)} min`;
  if (diffInSeconds < 86400) return `há ${Math.floor(diffInSeconds / 3600)} horas`;
  if (diffInSeconds < 604800) return `há ${Math.floor(diffInSeconds / 86400)} dias`;
  
  return formatDate(dateString);
}

export function CommercialHistorySection({ contact, onFieldChange }: CommercialHistorySectionProps) {
  const abcCategory = contact.abc_category as ABCCategory;
  const lastUpdated = contact.commercial_history_updated_at;

  return (
    <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-card to-card/95">
      <CardHeader className="pb-3 bg-gradient-to-r from-blue-500/10 via-transparent to-transparent">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-600 dark:text-blue-400">
              <TrendingUp className="w-4 h-4" />
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
          </div>
        </div>
        {lastUpdated && (
          <CardDescription className="flex items-center gap-1.5 mt-1">
            <Clock className="w-3 h-3" />
            Atualizado {getTimeAgo(lastUpdated)}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="divide-y divide-border/50">
          {/* Editable Category */}
          <InlineEditableField
            label="Categoria ABC"
            fieldId="abc_category"
            fieldType="select"
            value={contact.abc_category}
            onChange={(val) => onFieldChange("abc_category", val)}
            icon={<TrendingUp className="w-4 h-4" />}
            options={ABC_CATEGORIES}
          />
          
          {/* Editable Year Sales */}
          <InlineEditableField
            label="Vendas 2026"
            fieldId="sales_2026"
            fieldType="currency"
            value={contact.sales_2026}
            onChange={(val) => onFieldChange("sales_2026", val)}
            icon={<BarChart3 className="w-4 h-4" />}
            placeholder="0.00"
          />
          
          <InlineEditableField
            label="Vendas 2025"
            fieldId="sales_2025"
            fieldType="currency"
            value={contact.sales_2025}
            onChange={(val) => onFieldChange("sales_2025", val)}
            icon={<BarChart3 className="w-4 h-4" />}
            placeholder="0.00"
          />
          
          <InlineEditableField
            label="Vendas 2024"
            fieldId="sales_2024"
            fieldType="currency"
            value={contact.sales_2024}
            onChange={(val) => onFieldChange("sales_2024", val)}
            icon={<BarChart3 className="w-4 h-4" />}
            placeholder="0.00"
          />
          
          <InlineEditableField
            label="Vendas 2023"
            fieldId="sales_2023"
            fieldType="currency"
            value={contact.sales_2023}
            onChange={(val) => onFieldChange("sales_2023", val)}
            icon={<BarChart3 className="w-4 h-4" />}
            placeholder="0.00"
          />
          
          {/* Total Revenue - Editable or Auto */}
          <InlineEditableField
            label="Receita Total"
            fieldId="total_revenue"
            fieldType="currency"
            value={contact.total_revenue}
            onChange={(val) => onFieldChange("total_revenue", val)}
            icon={<DollarSign className="w-4 h-4" />}
            placeholder="0.00"
          />
          
          {/* Average Ticket */}
          <InlineEditableField
            label="Ticket Médio"
            fieldId="average_ticket"
            fieldType="currency"
            value={contact.average_ticket}
            onChange={(val) => onFieldChange("average_ticket", val)}
            icon={<ShoppingCart className="w-4 h-4" />}
            placeholder="0.00"
          />
          
          {/* Last Purchase Date */}
          <InlineEditableField
            label="Última Compra"
            fieldId="last_purchase_date"
            fieldType="date"
            value={contact.last_purchase_date}
            onChange={(val) => onFieldChange("last_purchase_date", val)}
            icon={<Calendar className="w-4 h-4" />}
          />
        </div>
      </CardContent>
    </Card>
  );
}
