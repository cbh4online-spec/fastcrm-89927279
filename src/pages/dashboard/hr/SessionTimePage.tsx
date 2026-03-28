import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModuleGuard } from "@/components/guards/ModuleGuard";
import { SessionTimeChart } from "@/components/hr/SessionTimeChart";
import { useSessionTimeLogs } from "@/hooks/useSessionTimeLogs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Activity, Clock, Eye, TrendingUp } from "lucide-react";
import { format, parseISO } from "date-fns";
import { pt } from "date-fns/locale";

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export default function SessionTimePage() {
  const { logs, isLoading } = useSessionTimeLogs(14);

  const totalActive = logs.reduce((s, l) => s + l.active_seconds, 0);
  const totalIdle = logs.reduce((s, l) => s + l.idle_seconds, 0);
  const totalPages = logs.reduce((s, l) => s + l.page_views, 0);
  const avgDaily = logs.length > 0 ? Math.round(totalActive / logs.length) : 0;

  return (
    <ModuleGuard moduleSlug="hr-time-tracking" moduleName="Controlo de Ponto">
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Tempo no Sistema</h1>
            <p className="text-muted-foreground">Monitorização automática de atividade</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Média Diária</CardTitle></CardHeader>
              <CardContent><div className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /><span className="text-2xl font-bold">{formatDuration(avgDaily)}</span></div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Ativo</CardTitle></CardHeader>
              <CardContent><div className="flex items-center gap-2"><Activity className="h-5 w-5 text-green-600" /><span className="text-2xl font-bold">{formatDuration(totalActive)}</span></div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Inativo</CardTitle></CardHeader>
              <CardContent><div className="flex items-center gap-2"><Clock className="h-5 w-5 text-muted-foreground" /><span className="text-2xl font-bold">{formatDuration(totalIdle)}</span></div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Páginas Visitadas</CardTitle></CardHeader>
              <CardContent><div className="flex items-center gap-2"><Eye className="h-5 w-5 text-primary" /><span className="text-2xl font-bold">{totalPages}</span></div></CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Atividade nos Últimos 14 Dias</CardTitle></CardHeader>
            <CardContent><SessionTimeChart days={14} /></CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Detalhe por Dia</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tempo Ativo</TableHead>
                    <TableHead>Tempo Inativo</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Páginas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center">A carregar...</TableCell></TableRow>
                  ) : logs.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Sem dados</TableCell></TableRow>
                  ) : logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{format(parseISO(log.date), "dd/MM/yyyy", { locale: pt })}</TableCell>
                      <TableCell className="text-green-600">{formatDuration(log.active_seconds)}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDuration(log.idle_seconds)}</TableCell>
                      <TableCell className="font-medium">{formatDuration(log.total_seconds)}</TableCell>
                      <TableCell>{log.page_views}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ModuleGuard>
  );
}
