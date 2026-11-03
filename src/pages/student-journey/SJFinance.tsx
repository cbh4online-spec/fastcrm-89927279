import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Lock, Search, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useSjFinanceAccess } from "@/hooks/useStudentProfileRecords";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { agreedAmount, computeEnrollmentFinance } from "@/lib/studentJourney/enrollmentFinance";
import { calendarDaysFromToday, lisbonTodayYmd } from "@/lib/dates/lisbonDays";

const db = supabase as any;
const eur = (n: number) => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(n);
const fmtDate = (d: string) => new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${d}T12:00:00Z`));
const PAGE = 25;

async function fetchAll(build: (from: number, to: number) => any) {
  const out: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(from, from + 999);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

type InstState = "pago" | "parcial" | "vencida" | "por_vencer";
const STATE_LABEL: Record<InstState, string> = { pago: "Paga", parcial: "Parcial", vencida: "Vencida", por_vencer: "Por vencer" };

export default function SJFinance() {
  const { currentWorkspace } = useWorkspace();
  const ws = currentWorkspace?.id;
  const access = useSjFinanceAccess();
  const allowed = access.data === true;
  const [params, setParams] = useSearchParams();
  const view = params.get("view") ?? "all";
  const [q, setQ] = useState("");
  const [state, setState] = useState<string>("all");
  const [course, setCourse] = useState<string>("all");
  const [sort, setSort] = useState<"due_asc" | "due_desc" | "open_desc">("due_asc");
  const [page, setPage] = useState(0);

  const data = useQuery({
    queryKey: ["sj-finance-overview", ws],
    enabled: !!ws && allowed,
    queryFn: async () => {
      const [enr, inst, links] = await Promise.all([
        fetchAll((f, t) => db.from("sj_enrollments")
          .select("id, base_amount, discount_amount, agreed_amount, financial_status, cohort_id, course:sj_courses(id,name), cohort:sj_cohorts(id,name), profile:sj_profiles(id,full_name)")
          .eq("workspace_id", ws).order("id").range(f, t)),
        fetchAll((f, t) => db.from("sj_installments").select("id, enrollment_id, installment_no, amount, due_date, paid_amount")
          .eq("workspace_id", ws).order("id").range(f, t)),
        fetchAll((f, t) => db.from("sj_enrollment_invoices").select("enrollment_id, invoice_id, allocated_amount")
          .eq("workspace_id", ws).order("id").range(f, t)),
      ]);
      const ids = [...new Set(links.map((l: any) => l.invoice_id))];
      const invMap = new Map<string, any>();
      for (let i = 0; i < ids.length; i += 200) {
        const { data: d, error } = await db.from("invoices").select("id,total,status").eq("workspace_id", ws).in("id", ids.slice(i, i + 200));
        if (error) throw error;
        (d ?? []).forEach((x: any) => invMap.set(x.id, x));
      }
      return { enr, inst: inst.map((i: any) => ({ ...i, amount: Number(i.amount), paid_amount: Number(i.paid_amount) })), links, invMap };
    },
  });

  const today = lisbonTodayYmd();
  const computed = useMemo(() => {
    if (!data.data) return null;
    const { enr, inst, links, invMap } = data.data;
    const byEnr = new Map<string, any[]>();
    inst.forEach((i: any) => { const a = byEnr.get(i.enrollment_id) ?? []; a.push(i); byEnr.set(i.enrollment_id, a); });
    const tot = { contracted: 0, paid: 0, invoiced: 0, overdue: 0, open: 0 };
    const enrMap = new Map<string, any>();
    for (const e of enr) {
      enrMap.set(e.id, e);
      const contracted = agreedAmount(e.base_amount == null ? null : Number(e.base_amount), Number(e.discount_amount ?? 0), e.agreed_amount == null ? null : Number(e.agreed_amount));
      const invs = links.filter((l: any) => l.enrollment_id === e.id).map((l: any) => {
        const iv = invMap.get(l.invoice_id);
        return { invoice_id: l.invoice_id, allocated_amount: l.allocated_amount == null ? null : Number(l.allocated_amount), invoice_total: Number(iv?.total ?? 0), invoice_status: iv?.status ?? "void" };
      });
      const f = computeEnrollmentFinance(contracted, byEnr.get(e.id) ?? [], invs, today);
      (Object.keys(tot) as (keyof typeof tot)[]).forEach((k) => (tot[k] += f[k]));
    }
    const rows = inst.map((i: any) => {
      const e = enrMap.get(i.enrollment_id);
      const st: InstState = i.paid_amount >= i.amount - 0.004 ? "pago" : i.due_date < today ? "vencida" : i.paid_amount > 0 ? "parcial" : "por_vencer";
      return { ...i, st, open: Math.max(0, i.amount - i.paid_amount), days: calendarDaysFromToday(i.due_date),
        student: e?.profile?.full_name ?? "—", profileId: e?.profile?.id, course: e?.course?.name ?? "—", courseId: e?.course?.id, cohort: e?.cohort?.name };
    });
    const courses = [...new Map(rows.filter((r: any) => r.courseId).map((r: any) => [r.courseId, r.course])).entries()];
    return { tot, rows, courses };
  }, [data.data, today]);

  const filtered = useMemo(() => {
    if (!computed) return [];
    const term = q.trim().toLowerCase();
    let r = computed.rows.filter((x: any) =>
      (view !== "due7" || (x.st !== "pago" && x.days >= 0 && x.days <= 7)) &&
      (view !== "overdue" || x.st === "vencida") &&
      (state === "all" || x.st === state) &&
      (course === "all" || x.courseId === course) &&
      (!term || x.student.toLowerCase().includes(term) || x.course.toLowerCase().includes(term)));
    r = [...r].sort((a: any, b: any) => sort === "open_desc" ? b.open - a.open : sort === "due_desc" ? b.due_date.localeCompare(a.due_date) : a.due_date.localeCompare(b.due_date));
    return r;
  }, [computed, q, state, course, sort, view]);

  if (access.isLoading) return <Skeleton className="h-64" />;
  if (!allowed) return (
    <Card><CardContent className="py-10 text-center text-muted-foreground"><Lock className="mx-auto mb-2 h-8 w-8" aria-hidden />Sem permissão para ver a informação financeira da Jornada.</CardContent></Card>
  );

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const pageRows = filtered.slice(page * PAGE, page * PAGE + PAGE);
  const setView = (v: string) => { setPage(0); setParams(v === "all" ? {} : { view: v }); };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Financeiro</h1>
        <p className="text-sm text-muted-foreground">Contratado, pago e faturado são contados separadamente. Nada é faturado automaticamente.</p>
      </div>
      {data.isError && <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"><AlertTriangle className="h-4 w-4" aria-hidden />Não foi possível carregar os dados financeiros.</div>}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {([["Contratado", "contracted"], ["Pago", "paid"], ["Faturado", "invoiced"], ["Vencido", "overdue"], ["Em aberto", "open"]] as const).map(([l, k]) => (
          <Card key={k}><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{l}</p>
            {computed ? <p className={`text-lg font-semibold tabular-nums ${k === "overdue" && computed.tot.overdue > 0 ? "text-destructive" : ""}`}>{eur(computed.tot[k])}</p> : <Skeleton className="mt-1 h-6 w-20" />}
          </CardContent></Card>
        ))}
      </div>
      <Card>
        <CardHeader className="space-y-3 pb-3">
          <div className="flex flex-wrap gap-2">
            {[["all", "Todas"], ["due7", "Vence nos próximos 7 dias"], ["overdue", "Em atraso"]].map(([v, l]) => (
              <Button key={v} size="sm" variant={view === v ? "default" : "outline"} onClick={() => setView(v)}>{l}</Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
              <Input aria-label="Pesquisar aluno ou curso" className="pl-8" placeholder="Aluno ou curso" maxLength={80} value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} />
            </div>
            <Select value={state} onValueChange={(v) => { setState(v); setPage(0); }}>
              <SelectTrigger className="w-40" aria-label="Estado"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todos os estados</SelectItem>{Object.entries(STATE_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={course} onValueChange={(v) => { setCourse(v); setPage(0); }}>
              <SelectTrigger className="w-44" aria-label="Curso"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todos os cursos</SelectItem>{computed?.courses.map(([id, n]) => <SelectItem key={id as string} value={id as string}>{n as string}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => setSort(v as any)}>
              <SelectTrigger className="w-44" aria-label="Ordenar"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="due_asc">Vencimento ↑</SelectItem><SelectItem value="due_desc">Vencimento ↓</SelectItem><SelectItem value="open_desc">Maior em aberto</SelectItem></SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {data.isLoading ? <Skeleton className="h-48" /> : filtered.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground"><Wallet className="mx-auto mb-2 h-8 w-8 opacity-50" aria-hidden />Sem prestações. Defina planos de pagamento na ficha de cada aluno.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>Aluno</TableHead><TableHead>Curso</TableHead><TableHead>Prest.</TableHead><TableHead>Vencimento</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="text-right">Em aberto</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {pageRows.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell>{r.profileId ? <Link className="underline-offset-2 hover:underline" to={`/dashboard/student-journey/profiles/${r.profileId}?tab=finance`}>{r.student}</Link> : r.student}</TableCell>
                        <TableCell>{r.course}{r.cohort ? <span className="block text-xs text-muted-foreground">{r.cohort}</span> : null}</TableCell>
                        <TableCell>{r.installment_no}</TableCell>
                        <TableCell className="whitespace-nowrap">{fmtDate(r.due_date)}</TableCell>
                        <TableCell className="text-right tabular-nums">{eur(r.amount)}</TableCell>
                        <TableCell className="text-right tabular-nums">{eur(r.open)}</TableCell>
                        <TableCell><Badge variant={r.st === "vencida" ? "destructive" : r.st === "pago" ? "default" : "secondary"}>{STATE_LABEL[r.st as InstState]}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{filtered.length} prestações</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>Anterior</Button>
                  <span className="self-center">{page + 1}/{pages}</span>
                  <Button size="sm" variant="outline" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>Seguinte</Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
