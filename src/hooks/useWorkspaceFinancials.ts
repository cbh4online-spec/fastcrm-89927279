import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const ACTIVE_STATUSES = ["sent", "partially_paid", "paid"];

export interface FinancialsInvoice {
  id: string;
  status: string | null;
  subtotal: number | null;
  tax_amount: number | null;
  total: number | null;
  amount_paid: number | null;
  issue_date: string | null;
  due_date: string | null;
  paid_at: string | null;
  company_id: string | null;
  contact_id: string | null;
  client_name: string | null;
}

export interface MonthlyBucket {
  month: number; // 0-11
  total: number;
}

export interface YearlyFaturacao {
  year: number;
  months: number[]; // 12 entries, subtotal s/IVA
  total: number;
}

export interface DebtorRow {
  key: string;
  name: string;
  notDue: number;
  overdue: number;
}

export interface ClientShare {
  key: string;
  name: string;
  total: number;
  percent: number;
}

export interface WorkspaceFinancials {
  invoices: FinancialsInvoice[];
  /** Faturação anual (subtotal s/IVA) por mês para os últimos 3 anos */
  yearly: YearlyFaturacao[];
  kpis: {
    today: number;
    thisMonth: number;
    thisMonthDelta: number; // % vs same month last year
    thisQuarter: number;
    thisQuarterDelta: number;
    thisYear: number;
    thisYearDelta: number;
  };
  collections: {
    totalOutstanding: number; // total c/IVA em aberto
    notDue: number; // não vencido
    overdue: number; // vencido
    received: number; // recebido (últimos 7 meses agregado)
    /** Envelhecimento por mês (últimos 7 meses): {label, recebido, naoVencido, vencido} */
    aging: Array<{ label: string; recebido: number; naoVencido: number; vencido: number }>;
    /** Top devedores ordenados por (vencido desc, notDue desc) */
    topDebtors: DebtorRow[];
  };
  clients: {
    /** Dependência de clientes (top 8 por subtotal) */
    dependency: ClientShare[];
    activeCount: number;
    newCount: number;
    avgPerClient: number;
    avgPerNewClient: number;
    /** Clientes ativos por mês (últimos 12 meses): novos vs recorrentes */
    monthly: Array<{ label: string; novos: number; recorrentes: number }>;
  };
  vat: {
    monthly: Array<{ label: string; total: number; month: number; year: number }>; // últimos 12 meses
  };
}

function startOfDay(d: Date) {
  d.setHours(0, 0, 0, 0);
  return d;
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function fmtMonthLabel(d: Date) {
  return d.toLocaleDateString("pt-PT", { month: "short" }).replace(".", "").toUpperCase();
}

export function useWorkspaceFinancials(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["workspace-financials", workspaceId],
    enabled: !!workspaceId,
    staleTime: 60_000,
    queryFn: async (): Promise<WorkspaceFinancials> => {
      const { data, error } = await supabase
        .from("invoices")
        .select(
          "id,status,subtotal,tax_amount,total,amount_paid,issue_date,due_date,paid_at,company_id,contact_id,client_name"
        )
        .eq("workspace_id", workspaceId!)
        .in("status", ACTIVE_STATUSES)
        .not("issue_date", "is", null)
        .order("issue_date", { ascending: false })
        .limit(10000);
      if (error) throw error;

      const invoices = (data || []) as FinancialsInvoice[];
      const today = startOfDay(new Date());
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth();
      const currentQuarter = Math.floor(currentMonth / 3);

      // --- Yearly faturação (3 anos)
      const yearsMap = new Map<number, number[]>();
      for (let y = currentYear - 2; y <= currentYear; y++) yearsMap.set(y, Array(12).fill(0));
      for (const inv of invoices) {
        if (!inv.issue_date) continue;
        const d = new Date(inv.issue_date);
        const y = d.getFullYear();
        const arr = yearsMap.get(y);
        if (!arr) continue;
        arr[d.getMonth()] += Number(inv.subtotal || 0);
      }
      const yearly: YearlyFaturacao[] = Array.from(yearsMap.entries()).map(([year, months]) => ({
        year,
        months,
        total: months.reduce((a, b) => a + b, 0),
      }));

      // --- KPIs
      const todayStr = today.toISOString().slice(0, 10);
      let kToday = 0;
      let kMonth = 0,
        kMonthPrev = 0;
      let kQuarter = 0,
        kQuarterPrev = 0;
      let kYear = 0,
        kYearPrev = 0;

      for (const inv of invoices) {
        if (!inv.issue_date) continue;
        const d = new Date(inv.issue_date);
        const net = Number(inv.subtotal || 0);
        const y = d.getFullYear();
        const m = d.getMonth();
        const q = Math.floor(m / 3);
        if (inv.issue_date.slice(0, 10) === todayStr) kToday += net;
        if (y === currentYear && m === currentMonth) kMonth += net;
        if (y === currentYear - 1 && m === currentMonth) kMonthPrev += net;
        if (y === currentYear && q === currentQuarter) kQuarter += net;
        if (y === currentYear - 1 && q === currentQuarter) kQuarterPrev += net;
        if (y === currentYear) kYear += net;
        if (y === currentYear - 1) kYearPrev += net;
      }
      const pct = (cur: number, prev: number) =>
        prev > 0 ? ((cur - prev) / prev) * 100 : cur > 0 ? 100 : 0;

      // --- Cobranças
      let totalOutstanding = 0;
      let notDue = 0;
      let overdue = 0;
      let received = 0;
      const debtorMap = new Map<string, DebtorRow>();

      // aging buckets últimos 7 meses
      const agingMap = new Map<string, { label: string; recebido: number; naoVencido: number; vencido: number; sortKey: number }>();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(currentYear, currentMonth - i, 1);
        const key = monthKey(d);
        agingMap.set(key, {
          label: fmtMonthLabel(d),
          recebido: 0,
          naoVencido: 0,
          vencido: 0,
          sortKey: d.getTime(),
        });
      }

      for (const inv of invoices) {
        const gross = Number(inv.total || 0);
        const paid = Number(inv.amount_paid || 0);
        const remaining = Math.max(0, gross - paid);
        received += paid;

        if (remaining > 0.005) {
          totalOutstanding += remaining;
          const isOverdue = inv.due_date ? new Date(inv.due_date) < today : false;
          if (isOverdue) overdue += remaining;
          else notDue += remaining;

          const debtorKey = inv.company_id || inv.contact_id || inv.client_name || inv.id;
          const debtorName = inv.client_name || "—";
          const row = debtorMap.get(debtorKey) || {
            key: debtorKey,
            name: debtorName,
            notDue: 0,
            overdue: 0,
          };
          if (isOverdue) row.overdue += remaining;
          else row.notDue += remaining;
          debtorMap.set(debtorKey, row);
        }

        // aging by issue_date
        if (inv.issue_date) {
          const d = new Date(inv.issue_date);
          const key = monthKey(d);
          const bucket = agingMap.get(key);
          if (bucket) {
            bucket.recebido += paid;
            const rem = Math.max(0, gross - paid);
            const isOver = inv.due_date ? new Date(inv.due_date) < today : false;
            if (isOver) bucket.vencido += rem;
            else bucket.naoVencido += rem;
          }
        }
      }
      const aging = Array.from(agingMap.values())
        .sort((a, b) => a.sortKey - b.sortKey)
        .map(({ sortKey, ...rest }) => rest);
      const topDebtors = Array.from(debtorMap.values())
        .sort((a, b) => b.overdue + b.notDue - (a.overdue + a.notDue))
        .slice(0, 10);

      // --- Clientes
      const clientTotals = new Map<string, { name: string; total: number; firstSeen: string }>();
      for (const inv of invoices) {
        const key = inv.company_id || inv.contact_id || inv.client_name || inv.id;
        const name = inv.client_name || "—";
        const cur = clientTotals.get(key) || { name, total: 0, firstSeen: inv.issue_date || "" };
        cur.total += Number(inv.subtotal || 0);
        if (inv.issue_date && (!cur.firstSeen || inv.issue_date < cur.firstSeen)) {
          cur.firstSeen = inv.issue_date;
        }
        clientTotals.set(key, cur);
      }
      const totalClientsRevenue = Array.from(clientTotals.values()).reduce((a, c) => a + c.total, 0) || 1;
      const dependency: ClientShare[] = Array.from(clientTotals.entries())
        .map(([key, c]) => ({
          key,
          name: c.name,
          total: c.total,
          percent: (c.total / totalClientsRevenue) * 100,
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 8);

      // Monthly active clients (últimos 12 meses)
      const monthlyClientsMap = new Map<
        string,
        { label: string; sortKey: number; novosSet: Set<string>; recorrentesSet: Set<string> }
      >();
      for (let i = 11; i >= 0; i--) {
        const d = new Date(currentYear, currentMonth - i, 1);
        monthlyClientsMap.set(monthKey(d), {
          label: fmtMonthLabel(d),
          sortKey: d.getTime(),
          novosSet: new Set(),
          recorrentesSet: new Set(),
        });
      }
      const seenBeforeMap = new Map<string, string>(); // key -> first issue_date
      // pre-pass: first invoice ever per client
      const sortedAsc = [...invoices].sort((a, b) =>
        (a.issue_date || "").localeCompare(b.issue_date || "")
      );
      for (const inv of sortedAsc) {
        if (!inv.issue_date) continue;
        const key = inv.company_id || inv.contact_id || inv.client_name || inv.id;
        if (!seenBeforeMap.has(key)) seenBeforeMap.set(key, inv.issue_date);
      }
      for (const inv of sortedAsc) {
        if (!inv.issue_date) continue;
        const d = new Date(inv.issue_date);
        const bucket = monthlyClientsMap.get(monthKey(d));
        if (!bucket) continue;
        const key = inv.company_id || inv.contact_id || inv.client_name || inv.id;
        const firstSeen = seenBeforeMap.get(key);
        const isNew =
          firstSeen &&
          new Date(firstSeen).getFullYear() === d.getFullYear() &&
          new Date(firstSeen).getMonth() === d.getMonth();
        if (isNew) bucket.novosSet.add(key);
        else bucket.recorrentesSet.add(key);
      }
      const monthly = Array.from(monthlyClientsMap.values())
        .sort((a, b) => a.sortKey - b.sortKey)
        .map((b) => ({ label: b.label, novos: b.novosSet.size, recorrentes: b.recorrentesSet.size }));

      const activeCount = monthly.slice(-1)[0]
        ? monthly[monthly.length - 1].novos + monthly[monthly.length - 1].recorrentes
        : 0;
      const newCount = monthly[monthly.length - 1]?.novos ?? 0;
      const avgPerClient = clientTotals.size > 0 ? totalClientsRevenue / clientTotals.size : 0;
      const newClientsTotals = Array.from(clientTotals.values()).filter((c) => {
        if (!c.firstSeen) return false;
        const d = new Date(c.firstSeen);
        return d.getFullYear() === currentYear;
      });
      const avgPerNewClient =
        newClientsTotals.length > 0
          ? newClientsTotals.reduce((a, c) => a + c.total, 0) / newClientsTotals.length
          : 0;

      // --- IVA mensal (últimos 12 meses)
      const vatMap = new Map<string, { label: string; total: number; month: number; year: number; sortKey: number }>();
      for (let i = 11; i >= 0; i--) {
        const d = new Date(currentYear, currentMonth - i, 1);
        vatMap.set(monthKey(d), {
          label: fmtMonthLabel(d),
          total: 0,
          month: d.getMonth(),
          year: d.getFullYear(),
          sortKey: d.getTime(),
        });
      }
      for (const inv of invoices) {
        if (!inv.issue_date) continue;
        const d = new Date(inv.issue_date);
        const bucket = vatMap.get(monthKey(d));
        if (!bucket) continue;
        bucket.total += Number(inv.tax_amount || 0);
      }
      const vatMonthly = Array.from(vatMap.values())
        .sort((a, b) => a.sortKey - b.sortKey)
        .map(({ sortKey, ...rest }) => rest);

      return {
        invoices,
        yearly,
        kpis: {
          today: kToday,
          thisMonth: kMonth,
          thisMonthDelta: pct(kMonth, kMonthPrev),
          thisQuarter: kQuarter,
          thisQuarterDelta: pct(kQuarter, kQuarterPrev),
          thisYear: kYear,
          thisYearDelta: pct(kYear, kYearPrev),
        },
        collections: {
          totalOutstanding,
          notDue,
          overdue,
          received,
          aging,
          topDebtors,
        },
        clients: {
          dependency,
          activeCount,
          newCount,
          avgPerClient,
          avgPerNewClient,
          monthly,
        },
        vat: { monthly: vatMonthly },
      };
    },
  });
}
