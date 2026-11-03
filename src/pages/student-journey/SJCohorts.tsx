import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Search, MoreHorizontal, Eye, Trash2, GraduationCap, Users, MapPin, CalendarDays, List, ChevronLeft, ChevronRight } from "lucide-react";
import { useCohorts } from "@/hooks/useStudentJourney";
import { CreateCohortDialog } from "@/components/student-journey/CreateCohortDialog";
import { CohortPhaseProgress } from "@/components/student-journey/CohortPhaseProgress";
import {
  EDITION_STATUSES, EDITION_STATUS_LABEL, SJ_CITIES, computeEditionSeats, editionDaysInMonth, isEditionStatus,
} from "@/lib/studentJourney/editions";
import { lisbonTodayYmd } from "@/lib/dates/lisbonDays";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  planned: "outline", provisional: "secondary", confirmed: "default", in_progress: "default", completed: "secondary", cancelled: "destructive",
};
const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export default function SJCohorts() {
  const navigate = useNavigate();
  const { cohorts, isLoading, deleteCohort } = useCohorts();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [view, setView] = useState<"list" | "calendar">("list");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const today = lisbonTodayYmd();
  const [ym, setYm] = useState(() => ({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) }));

  const rows = useMemo(
    () =>
      cohorts.map((c: any) => ({
        c,
        editionStatus: isEditionStatus(c.edition_status) ? c.edition_status : "planned",
        seats: computeEditionSeats(c.capacity, c.reserved_seats, (c.enrollment_rows ?? []).map((r: any) => r.status)),
      })),
    [cohorts],
  );

  const filtered = rows.filter(({ c, editionStatus }) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = !q || [c.name, c.edition_code, c.course?.name, c.trainer_name].some((v) => v?.toLowerCase().includes(q));
    return matchesSearch && (statusFilter === "all" || editionStatus === statusFilter) && (cityFilter === "all" || c.city === cityFilter);
  });

  const shiftMonth = (d: number) => setYm(({ y, m }) => {
    const n = m + d;
    return n < 1 ? { y: y - 1, m: 12 } : n > 12 ? { y: y + 1, m: 1 } : { y, m: n };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Edições</h1>
          <p className="text-muted-foreground">Turmas por curso, cidade e datas</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2"><Plus className="h-4 w-4" />Nova edição</Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <div className="relative flex-1 sm:min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input aria-label="Pesquisar edições" placeholder="Pesquisar por nome, código, curso ou formador…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:w-44" aria-label="Filtrar por estado"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os estados</SelectItem>
            {EDITION_STATUSES.map((s) => <SelectItem key={s} value={s}>{EDITION_STATUS_LABEL[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={cityFilter} onValueChange={setCityFilter}>
          <SelectTrigger className="sm:w-36" aria-label="Filtrar por cidade"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as cidades</SelectItem>
            {SJ_CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex gap-1" role="group" aria-label="Vista">
          <Button variant={view === "list" ? "default" : "outline"} size="sm" onClick={() => setView("list")} className="gap-1"><List className="h-4 w-4" />Lista</Button>
          <Button variant={view === "calendar" ? "default" : "outline"} size="sm" onClick={() => setView("calendar")} className="gap-1"><CalendarDays className="h-4 w-4" />Calendário</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground">A carregar…</div>
      ) : view === "calendar" ? (
        <CalendarView rows={filtered} y={ym.y} m={ym.m} today={today} onPrev={() => shiftMonth(-1)} onNext={() => shiftMonth(1)} />
      ) : filtered.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">Nenhuma edição encontrada</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(({ c: cohort, editionStatus, seats }) => (
            <Card key={cohort.id} className="transition-shadow hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <GraduationCap className="h-5 w-5 text-primary" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="truncate text-base">
                        <Link to={`/dashboard/student-journey/cohorts/${cohort.id}`} className="hover:underline focus-visible:underline">{cohort.name}</Link>
                      </CardTitle>
                      <p className="truncate text-sm text-muted-foreground">{[cohort.course?.name, cohort.edition_code].filter(Boolean).join(" · ")}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Mais ações"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/dashboard/student-journey/cohorts/${cohort.id}`)}><Eye className="mr-2 h-4 w-4" />Ver inscritos</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => confirm("Remover esta edição?") && deleteCohort.mutate(cohort.id)}><Trash2 className="mr-2 h-4 w-4" />Remover</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1">
                  <Badge variant={STATUS_VARIANT[editionStatus]}>{EDITION_STATUS_LABEL[editionStatus]}</Badge>
                  {!cohort.dates_confirmed && editionStatus !== "cancelled" && <Badge variant="outline">Datas por confirmar</Badge>}
                  {seats.full && <Badge variant="destructive">Esgotada</Badge>}
                </div>
                <div className="mt-3">
                  <CohortPhaseProgress cohortId={cohort.id} fallbackStartDate={cohort.start_date} fallbackEndDate={cohort.end_date} fallbackTitle={cohort.name} compact />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {cohort.city && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" aria-hidden />{cohort.city}</span>}
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" aria-hidden />
                    {seats.capacity == null ? `${seats.occupied} inscritos` : `${seats.occupied}/${seats.capacity} · ${seats.available} vagas${seats.reserved ? ` · ${seats.reserved} reservadas` : ""}`}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <CreateCohortDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </div>
  );
}

function CalendarView({ rows, y, m, today, onPrev, onNext }: {
  rows: { c: any; editionStatus: string }[]; y: number; m: number; today: string; onPrev: () => void; onNext: () => void;
}) {
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const offset = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7; // segunda = 0
  const byDay = new Map<number, { c: any; editionStatus: string }[]>();
  for (const r of rows) {
    if (r.editionStatus === "cancelled") continue;
    for (const d of editionDaysInMonth(r.c.start_date, r.c.end_date, y, m)) {
      byDay.set(d, [...(byDay.get(d) ?? []), r]);
    }
  }
  const cells = [...Array(offset).fill(null), ...Array.from({ length: lastDay }, (_, i) => i + 1)];
  const todayDay = today.startsWith(`${y}-${String(m).padStart(2, "0")}`) ? Number(today.slice(8, 10)) : null;
  const monthEditions = [...new Set([...byDay.values()].flat())];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <Button variant="ghost" size="icon" onClick={onPrev} aria-label="Mês anterior"><ChevronLeft className="h-4 w-4" /></Button>
        <CardTitle className="text-base capitalize">{MONTHS[m - 1]} {y}</CardTitle>
        <Button variant="ghost" size="icon" onClick={onNext} aria-label="Mês seguinte"><ChevronRight className="h-4 w-4" /></Button>
      </CardHeader>
      <CardContent>
        <div className="hidden grid-cols-7 gap-1 md:grid">
          {WEEKDAYS.map((w) => <div key={w} className="pb-1 text-center text-xs font-medium text-muted-foreground">{w}</div>)}
          {cells.map((d, i) => (
            <div key={i} className={`min-h-[84px] rounded-md border p-1 ${d == null ? "border-transparent" : ""} ${d === todayDay ? "border-primary" : ""}`}>
              {d != null && (
                <>
                  <div className="text-xs text-muted-foreground">{d}</div>
                  <div className="mt-1 space-y-0.5">
                    {(byDay.get(d) ?? []).slice(0, 3).map(({ c }) => (
                      <Link key={c.id} to={`/dashboard/student-journey/cohorts/${c.id}`} className="block truncate rounded bg-primary/10 px-1 text-[11px] text-foreground hover:bg-primary/20" title={c.name}>
                        {c.city ? `${c.city} · ` : ""}{c.name}
                      </Link>
                    ))}
                    {(byDay.get(d)?.length ?? 0) > 3 && <div className="text-[11px] text-muted-foreground">+{byDay.get(d)!.length - 3}</div>}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
        {/* Telemóvel: lista do mês */}
        <ul className="space-y-2 md:hidden">
          {monthEditions.length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">Sem edições neste mês</li>}
          {monthEditions.map(({ c }) => (
            <li key={c.id}>
              <Link to={`/dashboard/student-journey/cohorts/${c.id}`} className="block rounded-md border p-3 hover:bg-muted/50">
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">{[c.city, c.start_date?.slice(0, 10), c.end_date?.slice(0, 10)].filter(Boolean).join(" · ")}</p>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
