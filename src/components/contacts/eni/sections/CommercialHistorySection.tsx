import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, DollarSign, Calendar, BarChart3, ShoppingCart, Calculator, FileText } from "lucide-react";
import { ENIContact, ABCCategory } from "../ENIContactTypes";
import { InlineEditableField } from "@/components/custom-fields/InlineEditableField";
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

export function CommercialHistorySection({ contact, onFieldChange }: CommercialHistorySectionProps) {
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

  // Calculate sales by year from invoices (automatic)
  const invoiceSalesByYear = useMemo(() => {
    const sales: Record<number, number> = {};
    
    countableInvoices.forEach(inv => {
      if (inv.issue_date && inv.total) {
        const year = new Date(inv.issue_date).getFullYear();
        sales[year] = (sales[year] || 0) + inv.total;
      }
    });
    
    return sales;
  }, [countableInvoices]);

  // Manual sales from contact fields
  const manualSalesByYear: Record<number, number | null> = {
    2026: contact.sales_2026 ?? null,
    2025: contact.sales_2025 ?? null,
    2024: contact.sales_2024 ?? null,
    2023: contact.sales_2023 ?? null,
  };

  // Combined sales: use invoice value if exists, otherwise use manual value
  const combinedSalesByYear = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3];
    const combined: Record<number, { invoice: number; manual: number | null; total: number }> = {};
    
    years.forEach(year => {
      const invoiceVal = invoiceSalesByYear[year] || 0;
      const manualVal = manualSalesByYear[year];
      // Total = invoice value + manual value (manual can add to invoice data)
      combined[year] = {
        invoice: invoiceVal,
        manual: manualVal,
        total: invoiceVal + (manualVal || 0),
      };
    });
    
    return combined;
  }, [invoiceSalesByYear, manualSalesByYear]);

  const invoiceCount = countableInvoices.length;

  // Calculate totals
  const calculatedTotalRevenue = useMemo(() => {
    return Object.values(combinedSalesByYear).reduce((sum, val) => sum + val.total, 0);
  }, [combinedSalesByYear]);

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
    
    if (sentInvoices[0]?.issue_date) {
      return sentInvoices[0].issue_date;
    }
    
    // Fallback to manual last purchase date
    return contact.last_purchase_date;
  }, [allInvoices, countableInvoices, contact.last_purchase_date]);

  // Calculate average ticket
  const averageTicket = useMemo(() => {
    if (invoiceCount === 0) return contact.average_ticket || 0;
    return calculatedTotalRevenue / invoiceCount;
  }, [calculatedTotalRevenue, invoiceCount, contact.average_ticket]);

  // Calculate ABC category based on total revenue
  const abcCategory = useMemo(() => {
    return calculateABCCategory(calculatedTotalRevenue);
  }, [calculatedTotalRevenue]);

  // Get current year for display
  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3];

  // Field mapping for manual sales
  const yearFieldMap: Record<number, keyof ENIContact> = {
    2026: 'sales_2026',
    2025: 'sales_2025',
    2024: 'sales_2024',
    2023: 'sales_2023',
  };

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
          
          {/* Year Sales - Combined view */}
          {years.map(year => {
            const yearData = combinedSalesByYear[year];
            const hasInvoices = yearData.invoice > 0;
            const fieldName = yearFieldMap[year];
            
            return (
              <div key={year} className="flex items-start py-3 border-b border-border/50 group">
                <div className="w-40 flex-shrink-0 text-sm text-muted-foreground flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Vendas {year}
                </div>
                <div className="flex-1">
                  {/* Show invoice total if exists */}
                  {hasInvoices && (
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-emerald-600">
                        {formatCurrency(yearData.invoice)}
                      </span>
                      <Badge variant="secondary" className="text-xs gap-1">
                        <FileText className="w-3 h-3" />
                        Faturas
                      </Badge>
                    </div>
                  )}
                  
                  {/* Manual input for additional/historical values */}
                  <div className="flex items-center gap-2">
                    {hasInvoices && (
                      <span className="text-xs text-muted-foreground">+ Manual:</span>
                    )}
                    <InlineEditableField
                      label=""
                      fieldId={`sales_${year}`}
                      fieldType="currency"
                      value={manualSalesByYear[year]}
                      onChange={(val) => fieldName && onFieldChange(fieldName, val)}
                      placeholder={hasInvoices ? "Adicional..." : "0.00"}
                    />
                  </div>
                  
                  {/* Show combined total if both exist */}
                  {hasInvoices && yearData.manual && yearData.manual > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Total: {formatCurrency(yearData.total)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          
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
          
          {/* Average Ticket - Calculated or manual */}
          <div className="flex items-start py-3 border-b border-border/50 group">
            <div className="w-40 flex-shrink-0 text-sm text-muted-foreground flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              Ticket Médio
            </div>
            <div className="flex-1 text-sm">
              <span className="font-medium">
                {formatCurrency(averageTicket)}
              </span>
              {invoiceCount > 0 && (
                <span className="text-xs text-muted-foreground ml-2">
                  ({invoiceCount} fatura{invoiceCount !== 1 ? 's' : ''})
                </span>
              )}
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
