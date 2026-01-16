import { useEffect, useMemo, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, DollarSign, Calendar, BarChart3, ShoppingCart, Clock, Calculator } from "lucide-react";
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

// ABC thresholds (can be adjusted)
const ABC_THRESHOLDS = {
  A: 50000, // >= 50k = A
  B: 10000, // >= 10k = B
  // < 10k = C
};

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

function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return "€ 0,00";
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

function calculateABCCategory(totalRevenue: number): ABCCategory {
  if (totalRevenue >= ABC_THRESHOLDS.A) return 'A';
  if (totalRevenue >= ABC_THRESHOLDS.B) return 'B';
  return 'C';
}

export function CommercialHistorySection({ contact, onFieldChange }: CommercialHistorySectionProps) {
  const lastUpdated = contact.commercial_history_updated_at;
  const isUpdatingRef = useRef(false);
  const onFieldChangeRef = useRef(onFieldChange);
  onFieldChangeRef.current = onFieldChange;

  // Calculate total revenue from yearly sales
  const calculatedTotalRevenue = useMemo(() => {
    const sales2023 = contact.sales_2023 || 0;
    const sales2024 = contact.sales_2024 || 0;
    const sales2025 = contact.sales_2025 || 0;
    const sales2026 = contact.sales_2026 || 0;
    return sales2023 + sales2024 + sales2025 + sales2026;
  }, [contact.sales_2023, contact.sales_2024, contact.sales_2025, contact.sales_2026]);

  // Calculate ABC category based on total revenue
  const calculatedABCCategory = useMemo(() => {
    return calculateABCCategory(calculatedTotalRevenue);
  }, [calculatedTotalRevenue]);

  // Auto-update total revenue and ABC category when sales change
  useEffect(() => {
    if (isUpdatingRef.current) return;
    
    const currentTotal = contact.total_revenue || 0;
    const currentABC = contact.abc_category;
    
    const needsRevenueUpdate = Math.abs(currentTotal - calculatedTotalRevenue) > 0.01;
    const needsABCUpdate = currentABC !== calculatedABCCategory;
    
    if (needsRevenueUpdate || needsABCUpdate) {
      isUpdatingRef.current = true;
      
      const updates = async () => {
        if (needsRevenueUpdate) {
          await onFieldChangeRef.current('total_revenue', calculatedTotalRevenue);
        }
        if (needsABCUpdate) {
          await onFieldChangeRef.current('abc_category', calculatedABCCategory);
        }
        // Reset after a small delay to allow state to settle
        setTimeout(() => {
          isUpdatingRef.current = false;
        }, 500);
      };
      
      updates();
    }
  }, [calculatedTotalRevenue, calculatedABCCategory, contact.total_revenue, contact.abc_category]);

  const abcCategory = (contact.abc_category || calculatedABCCategory) as ABCCategory;

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
          {/* Calculated Category (read-only display) */}
          <div className="flex items-start py-3 border-b border-border/50 group">
            <div className="w-40 flex-shrink-0 text-sm text-muted-foreground flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              Categoria ABC
            </div>
            <div className="flex-1 text-sm flex items-center gap-2">
              <Badge 
                variant="outline" 
                className={cn("text-xs font-bold", ABC_COLORS[abcCategory])}
              >
                {abcCategory}
              </Badge>
              <span className="text-xs text-muted-foreground">
                (calculado automaticamente)
              </span>
            </div>
          </div>
          
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
          
          {/* Total Revenue - Calculated automatically */}
          <div className="flex items-start py-3 border-b border-border/50 group">
            <div className="w-40 flex-shrink-0 text-sm text-muted-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Receita Total
            </div>
            <div className="flex-1 text-sm flex items-center gap-2">
              <span className="font-semibold text-primary">
                {formatCurrency(calculatedTotalRevenue)}
              </span>
              <Badge variant="secondary" className="text-xs gap-1">
                <Calculator className="w-3 h-3" />
                Automático
              </Badge>
            </div>
          </div>
          
          {/* Average Ticket - Manual */}
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
        
        {/* ABC Thresholds Info */}
        <div className="mt-4 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
          <p className="font-medium mb-1">Classificação ABC:</p>
          <div className="flex gap-4">
            <span><Badge variant="outline" className={cn("text-xs mr-1", ABC_COLORS.A)}>A</Badge> ≥ {formatCurrency(ABC_THRESHOLDS.A)}</span>
            <span><Badge variant="outline" className={cn("text-xs mr-1", ABC_COLORS.B)}>B</Badge> ≥ {formatCurrency(ABC_THRESHOLDS.B)}</span>
            <span><Badge variant="outline" className={cn("text-xs mr-1", ABC_COLORS.C)}>C</Badge> &lt; {formatCurrency(ABC_THRESHOLDS.B)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
