import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModuleGuard } from "@/components/guards/ModuleGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useHREmployees } from "@/hooks/hr/useHREmployees";
import { useHRWorkSessions } from "@/hooks/hr/useHRTimeEntries";
import { useHRAbsences } from "@/hooks/hr/useHRAbsences";
import { Users, UserCheck, CalendarDays, Clock } from "lucide-react";
import { format, subDays, startOfWeek, endOfWeek } from "date-fns";
import { pt } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function HRDashboardPage() {
  const { data: employees = [] } = useHREmployees("active");
  const today = format(new Date(), "yyyy-MM-dd");
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

  const { data: todaySessions = [] } = useHRWorkSessions(undefined, today, today);
  const { data: weekSessions = [] } = useHRWorkSessions(undefined, weekStart, weekEnd);
  const { data: pendingAbsences = [] } = useHRAbsences("pending");

  const presentNow = todaySessions.filter(s => s.clock_in_at && !s.clock_out_at);
  const weekHours = weekSessions.reduce((acc, s) => acc + (s.worked_minutes || 0), 0);

  // Chart data: hours per day last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i);
    const dateStr = format(d, "yyyy-MM-dd");
    const dayLabel = format(d, "EEE", { locale: pt });
    const daySessions = weekSessions.filter(s => s.session_date === dateStr);
    const hours = daySessions.reduce((a, s) => a + (s.worked_minutes || 0), 0) / 60;
    return { day: dayLabel, horas: Math.round(hours * 10) / 10 };
  });

  return (
    <ModuleGuard moduleSlug="hr-management" moduleName="Recursos Humanos">
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Recursos Humanos</h1>
            <p className="text-muted-foreground">Visão geral do módulo RH</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Funcionários Activos</CardTitle></CardHeader>
              <CardContent><div className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /><span className="text-2xl font-bold">{employees.length}</span></div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Presentes Hoje</CardTitle></CardHeader>
              <CardContent><div className="flex items-center gap-2"><UserCheck className="h-5 w-5 text-green-600" /><span className="text-2xl font-bold">{presentNow.length}</span></div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Ausências Pendentes</CardTitle></CardHeader>
              <CardContent><div className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-yellow-600" /><span className="text-2xl font-bold">{pendingAbsences.length}</span></div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Horas esta Semana</CardTitle></CardHeader>
              <CardContent><div className="flex items-center gap-2"><Clock className="h-5 w-5 text-primary" /><span className="text-2xl font-bold">{Math.floor(weekHours / 60)}h {weekHours % 60}m</span></div></CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>Horas Trabalhadas (últimos 7 dias)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
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
              <CardHeader><CardTitle>Presentes Agora</CardTitle></CardHeader>
              <CardContent>
                {presentNow.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Ninguém registado</p>
                ) : (
                  <div className="space-y-3">
                    {presentNow.map(s => (
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
                        <Badge variant="secondary" className="ml-auto bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Em serviço</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {pendingAbsences.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Ausências Pendentes de Aprovação</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {pendingAbsences.slice(0, 5).map(a => (
                    <div key={a.id} className="flex items-center gap-3 p-2 rounded-lg border">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{a.hr_employees?.full_name?.charAt(0) || "?"}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{a.hr_employees?.full_name}</p>
                        <p className="text-xs text-muted-foreground">{a.start_date} → {a.end_date} · {a.total_days} dias</p>
                      </div>
                      <Badge style={{ backgroundColor: a.hr_absence_types?.color }} className="text-white text-xs">
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
