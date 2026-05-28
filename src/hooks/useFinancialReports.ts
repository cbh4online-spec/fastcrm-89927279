import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";

export interface FinancialReportFilters {
  dateFrom?: string; // ISO date
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
  collectionRate: number; // received / invoiced %
}

export interface MonthlyPoint {
  month: string; // YYYY-MM
  label: string; // MMM YY
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

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  return `${MONTH_LABELS[Number(m) - 1]} ${y.slice(2)}`;
}

async function fetchAllPaginated<T = any>(buildQuery: (from: number, to: number) => any, pageSize = 1000): Promise<T[]> {
  const out: T[] = [];
  let from = 0;
  // Safety cap to avoid runaway loops
  for (let i = 0; i < 50; i++) {
    const to = from + pageSize - 1;
    const { data, error } = await buildQuery(from, to);
    if (error) throw error;
    const rows = (data || []) as T[];
    out.push(...rows);
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return out;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function useFinancialReports(filters: FinancialReportFilters = {}) {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["financial-reports", currentWorkspace?.id, filters],
    enabled: !!currentWorkspace,
    queryFn: async (): Promise<FinancialReportData> => {
      if (!currentWorkspace) {
        return {
          kpis: { totalInvoiced: 0, totalReceived: 0, totalDue: 0, overdue: 0, invoiceCount: 0, avgTicket: 0, collectionRate: 0 },
          monthly: [], topClients: [], topProducts: [], aging: [], owners: [], categories: [],
        };
      }

      // 1) Fetch invoices in scope (paginated)
      const invoicesRaw = await fetchAllPaginated((from, to) => {
        let q = workspaceClient
          .from("invoices")
          .select("id, total, amount_paid, status, issue_date, due_date, paid_at, company_id, contact_id, client_name, created_by, company:companies(id, name), contact:contacts(id, name)")
          .eq("workspace_id", currentWorkspace.id)
          .not("status", "in", '("draft","cancelled")')
          .order("issue_date", { ascending: false })
          .range(from, to);
        if (filters.dateFrom) q = q.gte("issue_date", filters.dateFrom);
        if (filters.dateTo) q = q.lte("issue_date", filters.dateTo);
        if (filters.ownerId) q = q.eq("created_by", filters.ownerId);
        if (filters.companyId) q = q.eq("company_id", filters.companyId);
        if (filters.contactId) q = q.eq("contact_id", filters.contactId);
        return q;
      });
      let invoices = invoicesRaw || [];

      // 2) Fetch items for product analytics + optional category filter (chunked + paginated)
      const invoiceIds = invoices.map((i: any) => i.id);
      let items: any[] = [];
      let allCategories = new Set<string>();
      if (invoiceIds.length) {
        for (const ids of chunk(invoiceIds, 200)) {
          const part = await fetchAllPaginated((from, to) =>
            workspaceClient
              .from("invoice_items")
              .select("invoice_id, product_id, description, quantity, total, net_total, product:products(id, name, category)")
              .in("invoice_id", ids)
              .range(from, to)
          );
          items.push(...part);
        }
        items.forEach((it: any) => {
          if (it.product?.category) allCategories.add(it.product.category);
        });

        if (filters.productCategory) {
          const matchingInvoiceIds = new Set(
            items.filter((it: any) => it.product?.category === filters.productCategory).map((it: any) => it.invoice_id)
          );
          invoices = invoices.filter((inv: any) => matchingInvoiceIds.has(inv.id));
          items = items.filter((it: any) => matchingInvoiceIds.has(it.invoice_id));
        }
      }


      // 3) KPIs
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let totalInvoiced = 0, totalReceived = 0, overdue = 0;
      for (const inv of invoices) {
        const total = Number(inv.total) || 0;
        const paid = Number(inv.amount_paid) || 0;
        totalInvoiced += total;
        totalReceived += paid;
        const remaining = total - paid;
        if (remaining > 0 && inv.due_date && new Date(inv.due_date) < today) {
          overdue += remaining;
        }
      }
      const totalDue = totalInvoiced - totalReceived;
      const invoiceCount = invoices.length;
      const avgTicket = invoiceCount > 0 ? totalInvoiced / invoiceCount : 0;
      const collectionRate = totalInvoiced > 0 ? (totalReceived / totalInvoiced) * 100 : 0;

      // 4) Monthly evolution (last 12 months or within range)
      const monthsMap = new Map<string, MonthlyPoint>();
      const endDate = filters.dateTo ? new Date(filters.dateTo) : new Date();
      const startDate = filters.dateFrom ? new Date(filters.dateFrom) : new Date(endDate.getFullYear(), endDate.getMonth() - 11, 1);
      for (let d = new Date(startDate.getFullYear(), startDate.getMonth(), 1); d <= endDate; d.setMonth(d.getMonth() + 1)) {
        const key = monthKey(d);
        monthsMap.set(key, { month: key, label: monthLabel(key), invoiced: 0, received: 0 });
      }
      for (const inv of invoices) {
        if (inv.issue_date) {
          const key = monthKey(new Date(inv.issue_date));
          const pt = monthsMap.get(key);
          if (pt) pt.invoiced += Number(inv.total) || 0;
        }
      }
      // Received: fetch payments for invoices in scope
      if (invoiceIds.length) {
        const { data: payments } = await workspaceClient
          .from("invoice_payments")
          .select("invoice_id, amount, payment_date")
          .in("invoice_id", invoiceIds);
        for (const p of payments || []) {
          if (!p.payment_date) continue;
          const key = monthKey(new Date(p.payment_date));
          const pt = monthsMap.get(key);
          if (pt) pt.received += Number(p.amount) || 0;
        }
      }
      const monthly = Array.from(monthsMap.values());

      // 5) Top clients
      const clientMap = new Map<string, TopClient>();
      for (const inv of invoices) {
        const id = inv.company_id || inv.contact_id || `name:${inv.client_name}`;
        const name = inv.company?.name || inv.contact?.name || inv.client_name || "—";
        const total = Number(inv.total) || 0;
        const paid = Number(inv.amount_paid) || 0;
        const ex = clientMap.get(id);
        if (ex) {
          ex.total += total; ex.received += paid; ex.due += total - paid; ex.count += 1;
        } else {
          clientMap.set(id, { id, name, total, received: paid, due: total - paid, count: 1 });
        }
      }
      const topClients = Array.from(clientMap.values()).sort((a, b) => b.total - a.total).slice(0, 10);

      // 6) Top products
      const productMap = new Map<string, TopProduct>();
      for (const it of items) {
        const id = it.product_id || `desc:${it.description}`;
        const name = it.product?.name || it.description || "—";
        const category = it.product?.category || null;
        const qty = Number(it.quantity) || 0;
        const total = Number(it.total) || 0;
        const ex = productMap.get(id);
        if (ex) { ex.qty += qty; ex.total += total; }
        else productMap.set(id, { id, name, category, qty, total });
      }
      const topProducts = Array.from(productMap.values()).sort((a, b) => b.total - a.total).slice(0, 10);

      // 7) Aging (only unpaid amount, based on due_date)
      const buckets = {
        current: { label: "A vencer", amount: 0, count: 0 },
        d30: { label: "1-30 dias", amount: 0, count: 0 },
        d60: { label: "31-60 dias", amount: 0, count: 0 },
        d90: { label: "61-90 dias", amount: 0, count: 0 },
        d90plus: { label: "+90 dias", amount: 0, count: 0 },
      };
      for (const inv of invoices) {
        const remaining = (Number(inv.total) || 0) - (Number(inv.amount_paid) || 0);
        if (remaining <= 0) continue;
        if (!inv.due_date) { buckets.current.amount += remaining; buckets.current.count += 1; continue; }
        const due = new Date(inv.due_date);
        const diffDays = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 0) { buckets.current.amount += remaining; buckets.current.count += 1; }
        else if (diffDays <= 30) { buckets.d30.amount += remaining; buckets.d30.count += 1; }
        else if (diffDays <= 60) { buckets.d60.amount += remaining; buckets.d60.count += 1; }
        else if (diffDays <= 90) { buckets.d90.amount += remaining; buckets.d90.count += 1; }
        else { buckets.d90plus.amount += remaining; buckets.d90plus.count += 1; }
      }
      const aging = Object.values(buckets);

      // 8) Owners list (from invoices found before filter)
      const ownerIds = new Set<string>();
      (invoicesRaw || []).forEach((inv: any) => { if (inv.created_by) ownerIds.add(inv.created_by); });
      let owners: { id: string; label: string }[] = [];
      if (ownerIds.size) {
        const { data: profiles } = await workspaceClient
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", Array.from(ownerIds));
        owners = (profiles || []).map((p: any) => ({
          id: p.user_id,
          label: p.full_name || p.email || p.user_id.slice(0, 8),
        }));
      }

      return {
        kpis: { totalInvoiced, totalReceived, totalDue, overdue, invoiceCount, avgTicket, collectionRate },
        monthly,
        topClients,
        topProducts,
        aging,
        owners,
        categories: Array.from(allCategories).sort(),
      };
    },
  });
}
