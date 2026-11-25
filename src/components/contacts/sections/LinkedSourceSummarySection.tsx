import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Summary {
  origin: string;
  contact: Record<string, string | null> | null;
  invoices: { number: string; issue_date: string; status: string; total: number; amount_paid: number }[];
  enrollments: { course: string | null; cohort: string | null; start_date: string | null; completed_at: string | null; status: string | null; financial_status: string | null }[];
}

const eur = (v: number) => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(Number(v) || 0);
const dt = (d?: string | null) => (d ? new Date(d).toLocaleDateString("pt-PT") : "—");
const LABELS: Record<string, string> = { tax_id: "NIF", address: "Morada", city: "Cidade", postal_code: "Código postal", country: "País", job_title: "Cargo", birth_date: "Data de nascimento", client_since: "Cliente desde", company: "Empresa", email: "Email", phone: "Telefone" };

export function LinkedSourceSummarySection({ contactId }: { contactId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["linked-source-summary", contactId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_linked_contact_source_summary" as any, { _contact_id: contactId });
      if (error) throw error;
      return data as unknown as Summary | null;
    },
  });
  if (isLoading || !data) return error ? <p className="text-sm text-destructive">Não foi possível carregar os dados da origem.</p> : null;
  const paid = data.invoices.reduce((s, i) => s + (Number(i.amount_paid) || 0), 0);
  const details = Object.entries(data.contact ?? {}).filter(([k, v]) => v && LABELS[k]);
  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">Dados da {data.origin} <Badge variant="outline">{data.origin}</Badge></CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 text-sm">
        {details.length > 0 && (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            {details.map(([k, v]) => (
              <div key={k}><dt className="text-xs text-muted-foreground">{LABELS[k]}</dt><dd className="text-foreground">{k.includes("date") || k === "client_since" ? dt(v) : v}</dd></div>
            ))}
          </dl>
        )}
        <div>
          <h4 className="font-semibold mb-2">Vendas ({data.invoices.length}) · Pago {eur(paid)}</h4>
          {data.invoices.length === 0 ? <p className="text-muted-foreground">Sem faturas.</p> : (
            <ul className="divide-y divide-border max-h-72 overflow-y-auto">
              {data.invoices.map((i) => (
                <li key={i.number} className="py-2 flex justify-between gap-2"><span>{i.number} · {dt(i.issue_date)}</span><span className="text-muted-foreground">{eur(i.total)} · {i.status}</span></li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h4 className="font-semibold mb-2">Formação ({data.enrollments.length})</h4>
          {data.enrollments.length === 0 ? <p className="text-muted-foreground">Sem formações.</p> : (
            <ul className="divide-y divide-border">
              {data.enrollments.map((e, idx) => (
                <li key={idx} className="py-2 flex justify-between gap-2"><span>{e.course ?? "Curso"}{e.cohort ? ` · ${e.cohort}` : ""}</span><span className="text-muted-foreground">{dt(e.start_date)} · {e.status ?? "—"}</span></li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
