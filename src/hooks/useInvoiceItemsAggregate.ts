import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const ACTIVE_STATUSES = ["sent", "partially_paid", "paid"];
const PAGE_SIZE = 1000;
const MAX_PAGES = 20;

interface RawItemRow {
  quantity: number | null;
  net_total: number | null;
  total: number | null;
  description: string | null;
  invoice: { issue_date: string | null } | null;
}

export interface InvoiceItemsAggregate {
  /** Top itens por unidades vendidas */
  topItems: Array<{ name: string; units: number; revenue: number }>;
  /** Unidades vendidas por mês (últimos 12 meses) */
  monthlyUnits: Array<{ label: string; units: number }>;
  totalUnits: number;
  totalRevenue: number;
  avgPerItem: number;
}

function fmtMonthLabel(d: Date) {
  return d.toLocaleDateString("pt-PT", { month: "short" }).replace(".", "").toUpperCase();
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function useInvoiceItemsAggregate(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["invoice-items-aggregate", workspaceId],
    enabled: !!workspaceId,
    staleTime: 60_000,
    queryFn: async (): Promise<InvoiceItemsAggregate> => {
      const rows: RawItemRow[] = [];
      const select = (s: string): string => s;

      for (let page = 0; page < MAX_PAGES; page += 1) {
        const from = page * PAGE_SIZE;
        const { data, error } = await supabase
          .from("invoice_items")
          .select(
            select("quantity, net_total, total, description, invoice:invoices!inner(issue_date, workspace_id, status)"),
          )
          .eq("invoice.workspace_id", workspaceId!)
          .in("invoice.status", ACTIVE_STATUSES)
          .order("created_at", { ascending: false })
          .range(from, from + PAGE_SIZE - 1)
          .returns<RawItemRow[]>();

        if (error) throw error;
        const batch = data || [];
        rows.push(...batch);
        if (batch.length < PAGE_SIZE) break;
      }

      const now = new Date();
      const byItem = new Map<string, { name: string; units: number; revenue: number }>();
      const monthly = new Map<string, { label: string; units: number; sortKey: number }>();
      for (let i = 11; i >= 0; i -= 1) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        monthly.set(monthKey(d), { label: fmtMonthLabel(d), units: 0, sortKey: d.getTime() });
      }

      let totalUnits = 0;
      let totalRevenue = 0;

      for (const row of rows) {
        const units = Number(row.quantity || 0);
        const revenue = Number(row.net_total ?? row.total ?? 0);
        const name = (row.description || "—").trim() || "—";

        totalUnits += units;
        totalRevenue += revenue;

        const cur = byItem.get(name) || { name, units: 0, revenue: 0 };
        cur.units += units;
        cur.revenue += revenue;
        byItem.set(name, cur);

        const issue = row.invoice?.issue_date;
        if (issue) {
          const bucket = monthly.get(monthKey(new Date(issue)));
          if (bucket) bucket.units += units;
        }
      }

      const topItems = Array.from(byItem.values())
        .sort((a, b) => b.units - a.units)
        .slice(0, 5);

      const monthlyUnits = Array.from(monthly.values())
        .sort((a, b) => a.sortKey - b.sortKey)
        .map(({ label, units }) => ({ label, units }));

      return {
        topItems,
        monthlyUnits,
        totalUnits,
        totalRevenue,
        avgPerItem: totalUnits > 0 ? totalRevenue / totalUnits : 0,
      };
    },
  });
}
