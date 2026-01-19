import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Users, DollarSign, BarChart3, Crown, Medal, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface ContactWithSales {
  id: string;
  name: string;
  total_revenue: number;
  sales_2024: number;
  sales_2025: number;
  sales_2026: number;
  invoice_count: number;
  abc_category: string | null;
}

interface CompanyContactsHistoryProps {
  companyId: string;
}

function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || value === 0) return "€0";
  return new Intl.NumberFormat('pt-PT', { 
    style: 'currency', 
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

const ABC_COLORS: Record<string, string> = {
  A: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  B: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  C: "bg-slate-500/10 text-slate-600 border-slate-500/30",
};

const RANK_ICONS = [
  <Crown key="1" className="w-4 h-4 text-amber-500" />,
  <Medal key="2" className="w-4 h-4 text-slate-400" />,
  <Medal key="3" className="w-4 h-4 text-amber-700" />,
];

export function CompanyContactsHistory({ companyId }: CompanyContactsHistoryProps) {
  const navigate = useNavigate();
  
  // Fetch contacts for the company
  const { data: contacts = [], isLoading: contactsLoading } = useQuery({
    queryKey: ["company-contacts", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("id, name, abc_category")
        .eq("company_id", companyId);

      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  // Fetch all invoices for the company (includes invoices for company or any of its contacts)
  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ["company-invoices-history", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, contact_id, company_id, total, status, issue_date, paid_at")
        .eq("company_id", companyId);

      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  // Calculate sales per contact from invoices
  const contactsWithSales = useMemo((): ContactWithSales[] => {
    if (!contacts.length) return [];

    const currentYear = new Date().getFullYear();

    return contacts.map(contact => {
      // Get invoices for this contact (paid or sent)
      const contactInvoices = invoices.filter(inv => 
        inv.contact_id === contact.id && 
        (inv.status === 'paid' || inv.status === 'sent' || inv.status === 'overdue')
      );

      // Calculate totals by year
      let sales2024 = 0;
      let sales2025 = 0;
      let sales2026 = 0;
      let totalRevenue = 0;

      contactInvoices.forEach(inv => {
        const year = new Date(inv.issue_date).getFullYear();
        const total = inv.total || 0;
        
        totalRevenue += total;
        
        if (year === 2024) sales2024 += total;
        else if (year === 2025) sales2025 += total;
        else if (year === 2026) sales2026 += total;
      });

      return {
        id: contact.id,
        name: contact.name,
        total_revenue: totalRevenue,
        sales_2024: sales2024,
        sales_2025: sales2025,
        sales_2026: sales2026,
        invoice_count: contactInvoices.length,
        abc_category: contact.abc_category,
      };
    }).sort((a, b) => b.total_revenue - a.total_revenue);
  }, [contacts, invoices]);

  // Also include company-level invoices (not linked to specific contact)
  const companyOnlyInvoices = useMemo(() => {
    return invoices.filter(inv => 
      !inv.contact_id && 
      (inv.status === 'paid' || inv.status === 'sent' || inv.status === 'overdue')
    );
  }, [invoices]);

  // Calculate aggregated totals
  const aggregated = useMemo(() => {
    let totalRevenue = 0;
    let sales2024 = 0;
    let sales2025 = 0;
    let sales2026 = 0;
    let invoiceCount = 0;

    // From contacts
    contactsWithSales.forEach(contact => {
      totalRevenue += contact.total_revenue;
      sales2024 += contact.sales_2024;
      sales2025 += contact.sales_2025;
      sales2026 += contact.sales_2026;
      invoiceCount += contact.invoice_count;
    });

    // From company-only invoices
    companyOnlyInvoices.forEach(inv => {
      const year = new Date(inv.issue_date).getFullYear();
      const total = inv.total || 0;
      
      totalRevenue += total;
      invoiceCount++;
      
      if (year === 2024) sales2024 += total;
      else if (year === 2025) sales2025 += total;
      else if (year === 2026) sales2026 += total;
    });

    return {
      totalRevenue,
      sales2024,
      sales2025,
      sales2026,
      invoiceCount,
      contactCount: contacts.length,
    };
  }, [contactsWithSales, companyOnlyInvoices, contacts.length]);

  // Get max revenue for progress bar calculation
  const maxRevenue = useMemo(() => {
    return Math.max(...contactsWithSales.map(c => c.total_revenue), 1);
  }, [contactsWithSales]);

  const isLoading = contactsLoading || invoicesLoading;

  if (isLoading) {
    return (
      <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-card to-card/95">
        <CardContent className="flex items-center justify-center py-8">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (contacts.length === 0) {
    return (
      <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-card to-card/95">
        <CardHeader className="pb-3 bg-gradient-to-r from-indigo-500/10 via-transparent to-transparent">
          <CardTitle className="text-base font-semibold flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
              <Users className="w-4 h-4" />
            </div>
            Histórico dos Contactos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum contacto associado a esta empresa.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-card to-card/95">
      <CardHeader className="pb-3 bg-gradient-to-r from-indigo-500/10 via-transparent to-transparent">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            Histórico dos Contactos
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {contacts.length} contacto{contacts.length !== 1 ? 's' : ''}
          </Badge>
        </div>
        <CardDescription>Vendas agregadas de todos os contactos da empresa</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Aggregated Totals */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg border border-border/50 bg-gradient-to-br from-emerald-500/5 to-transparent">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <DollarSign className="w-3 h-3 text-emerald-500" />
              Receita Total
            </div>
            <p className="text-lg font-bold text-emerald-600">{formatCurrency(aggregated.totalRevenue)}</p>
          </div>
          <div className="p-3 rounded-lg border border-border/50 bg-gradient-to-br from-blue-500/5 to-transparent">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <BarChart3 className="w-3 h-3 text-blue-500" />
              2026
            </div>
            <p className="text-lg font-bold">{formatCurrency(aggregated.sales2026)}</p>
          </div>
          <div className="p-3 rounded-lg border border-border/50 bg-gradient-to-br from-indigo-500/5 to-transparent">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <BarChart3 className="w-3 h-3 text-indigo-500" />
              2025
            </div>
            <p className="text-lg font-bold">{formatCurrency(aggregated.sales2025)}</p>
          </div>
          <div className="p-3 rounded-lg border border-border/50 bg-gradient-to-br from-violet-500/5 to-transparent">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <BarChart3 className="w-3 h-3 text-violet-500" />
              2024
            </div>
            <p className="text-lg font-bold">{formatCurrency(aggregated.sales2024)}</p>
          </div>
        </div>

        {/* Contact Ranking */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-500" />
            Ranking de Compras
          </h4>
          <div className="space-y-2">
            {contactsWithSales.slice(0, 10).map((contact, index) => {
              const initials = contact.name
                .split(" ")
                .map(n => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);
              
              const percentage = maxRevenue > 0 
                ? (contact.total_revenue / maxRevenue) * 100 
                : 0;

              return (
                <div 
                  key={contact.id}
                  className="group flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/dashboard/contacts/${contact.id}`)}
                >
                  {/* Rank */}
                  <div className="w-6 flex-shrink-0 flex items-center justify-center">
                    {index < 3 ? RANK_ICONS[index] : (
                      <span className="text-xs text-muted-foreground font-medium">{index + 1}</span>
                    )}
                  </div>
                  
                  {/* Avatar */}
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className={cn(
                      "text-xs font-medium",
                      index === 0 ? "bg-amber-500/20 text-amber-600" :
                      index === 1 ? "bg-slate-500/20 text-slate-600" :
                      index === 2 ? "bg-amber-700/20 text-amber-700" :
                      "bg-muted"
                    )}>
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* Name and Progress */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                        {contact.name}
                      </span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {contact.abc_category && (
                          <Badge 
                            variant="outline" 
                            className={cn("text-[10px] h-5", ABC_COLORS[contact.abc_category])}
                          >
                            {contact.abc_category}
                          </Badge>
                        )}
                        <span className="text-sm font-semibold">
                          {formatCurrency(contact.total_revenue)}
                        </span>
                      </div>
                    </div>
                    <Progress 
                      value={percentage} 
                      className="h-1.5"
                    />
                  </div>
                </div>
              );
            })}
          </div>
          
          {contactsWithSales.length > 10 && (
            <p className="text-xs text-muted-foreground text-center pt-2">
              +{contactsWithSales.length - 10} outros contactos
            </p>
          )}
        </div>

        {/* Invoice Summary */}
        {aggregated.invoiceCount > 0 && (
          <div className="pt-3 border-t">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileText className="w-3 h-3" />
              <span>{aggregated.invoiceCount} fatura{aggregated.invoiceCount !== 1 ? 's' : ''} registada{aggregated.invoiceCount !== 1 ? 's' : ''}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
