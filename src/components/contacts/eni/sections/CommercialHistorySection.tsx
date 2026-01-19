import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, DollarSign, Calendar, BarChart3, ShoppingCart, Clock, Calculator, FileText } from "lucide-react";
import { ENIContact, ABCCategory } from "../ENIContactTypes";
import { cn } from "@/lib/utils";
import { useInvoices } from "@/hooks/useInvoices";

interface CommercialHistorySectionProps {
  contact: ENIContact;
  onFieldChange: (field: keyof ENIContact, value: unknown) => Promise<void>;
}

const ABC_COLORS: Record<string, string> = {
  A: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  B: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  C: "bg-slate-500/10 text-slate-600 border-slate-500/30",
};

// ABC thresholds (can be adjusted)
const ABC_THRESHOLDS = {
  A: 50000, // >= 50k = A
  B: 10000, // >= 10k = B
  // < 10k = C
};

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

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function CommercialHistorySection({ contact }: CommercialHistorySectionProps) {
  // Fetch invoices for this contact (and their company)
  const { data: contactInvoices = [] } = useInvoices({ contact_id: contact.id });
  const { data: companyInvoices = [] } = useInvoices({ company_id: contact.company_id || undefined });
  
  // Combine and deduplicate invoices
  const allInvoices = useMemo(() => {
    const invoiceMap = new Map();
    [...contactInvoices, ...companyInvoices].forEach(inv => {
      if (!invoiceMap.has(inv.id)) {
        invoiceMap.set(inv.id, inv);
      }
    });
    return Array.from(invoiceMap.values());
  }, [contactInvoices, companyInvoices]);

  // Filter to only count sent, paid, overdue invoices
  const countableInvoices = useMemo(() => {
    return allInvoices.filter(inv => 
      inv.status === 'sent' || inv.status === 'paid' || inv.status === 'overdue'
    );
  }, [allInvoices]);

  // Calculate sales by year from invoices
  const salesByYear = useMemo(() => {
    const sales: Record<number, number> = {};
    
    countableInvoices.forEach(inv => {
      if (inv.issue_date && inv.total) {
        const year = new Date(inv.issue_date).getFullYear();
        sales[year] = (sales[year] || 0) + inv.total;
      }
    });
    
    return sales;
  }, [countableInvoices]);

  // Calculate totals
  const calculatedTotalRevenue = useMemo(() => {
    return Object.values(salesByYear).reduce((sum, val) => sum + val, 0);
  }, [salesByYear]);

  const invoiceCount = countableInvoices.length;

  // Get last purchase date
  const lastPurchaseDate = useMemo(() => {
    const paidInvoices = allInvoices
      .filter(inv => inv.status === 'paid' && inv.paid_at)
      .sort((a, b) => new Date(b.paid_at!).getTime() - new Date(a.paid_at!).getTime());
    
    if (paidInvoices.length > 0) {
      return paidInvoices[0].paid_at;
    }
    
    // Fallback to last sent invoice date
    const sentInvoices = countableInvoices
      .filter(inv => inv.issue_date)
      .sort((a, b) => new Date(b.issue_date!).getTime() - new Date(a.issue_date!).getTime());
    
    return sentInvoices[0]?.issue_date || null;
  }, [allInvoices, countableInvoices]);

  // Calculate average ticket
  const averageTicket = useMemo(() => {
    if (invoiceCount === 0) return 0;
    return calculatedTotalRevenue / invoiceCount;
  }, [calculatedTotalRevenue, invoiceCount]);

  // Calculate ABC category based on total revenue
  const abcCategory = useMemo(() => {
    return calculateABCCategory(calculatedTotalRevenue);
  }, [calculatedTotalRevenue]);

  // Get current year for display
  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3];

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
        <CardDescription className="flex items-center gap-1.5 mt-1">
          <FileText className="w-3 h-3" />
          {invoiceCount} fatura{invoiceCount !== 1 ? 's' : ''} registada{invoiceCount !== 1 ? 's' : ''}
        </CardDescription>
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
          
          {/* Year Sales - Calculated from invoices */}
          {years.map(year => (
            <div key={year} className="flex items-start py-3 border-b border-border/50 group">
              <div className="w-40 flex-shrink-0 text-sm text-muted-foreground flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Vendas {year}
              </div>
              <div className="flex-1 text-sm">
                <span className={cn(
                  "font-medium",
                  (salesByYear[year] || 0) > 0 ? "text-emerald-600" : "text-muted-foreground"
                )}>
                  {formatCurrency(salesByYear[year] || 0)}
                </span>
              </div>
            </div>
          ))}
          
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
          
          {/* Average Ticket - Calculated */}
          <div className="flex items-start py-3 border-b border-border/50 group">
            <div className="w-40 flex-shrink-0 text-sm text-muted-foreground flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              Ticket Médio
            </div>
            <div className="flex-1 text-sm">
              <span className="font-medium">
                {formatCurrency(averageTicket)}
              </span>
            </div>
          </div>
          
          {/* Last Purchase Date */}
          <div className="flex items-start py-3 border-b border-border/50 group">
            <div className="w-40 flex-shrink-0 text-sm text-muted-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Última Compra
            </div>
            <div className="flex-1 text-sm">
              <span className={lastPurchaseDate ? "font-medium" : "text-muted-foreground"}>
                {formatDate(lastPurchaseDate)}
              </span>
            </div>
          </div>
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
