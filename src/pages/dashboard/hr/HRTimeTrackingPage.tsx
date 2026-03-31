import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModuleGuard } from "@/components/guards/ModuleGuard";
import { HRBreadcrumb } from "@/components/hr/HRBreadcrumb";
import { useHRWorkSessions, useClockAction } from "@/hooks/hr/useHRTimeEntries";
import { useHREmployeesList } from "@/hooks/hr/useCheckins";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogIn, LogOut, Clock, Users } from "lucide-react";
import { format, subDays } from "date-fns";
import { pt } from "date-fns/locale";

export default function HRTimeTrackingPage() {
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 7), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [employeeFilter, setEmployeeFilter] = useState<string | undefined>();

  const { data: employees = [] } = useHREmployeesList();
  const { data: sessions = [], isLoading } = useHRWorkSessions(employeeFilter, startDate, endDate);
  const clockAction = useClockAction();

  // Totals per employee
  const totals = employees.map(emp => {
    const empSessions = sessions.filter(s => s.employee_id === emp.id);
    const totalWorked = empSessions.reduce((a, s) => a + (s.worked_minutes || 0), 0);
    return { ...emp, totalWorked };
  }).filter(e => e.totalWorked > 0);

  return (
    <ModuleGuard moduleSlug="hr-management" moduleName="Recursos Humanos">
      <DashboardLayout>
        <HRBreadcrumb />
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Controlo de Ponto</h1>
            <p className="text-muted-foreground">Registo e consulta de horas</p>
          </div>

          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-xs text-muted-foreground">Data Início</label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-auto" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Data Fim</label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-auto" />
            </div>
            <Select value={employeeFilter || "all"} onValueChange={v => setEmployeeFilter(v === "all" ? undefined : v)}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Funcionário" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Quick clock actions */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Registar Ponto</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {employees.map(emp => (
                  <div key={emp.id} className="flex items-center gap-2 p-2 rounded-lg border">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{emp.full_name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium flex-1 truncate">{emp.full_name}</span>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={() => clockAction.mutate({ employee_id: emp.id, entry_type: "clock_in", method: "manual" })} disabled={clockAction.isPending}>
                      <LogIn className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600" onClick={() => clockAction.mutate({ employee_id: emp.id, entry_type: "clock_out", method: "manual" })} disabled={clockAction.isPending}>
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Totals */}
          {totals.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Resumo por Funcionário</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {totals.map(t => (
                    <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg border">
                      <Avatar className="h-8 w-8"><AvatarFallback>{t.full_name.charAt(0)}</AvatarFallback></Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{t.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {Math.floor(t.totalWorked / 60)}h {t.totalWorked % 60}m
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sessions table */}
          <Card>
            <CardHeader><CardTitle>Sessões</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Funcionário</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Entrada</TableHead>
                    <TableHead>Saída</TableHead>
                    <TableHead>Horas Trab.</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={6} className="text-center">A carregar...</TableCell></TableRow>
                  ) : sessions.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Sem registos</TableCell></TableRow>
                  ) : sessions.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.hr_employees?.full_name || "—"}</TableCell>
                      <TableCell>{format(new Date(s.session_date + "T00:00:00"), "dd/MM/yyyy", { locale: pt })}</TableCell>
                      <TableCell>{s.clock_in_at ? format(new Date(s.clock_in_at), "HH:mm") : "—"}</TableCell>
                      <TableCell>{s.clock_out_at ? format(new Date(s.clock_out_at), "HH:mm") : "—"}</TableCell>
                      <TableCell>{s.worked_minutes != null ? `${Math.floor(s.worked_minutes / 60)}h ${s.worked_minutes % 60}m` : "—"}</TableCell>
                      <TableCell><Badge variant={s.status === "complete" ? "default" : "secondary"}>{s.status === "complete" ? "Completo" : "Incompleto"}</Badge></TableCell>
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
