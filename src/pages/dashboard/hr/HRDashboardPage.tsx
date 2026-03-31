import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { HRBreadcrumb } from "@/components/hr/HRBreadcrumb";
import { ModuleGuard } from "@/components/guards/ModuleGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { KPICard, KPIGrid } from "@/components/design-system/KPICard";
import { useHREmployees } from "@/hooks/hr/useHREmployees";
import { useHRWorkSessions } from "@/hooks/hr/useHRTimeEntries";
import { useHRAbsences } from "@/hooks/hr/useHRAbsences";
import { useCandidates } from "@/hooks/hr/useCandidates";
import { useOKRs } from "@/hooks/hr/useOKRs";
import { useFeedback } from "@/hooks/hr/useFeedback";
import { useCheckins } from "@/hooks/hr/useCheckins";
import {
  Users, UserCheck, CalendarDays, Clock, Briefcase, UserPlus,
  Plus, Target, MessageSquare, CalendarCheck, ChevronLeft, ChevronRight,
  ArrowRight,
} from "lucide-react";
import {
  format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  addMonths, subMonths, isSameMonth, parseISO, isWithinInterval,
} from "date-fns";
import { pt } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

// ─── Quick Actions ───────────────────────────────────────────
const quickActions = [
  { label: "Adicionar Colaborador", icon: UserPlus, path: "/dashboard/hr/employees" },
  { label: "Pedir Ausência", icon: CalendarDays, path: "/dashboard/hr/absences" },
  { label: "Publicar Vaga", icon: Briefcase, path: "/dashboard/hr/recruitment/jobs" },
  { label: "Criar OKR", icon: Target, path: "/dashboard/hr/okrs" },
  { label: "Agendar Check-in", icon: CalendarCheck, path: "/dashboard/hr/checkins" },
];

// ─── Mini Absence Calendar ───────────────────────────────────
function AbsenceCalendar() {
  const [month, setMonth] = useState(new Date());
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const { data: absences = [], isLoading } = useHRAbsences("approved");

  const monthAbsences = useMemo(
    () =>
      absences.filter((a) => {
        try {
          const start = parseISO(a.start_date);
          const end = parseISO(a.end_date);
          return (
            isSameMonth(start, month) ||
            isSameMonth(end, month) ||
            isWithinInterval(monthStart, { start, end })
          );
        } catch {
          return false;
        }
      }),
    [absences, month, monthStart],
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Calendário de Ausências</CardTitle>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMonth((m) => subMonths(m, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[100px] text-center capitalize">
            {format(month, "MMMM yyyy", { locale: pt })}
          </span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMonth((m) => addMonths(m, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-6">A carregar…</p>
        ) : monthAbsences.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Sem ausências neste mês</p>
        ) : (
          <div className="space-y-2 max-h-[260px] overflow-y-auto">
            {monthAbsences.map((a) => (
              <div key={a.id} className="flex items-center gap-3 p-2 rounded-lg border">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={a.hr_employees?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">{a.hr_employees?.full_name?.charAt(0) || "?"}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{a.hr_employees?.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.start_date} → {a.end_date}
                  </p>
                </div>
                <Badge
                  style={{ backgroundColor: a.hr_absence_types?.color }}
                  className="text-white text-xs shrink-0"
                >
                  {a.hr_absence_types?.name}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── OKR Widget ──────────────────────────────────────────────
function OKRWidget() {
  const navigate = useNavigate();
  const { data: okrs = [], isLoading } = useOKRs({ status: "active" });
  const avgProgress = okrs.length > 0 ? Math.round(okrs.reduce((a, o) => a + (o.progress || 0), 0) / okrs.length) : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">OKRs Activos</CardTitle>
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => navigate("/dashboard/hr/okrs")}>
          Ver todos <ArrowRight className="h-3 w-3" />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-4">A carregar…</p>
        ) : okrs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum OKR activo</p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{okrs.length}</span>
              <span className="text-sm text-muted-foreground">Progresso médio</span>
            </div>
            <Progress value={avgProgress} className="h-2" />
            <p className="text-xs text-muted-foreground text-right">{avgProgress}%</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Feedback Widget ─────────────────────────────────────────
function FeedbackWidget() {
  const navigate = useNavigate();
  const { data: feedback = [], isLoading } = useFeedback("all");
  const unread = feedback.filter((f) => !f.read_at).length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Feedback</CardTitle>
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => navigate("/dashboard/hr/feedback")}>
          Ver todos <ArrowRight className="h-3 w-3" />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-4">A carregar…</p>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold">{feedback.length}</span>
              <span className="text-sm text-muted-foreground">total</span>
            </div>
            {unread > 0 && (
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                {unread} não lido{unread > 1 ? "s" : ""}
              </Badge>
            )}
            {feedback.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum feedback registado</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Check-ins Widget ────────────────────────────────────────
function CheckinsWidget() {
  const navigate = useNavigate();
  const { data: checkins = [], isLoading } = useCheckins("scheduled");
  const upcoming = checkins.slice(0, 3);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Próximos Check-ins</CardTitle>
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => navigate("/dashboard/hr/checkins")}>
          Ver todos <ArrowRight className="h-3 w-3" />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-4">A carregar…</p>
        ) : upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum check-in agendado</p>
        ) : (
          <div className="space-y-2">
            {upcoming.map((c) => (
              <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg border">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={c.employee?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">{c.employee?.full_name?.charAt(0) || "?"}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.employee?.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(parseISO(c.scheduled_at), "dd MMM · HH:mm", { locale: pt })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────
export default function HRDashboardPage() {
  const navigate = useNavigate();
  const { data: employees = [] } = useHREmployees("active");
  const { data: candidates = [] } = useCandidates();
  const today = format(new Date(), "yyyy-MM-dd");
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

  const { data: todaySessions = [] } = useHRWorkSessions(undefined, today, today);
  const { data: weekSessions = [] } = useHRWorkSessions(undefined, weekStart, weekEnd);
  const { data: pendingAbsences = [] } = useHRAbsences("pending");

  const presentNow = todaySessions.filter((s) => s.clock_in_at && !s.clock_out_at);
  const weekHours = weekSessions.reduce((acc, s) => acc + (s.worked_minutes || 0), 0);

  // New hires: employees whose start_date is within last 30 days
  const thirtyDaysAgo = format(subDays(new Date(), 30), "yyyy-MM-dd");
  const newHires = employees.filter((e) => e.start_date && e.start_date >= thirtyDaysAgo);

  // Chart data: hours per day last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i);
    const dateStr = format(d, "yyyy-MM-dd");
    const dayLabel = format(d, "EEE", { locale: pt });
    const daySessions = weekSessions.filter((s) => s.session_date === dateStr);
    const hours = daySessions.reduce((a, s) => a + (s.worked_minutes || 0), 0) / 60;
    return { day: dayLabel, horas: Math.round(hours * 10) / 10 };
  });

  return (
    <ModuleGuard moduleSlug="hr-management" moduleName="Recursos Humanos">
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold">Recursos Humanos</h1>
            <p className="text-muted-foreground">Visão geral do módulo RH</p>
          </div>

          {/* KPI Cards (6) */}
          <KPIGrid columns={3}>
            <KPICard
              title="Funcionários Activos"
              value={employees.length}
              icon={<Users className="h-4 w-4" />}
              variant="primary"
            />
            <KPICard
              title="Presentes Hoje"
              value={presentNow.length}
              icon={<UserCheck className="h-4 w-4" />}
              variant="success"
            />
            <KPICard
              title="Ausências Pendentes"
              value={pendingAbsences.length}
              icon={<CalendarDays className="h-4 w-4" />}
              variant="warning"
            />
            <KPICard
              title="Horas esta Semana"
              value={`${Math.floor(weekHours / 60)}h ${weekHours % 60}m`}
              icon={<Clock className="h-4 w-4" />}
              variant="default"
            />
            <KPICard
              title="Candidatos Activos"
              value={candidates.length}
              icon={<Briefcase className="h-4 w-4" />}
              variant="primary"
              onClick={() => navigate("/dashboard/hr/recruitment")}
            />
            <KPICard
              title="Novas Contratações"
              value={newHires.length}
              icon={<UserPlus className="h-4 w-4" />}
              variant="success"
              description="Últimos 30 dias"
            />
          </KPIGrid>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Acções Rápidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {quickActions.map((a) => (
                  <Button
                    key={a.path}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => navigate(a.path)}
                  >
                    <a.icon className="h-4 w-4" />
                    {a.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Main grid: Chart + Present + Calendar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Horas Trabalhadas (últimos 7 dias)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={last7Days}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="day" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Bar dataKey="horas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Presentes Agora</CardTitle>
              </CardHeader>
              <CardContent>
                {presentNow.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Ninguém registado</p>
                ) : (
                  <div className="space-y-3 max-h-[240px] overflow-y-auto">
                    {presentNow.map((s) => (
                      <div key={s.id} className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={s.hr_employees?.avatar_url || undefined} />
                          <AvatarFallback>{s.hr_employees?.full_name?.charAt(0) || "?"}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{s.hr_employees?.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            Desde {s.clock_in_at ? format(new Date(s.clock_in_at), "HH:mm") : "—"}
                          </p>
                        </div>
                        <Badge variant="secondary" className="ml-auto bg-success/10 text-success text-xs">
                          Em serviço
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Widgets row: Calendar + OKRs + Feedback + Check-ins */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <AbsenceCalendar />
            <OKRWidget />
            <FeedbackWidget />
            <CheckinsWidget />
          </div>

          {/* Pending Absences */}
          {pendingAbsences.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Ausências Pendentes de Aprovação</CardTitle>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => navigate("/dashboard/hr/absences")}>
                  Gerir <ArrowRight className="h-3 w-3" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {pendingAbsences.slice(0, 5).map((a) => (
                    <div key={a.id} className="flex items-center gap-3 p-2 rounded-lg border">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{a.hr_employees?.full_name?.charAt(0) || "?"}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{a.hr_employees?.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.start_date} → {a.end_date} · {a.total_days} dias
                        </p>
                      </div>
                      <Badge
                        style={{ backgroundColor: a.hr_absence_types?.color }}
                        className="text-white text-xs"
                      >
                        {a.hr_absence_types?.name}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardLayout>
    </ModuleGuard>
  );
}
