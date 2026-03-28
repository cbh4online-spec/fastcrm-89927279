import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModuleGuard } from "@/components/guards/ModuleGuard";
import { ClockInOutButton } from "@/components/hr/ClockInOutButton";
import { useTimeEntries } from "@/hooks/useTimeEntries";
import { useLeaveRequests } from "@/hooks/useLeaveRequests";
import { useLeaveBalances } from "@/hooks/useLeaveBalances";
import { useSessionTimeLogs } from "@/hooks/useSessionTimeLogs";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, differenceInMinutes } from "date-fns";
import { pt } from "date-fns/locale";
import { CalendarDays, Activity, Clock } from "lucide-react";

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export default function MyTimePage() {
  const { user } = useAuth();
  const { entries } = useTimeEntries();
  const { requests } = useLeaveRequests();
  const { balances } = useLeaveBalances();
  const { logs } = useSessionTimeLogs(7);

  const myEntries = entries.filter((e) => e.user_id === user?.id).slice(0, 10);
  const myRequests = requests.filter((r) => r.user_id === user?.id).slice(0, 5);
  const myBalance = balances.find((b) => b.user_id === user?.id);
  const myLogs = logs.filter((l) => l.user_id === user?.id);
  const totalActive = myLogs.reduce((s, l) => s + l.active_seconds, 0);

  return (
    <ModuleGuard moduleSlug="hr-time-tracking" moduleName="Controlo de Ponto">
      <DashboardLayout>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">Meu Registo</h1>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <ClockInOutButton />
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Férias Disponíveis</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  <span className="text-2xl font-bold">{myBalance ? myBalance.total_days - myBalance.used_days : 22}</span>
                  <span className="text-sm text-muted-foreground">dias</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Tempo Ativo (7 dias)</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-green-600" />
                  <span className="text-2xl font-bold">{formatDuration(totalActive)}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Registos de Ponto</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <span className="text-2xl font-bold">{myEntries.length}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Últimos Registos de Ponto</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Entrada</TableHead>
                      <TableHead>Saída</TableHead>
                      <TableHead>Duração</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myEntries.map((entry) => {
                      const dur = entry.clock_out
                        ? differenceInMinutes(new Date(entry.clock_out), new Date(entry.clock_in))
                        : differenceInMinutes(new Date(), new Date(entry.clock_in));
                      return (
                        <TableRow key={entry.id}>
                          <TableCell>{format(new Date(entry.clock_in), "dd/MM", { locale: pt })}</TableCell>
                          <TableCell>{format(new Date(entry.clock_in), "HH:mm")}</TableCell>
                          <TableCell>{entry.clock_out ? format(new Date(entry.clock_out), "HH:mm") : "—"}</TableCell>
                          <TableCell>{Math.floor(dur / 60)}h {dur % 60}m</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Meus Pedidos de Ausência</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myRequests.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell className="capitalize">{req.leave_type}</TableCell>
                        <TableCell className="text-sm">{req.start_date} → {req.end_date}</TableCell>
                        <TableCell>
                          <Badge variant={req.status === "approved" ? "default" : req.status === "pending" ? "secondary" : "destructive"}>
                            {req.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    </ModuleGuard>
  );
}
