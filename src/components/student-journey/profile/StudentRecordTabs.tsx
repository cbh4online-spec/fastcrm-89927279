import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, Award, CalendarCheck, Clock, Lock, Route, Wallet, Zap } from "lucide-react";
import type { SJEnrollment } from "@/types/studentJourney";
import { agreedAmount, computeEnrollmentFinance } from "@/lib/studentJourney/enrollmentFinance";
import { lisbonTodayYmd } from "@/lib/dates/lisbonDays";
import type { TimelineEvent } from "@/lib/studentJourney/timeline";
import type { SjInstallmentRow, SjInvoiceLinkRow } from "@/hooks/useStudentProfileRecords";

const eur = (n: number) => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(n);
const fmtDate = (d: string) =>
  new Intl.DateTimeFormat("pt-PT", { timeZone: "Europe/Lisbon", day: "2-digit", month: "short", year: "numeric" }).format(new Date(d.length === 10 ? `${d}T12:00:00Z` : d));

function Empty({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="py-8 text-center text-muted-foreground">
      <Icon className="mx-auto mb-2 h-8 w-8 opacity-50" aria-hidden />
      <p className="text-sm">{text}</p>
    </div>
  );
}
function ErrorBox() {
  return (
    <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
      <AlertTriangle className="h-4 w-4" aria-hidden /> Não foi possível carregar estes dados. Tente novamente.
    </div>
  );
}
const courseName = (e: SJEnrollment) => e.course?.name || "Curso";

// ---------- Percurso ----------
const RECOMMENDED = ["Iniciação", "Básica", "Avançada", "Tricologia"];
const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function PathTab({ enrollments }: { enrollments: SJEnrollment[] }) {
  const done = enrollments.filter((e) => e.status === "completed");
  const ongoing = enrollments.filter((e) => ["enrolled", "active"].includes(e.status));
  const taken = enrollments.filter((e) => e.status !== "dropped").map((e) => norm(courseName(e)));
  const next = RECOMMENDED.find((step) => !taken.some((n) => n.includes(norm(step))));
  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-base">Percurso formativo</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <Section title={`Concluídos (${done.length})`} items={done.map(courseName)} empty="Ainda sem cursos concluídos" />
        <Section title={`Em curso (${ongoing.length})`} items={ongoing.map(courseName)} empty="Sem cursos em curso" />
        <div className="rounded-md border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Próximo curso sugerido (apenas sugestão)</p>
          <p className="font-medium">{next ?? "Percurso recomendado completo"}</p>
          <p className="mt-1 text-xs text-muted-foreground">{RECOMMENDED.join(" → ")}</p>
        </div>
      </CardContent>
    </Card>
  );
}
function Section({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div>
      <p className="mb-1 text-sm font-medium">{title}</p>
      {items.length ? (
        <div className="flex flex-wrap gap-1">{items.map((i, k) => <Badge key={k} variant="secondary">{i}</Badge>)}</div>
      ) : <p className="text-sm text-muted-foreground">{empty}</p>}
    </div>
  );
}

// ---------- Financeiro ----------
export function FinanceTab({
  enrollments, data, isLoading, isError, allowed,
}: {
  enrollments: SJEnrollment[];
  data?: { installments: SjInstallmentRow[]; invoices: SjInvoiceLinkRow[] };
  isLoading: boolean; isError: boolean; allowed: boolean;
}) {
  if (!allowed) return <Card><CardContent className="pt-6"><Empty icon={Lock} text="Sem permissão para ver os dados financeiros." /></CardContent></Card>;
  if (isLoading) return <Skeleton className="h-48" />;
  if (isError) return <ErrorBox />;
  if (!enrollments.length) return <Card><CardContent className="pt-6"><Empty icon={Wallet} text="Sem inscrições com valores." /></CardContent></Card>;
  const today = lisbonTodayYmd();
  return (
    <div className="space-y-4">
      {enrollments.map((e) => {
        const raw = e as any;
        const contracted = agreedAmount(raw.base_amount ?? null, Number(raw.discount_amount ?? 0), raw.agreed_amount ?? null);
        const inst = data?.installments.filter((i) => i.enrollment_id === e.id) ?? [];
        const invs = data?.invoices.filter((i) => i.enrollment_id === e.id) ?? [];
        const f = computeEnrollmentFinance(contracted, inst, invs, today);
        return (
          <Card key={e.id}>
            <CardHeader className="pb-2"><CardTitle className="text-base">{courseName(e)}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
                {([["Contratado", f.contracted], ["Pago", f.paid], ["Faturado", f.invoiced], ["Vencido", f.overdue], ["Em aberto", f.open]] as const).map(([l, v]) => (
                  <div key={l} className="rounded-md border p-2">
                    <dt className="text-xs text-muted-foreground">{l}</dt>
                    <dd className={l === "Vencido" && v > 0 ? "font-semibold text-destructive" : "font-semibold"}>{eur(v)}</dd>
                  </div>
                ))}
              </dl>
              {inst.length ? (
                <ul className="divide-y rounded-md border text-sm">
                  {inst.map((i) => (
                    <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 p-2">
                      <span>Prestação {i.installment_no} · vence {fmtDate(i.due_date)}</span>
                      <span className="tabular-nums">{eur(i.paid_amount)} / {eur(i.amount)}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-muted-foreground">Sem prestações definidas.</p>}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ---------- Certificação ----------
export function CertificationTab({
  enrollments, attendance, certificates, isLoading, isError,
}: {
  enrollments: SJEnrollment[];
  attendance: { id: string; enrollment_id: string; session_date: string; present: boolean; hours_attended: number }[];
  certificates: { id: string; enrollment_id: string; status: string; issued_at: string | null; evaluation: string | null }[];
  isLoading: boolean; isError: boolean;
}) {
  if (isLoading) return <Skeleton className="h-48" />;
  if (isError) return <ErrorBox />;
  if (!enrollments.length) return <Card><CardContent className="pt-6"><Empty icon={Award} text="Sem inscrições." /></CardContent></Card>;
  const CERT: Record<string, string> = { pending: "Pendente", issued: "Emitido", revoked: "Revogado" };
  return (
    <div className="space-y-4">
      {enrollments.map((e) => {
        const att = attendance.filter((a) => a.enrollment_id === e.id);
        const present = att.filter((a) => a.present);
        const hours = present.reduce((s, a) => s + Number(a.hours_attended || 0), 0);
        const cert = certificates.find((c) => c.enrollment_id === e.id);
        return (
          <Card key={e.id}>
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">{courseName(e)}</CardTitle>
                <Badge variant={cert?.status === "issued" ? "default" : "outline"}>Certificado: {cert ? CERT[cert.status] ?? cert.status : "Sem registo"}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><CalendarCheck className="mr-1 inline h-4 w-4" aria-hidden />{present.length} presenças · {att.length - present.length} faltas · {hours} h</p>
              {cert?.issued_at && <p className="text-muted-foreground">Emitido a {fmtDate(cert.issued_at)}</p>}
              {cert?.evaluation && <p className="text-muted-foreground">Avaliação: {cert.evaluation}</p>}
              {!att.length && <p className="text-muted-foreground">Sem presenças registadas. O curso só pode ser concluído com presença registada.</p>}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ---------- Linha temporal ----------
const KIND_ICON: Record<TimelineEvent["kind"], any> = {
  enrollment: Route, payment: Wallet, attendance: CalendarCheck, certificate: Award, touchpoint: Zap,
};
export function StudentTimeline({ events, isLoading }: { events: TimelineEvent[]; isLoading: boolean }) {
  const list = useMemo(() => events.slice(0, 100), [events]);
  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Clock className="h-4 w-4" aria-hidden />Linha temporal</CardTitle></CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-32" /> : !list.length ? <Empty icon={Clock} text="Sem eventos registados" /> : (
          <ScrollArea className="max-h-[520px] pr-2">
            <ol className="space-y-3">
              {list.map((ev) => {
                const Icon = KIND_ICON[ev.kind];
                return (
                  <li key={ev.id} className="flex gap-3">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted"><Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden /></span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{ev.title}</p>
                      {ev.detail && <p className="truncate text-xs text-muted-foreground">{ev.detail}</p>}
                      <p className="text-xs text-muted-foreground">{fmtDate(ev.date)}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
