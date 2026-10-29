import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { computeRelatedDebt } from "@/lib/companies/relatedDebt";

const fmt = (v: number) => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v);

interface Props {
  companyId: string;
  name: string;
  email?: string | null;
}

/** Mostra dívida em empresas relacionadas (faturas em nome desta ficha, ou mesmo email). */
export function RelatedDebtCard({ companyId, name, email }: Props) {
  const { data } = useQuery({
    queryKey: ["related-debt", companyId, name, email],
    enabled: !!companyId && !!name,
    queryFn: async () => {
      const ids = new Set<string>();
      const em = (email || "").trim().toLowerCase();
      if (em) {
        const { data: cs } = await supabase.from("companies").select("id").ilike("email", em).neq("id", companyId).limit(20);
        (cs ?? []).forEach((c: any) => ids.add(c.id));
      }
      const cols = "company_id, total, amount_paid, status, document_type, due_date";
      const { data: byName, error } = await supabase
        .from("invoices").select(cols).ilike("client_name", name.trim()).neq("company_id", companyId).limit(500);
      if (error) throw error;
      let rows: any[] = byName ?? [];
      if (ids.size) {
        const { data: byEmail } = await supabase.from("invoices").select(cols)
          .in("company_id", [...ids]).ilike("client_name", name.trim()).limit(500);
        rows = rows.concat(byEmail ?? []);
      }
      const unique = new Map(rows.map((r, i) => [JSON.stringify(r) + i, r]));
      const entries = computeRelatedDebt([...unique.values()], new Date().toISOString().slice(0, 10));
      if (!entries.length) return [];
      const { data: names } = await supabase.from("companies").select("id, name").in("id", entries.map(e => e.companyId));
      const nm = new Map((names ?? []).map((n: any) => [n.id, n.name]));
      return entries.map(e => ({ ...e, name: nm.get(e.companyId) ?? "Empresa" }));
    },
  });

  if (!data?.length) return null;
  return (
    <div className="mt-3 rounded-lg border border-warning/40 bg-warning/10 p-3">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <AlertTriangle className="h-4 w-4 text-warning" aria-hidden="true" />
        Dívida em empresas relacionadas
      </div>
      <ul className="mt-2 space-y-1 text-sm">
        {data.map(e => (
          <li key={e.companyId} className="flex flex-wrap items-center justify-between gap-2">
            <Link to={`/dashboard/companies/${e.companyId}`} className="text-primary underline-offset-2 hover:underline">
              {e.name}
            </Link>
            <span className="tabular-nums">
              {fmt(e.outstanding)} em dívida{e.overdue > 0 ? ` · ${fmt(e.overdue)} vencido` : ""}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-1 text-xs text-muted-foreground">Faturas em nome de {name} emitidas com o NIF de outra empresa.</p>
    </div>
  );
}
