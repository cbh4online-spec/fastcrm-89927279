import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";

export interface FinancialReportFilters {
  dateFrom?: string;
  dateTo?: string;
  ownerId?: string;
  companyId?: string;
  contactId?: string;
  productCategory?: string;
}

export interface FinancialKPIBlock {
  totalInvoiced: number;
  totalReceived: number;
  totalDue: number;
  overdue: number;
  invoiceCount: number;
  avgTicket: number;
  collectionRate: number;
}

export interface MonthlyPoint {
  month: string;
  label: string;
  invoiced: number;
  received: number;
}

export interface TopClient {
  id: string;
  name: string;
  total: number;
  received: number;
  due: number;
  count: number;
}

export interface TopProduct {
  id: string;
  name: string;
  category: string | null;
  qty: number;
  total: number;
}

export interface AgingBucket {
  label: string;
  amount: number;
  count: number;
}

export interface FinancialReportData {
  kpis: FinancialKPIBlock;
  monthly: MonthlyPoint[];
  topClients: TopClient[];
  topProducts: TopProduct[];
  aging: AgingBucket[];
  owners: { id: string; label: string }[];
  categories: string[];
}

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  return `${MONTH_LABELS[Number(m) - 1]} ${y.slice(2)}`;
}

function buildMonthsRange(from?: string, to?: string): string[] {
  const end = to ? new Date(to) : new Date();
  const start = from ? new Date(from) : new Date(end.getFullYear(), end.getMonth() - 11, 1);
  const keys: string[] = [];
  const d = new Date(start.getFullYear(), start.getMonth(), 1);
  while (d <= end) {
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    d.setMonth(d.getMonth() + 1);
  }
  return keys;
}

export function useFinancialReports(filters: FinancialReportFilters = {}) {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["financial-reports", currentWorkspace?.id, filters],
    enabled: !!currentWorkspace,
    staleTime: 60_000,
    queryFn: async (): Promise<FinancialReportData> => {
      if (!currentWorkspace) {
        return {
          kpis: { totalInvoiced: 0, totalReceived: 0, totalDue: 0, overdue: 0, invoiceCount: 0, avgTicket: 0, collectionRate: 0 },
          monthly: [], topClients: [], topProducts: [], aging: [], owners: [], categories: [],
        };
      }

      const { data, error } = await workspaceClient.rpc("financial_reports_summary" as any, {
        p_workspace_id: currentWorkspace.id,
        p_date_from: filters.dateFrom || null,
        p_date_to: filters.dateTo || null,
        p_owner_id: filters.ownerId || null,
        p_company_id: filters.companyId || null,
        p_contact_id: filters.contactId || null,
        p_product_category: filters.productCategory || null,
      });
      if (error) throw error;

      const raw: any = data || {};
      const k = raw.kpis || {};
      const totalInvoiced = Number(k.total_invoiced) || 0;
      const totalReceived = Number(k.total_received) || 0;
      const overdue = Number(k.overdue) || 0;
      const invoiceCount = Number(k.invoice_count) || 0;
      const totalDue = totalInvoiced - totalReceived;
      const avgTicket = invoiceCount > 0 ? totalInvoiced / invoiceCount : 0;
      const collectionRate = totalInvoiced > 0 ? (totalReceived / totalInvoiced) * 100 : 0;

      // Monthly: ensure all months in range are present
      const monthsRange = buildMonthsRange(filters.dateFrom, filters.dateTo);
      const monthlyMap = new Map<string, MonthlyPoint>();
      monthsRange.forEach((m) => monthlyMap.set(m, { month: m, label: monthLabel(m), invoiced: 0, received: 0 }));
      (raw.monthly || []).forEach((row: any) => {
        const key = row.month;
        if (!key) return;
        const existing = monthlyMap.get(key) || { month: key, label: monthLabel(key), invoiced: 0, received: 0 };
        existing.invoiced = Number(row.invoiced) || 0;
        existing.received = Number(row.received) || 0;
        monthlyMap.set(key, existing);
      });
      const monthly = Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month));

      const a = raw.aging || {};
      const aging: AgingBucket[] = [
        { label: "A vencer", amount: Number(a.current_amt) || 0, count: Number(a.current_cnt) || 0 },
        { label: "1-30 dias", amount: Number(a.d30_amt) || 0, count: Number(a.d30_cnt) || 0 },
        { label: "31-60 dias", amount: Number(a.d60_amt) || 0, count: Number(a.d60_cnt) || 0 },
        { label: "61-90 dias", amount: Number(a.d90_amt) || 0, count: Number(a.d90_cnt) || 0 },
        { label: "+90 dias", amount: Number(a.d90p_amt) || 0, count: Number(a.d90p_cnt) || 0 },
      ];

      return {
        kpis: { totalInvoiced, totalReceived, totalDue, overdue, invoiceCount, avgTicket, collectionRate },
        monthly,
        topClients: (raw.topClients || []).map((c: any) => ({
          id: c.id, name: c.name, total: Number(c.total) || 0, received: Number(c.received) || 0, due: Number(c.due) || 0, count: Number(c.count) || 0,
        })),
        topProducts: (raw.topProducts || []).map((p: any) => ({
          id: p.id, name: p.name, category: p.category ?? null, qty: Number(p.qty) || 0, total: Number(p.total) || 0,
        })),
        aging,
        owners: (raw.owners || []).map((o: any) => ({ id: o.id, label: o.label })),
        categories: (raw.categories || []).filter(Boolean),
      };
    },
  });
}
