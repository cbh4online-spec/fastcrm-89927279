import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModuleGuard } from "@/components/guards/ModuleGuard";
import { HRBreadcrumb } from "@/components/hr/HRBreadcrumb";
import { useHRWorkSessions, useClockAction } from "@/hooks/hr/useHRTimeEntries";
import { useHREmployeesList } from "@/hooks/hr/useCheckins";
import { useActiveLaborRules } from "@/hooks/hr/useHRLaborRules";
import { useHRAttendanceAnomalies, useResolveAnomaly, useAnomalyStats } from "@/hooks/hr/useHRAttendanceAnomalies";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { LogIn, LogOut, Users, AlertTriangle, Clock, UserX, CheckCircle2, ShieldAlert, ScanFace } from "lucide-react";
import FaceCaptureDialog from "@/components/hr/FaceCaptureDialog";
import { format, subDays } from "date-fns";
import { pt } from "date-fns/locale";

const anomalyTypeConfig = {
  open_session: { label: "Sessão Aberta", icon: Clock, color: "text-blue-600" },
  late_arrival: { label: "Atraso", icon: AlertTriangle, color: "text-amber-600" },
  unjustified_absence: { label: "Falta", icon: UserX, color: "text-red-600" },
};

export default function HRTimeTrackingPage() {
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 7), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [employeeFilter, setEmployeeFilter] = useState<string | undefined>();
  const [anomalyTypeFilter, setAnomalyTypeFilter] = useState("all");
  const [showResolved, setShowResolved] = useState(false);
  const [resolveDialog, setResolveDialog] = useState<{ id: string; description: string | null } | null>(null);
  const [resolveNotes, setResolveNotes] = useState("");
  const [manualClockDialog, setManualClockDialog] = useState<{ employeeId: string; employeeName: string; type: "clock_in" | "clock_out" } | null>(null);
  const [manualNotes, setManualNotes] = useState("");
  const [faceDialogOpen, setFaceDialogOpen] = useState(false);

  const { data: employees = [] } = useHREmployeesList();
  const { data: sessions = [], isLoading } = useHRWorkSessions(employeeFilter, startDate, endDate);
  const clockAction = useClockAction();
  const { data: activeLaborRules } = useActiveLaborRules();
  const maxDailyMin = ((activeLaborRules?.rules?.max_daily_hours) || 8) * 60;

  const { data: stats } = useAnomalyStats();
  const { data: anomalies = [], isLoading: anomaliesLoading } = useHRAttendanceAnomalies({
    resolved: showResolved ? undefined : false,
    anomalyType: anomalyTypeFilter,
  });
  const resolveAnomaly = useResolveAnomaly();

  const handleResolve = () => {
    if (!resolveDialog) return;
    resolveAnomaly.mutate(
      { anomalyId: resolveDialog.id, notes: resolveNotes },
      { onSuccess: () => { setResolveDialog(null); setResolveNotes(""); } }
    );
  };

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

          {/* Anomaly KPIs */}
          {stats && stats.total > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="border-destructive/30 bg-destructive/5">
                <CardContent className="p-4 flex items-center gap-3">
                  <ShieldAlert className="h-8 w-8 text-destructive" />
                  <div>
                    <p className="text-2xl font-bold">{stats.total}</p>
                    <p className="text-xs text-muted-foreground">Anomalias Pendentes</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <Clock className="h-6 w-6 text-blue-600" />
                  <div>
                    <p className="text-xl font-bold">{stats.open_session}</p>
                    <p className="text-xs text-muted-foreground">Sessões Abertas</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <AlertTriangle className="h-6 w-6 text-amber-600" />
                  <div>
                    <p className="text-xl font-bold">{stats.late_arrival}</p>
                    <p className="text-xs text-muted-foreground">Atrasos</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <UserX className="h-6 w-6 text-red-600" />
                  <div>
                    <p className="text-xl font-bold">{stats.unjustified_absence}</p>
                    <p className="text-xs text-muted-foreground">Faltas</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Anomalies panel */}
          {(stats?.total ?? 0) > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-destructive" />
                  Anomalias de Assiduidade
                </CardTitle>
                <div className="flex gap-2">
                  <Select value={anomalyTypeFilter} onValueChange={setAnomalyTypeFilter}>
                    <SelectTrigger className="w-[160px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os tipos</SelectItem>
                      <SelectItem value="open_session">Sessão Aberta</SelectItem>
                      <SelectItem value="late_arrival">Atraso</SelectItem>
                      <SelectItem value="unjustified_absence">Falta</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant={showResolved ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => setShowResolved(!showResolved)}
                  >
                    {showResolved ? "Todas" : "Pendentes"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Colaborador</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Severidade</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {anomaliesLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center">A carregar...</TableCell>
                      </TableRow>
                    ) : anomalies.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          {showResolved ? "Sem anomalias" : "Sem anomalias pendentes 🎉"}
                        </TableCell>
                      </TableRow>
                    ) : anomalies.map((a) => {
                      const config = anomalyTypeConfig[a.anomaly_type] || anomalyTypeConfig.open_session;
                      const Icon = config.icon;
                      return (
                        <TableRow key={a.id} className={a.resolved ? "opacity-60" : ""}>
                          <TableCell className="font-medium">
                            {(a as any).hr_employees?.full_name || "—"}
                          </TableCell>
                          <TableCell>
                            {format(new Date(a.anomaly_date + "T00:00:00"), "dd/MM/yyyy", { locale: pt })}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Icon className={`h-4 w-4 ${config.color}`} />
                              <span className="text-sm">{config.label}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={a.severity === "critical" ? "destructive" : "secondary"}>
                              {a.severity === "critical" ? "Crítico" : "Aviso"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[250px] truncate">
                            {a.description || "—"}
                          </TableCell>
                          <TableCell>
                            {a.resolved ? (
                              <Badge variant="outline" className="gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Resolvida
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="text-[10px]">Pendente</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {!a.resolved && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setResolveDialog({ id: a.id, description: a.description })}
                              >
                                Resolver
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

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
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Registar Ponto</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setFaceDialogOpen(true)}>
                <ScanFace className="h-4 w-4 mr-2" /> Verificação Facial
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {employees.map(emp => (
                  <div key={emp.id} className="flex items-center gap-2 p-2 rounded-lg border">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{emp.full_name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium flex-1 truncate">{emp.full_name}</span>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={() => setManualClockDialog({ employeeId: emp.id, employeeName: emp.full_name, type: "clock_in" })} disabled={clockAction.isPending}>
                      <LogIn className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600" onClick={() => setManualClockDialog({ employeeId: emp.id, employeeName: emp.full_name, type: "clock_out" })} disabled={clockAction.isPending}>
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
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Badge variant={s.status === "complete" ? "default" : "secondary"}>{s.status === "complete" ? "Completo" : "Incompleto"}</Badge>
                          {s.status === "complete" && s.worked_minutes != null && s.worked_minutes > maxDailyMin && (
                            <Badge variant="destructive" className="text-[10px]">
                              Overtime +{Math.floor((s.worked_minutes - maxDailyMin) / 60)}h {(s.worked_minutes - maxDailyMin) % 60}m
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Resolve dialog */}
        <Dialog open={!!resolveDialog} onOpenChange={(open) => { if (!open) { setResolveDialog(null); setResolveNotes(""); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Resolver Anomalia</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{resolveDialog?.description}</p>
              <div>
                <label className="text-sm font-medium">Justificação / Notas</label>
                <Textarea
                  value={resolveNotes}
                  onChange={(e) => setResolveNotes(e.target.value)}
                  placeholder="Descreva a justificação ou acção tomada..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setResolveDialog(null); setResolveNotes(""); }}>
                Cancelar
              </Button>
              <Button onClick={handleResolve} disabled={resolveAnomaly.isPending}>
                {resolveAnomaly.isPending ? "A resolver..." : "Confirmar Resolução"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Manual Clock Dialog */}
        <Dialog open={!!manualClockDialog} onOpenChange={(open) => { if (!open) { setManualClockDialog(null); setManualNotes(""); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {manualClockDialog?.type === "clock_in" ? <LogIn className="h-5 w-5 text-green-600" /> : <LogOut className="h-5 w-5 text-red-600" />}
                Registo Manual — {manualClockDialog?.type === "clock_in" ? "Entrada" : "Saída"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-sm"><span className="font-medium">Colaborador:</span> {manualClockDialog?.employeeName}</p>
                <p className="text-sm"><span className="font-medium">Acção:</span> {manualClockDialog?.type === "clock_in" ? "Registar Entrada" : "Registar Saída"}</p>
                <p className="text-sm"><span className="font-medium">Data/Hora:</span> {format(new Date(), "dd/MM/yyyy HH:mm", { locale: pt })}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Justificação <span className="text-destructive">*</span></label>
                <Textarea
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="Indique o motivo do registo manual (mín. 5 caracteres)..."
                  rows={3}
                />
                {manualNotes.length > 0 && manualNotes.trim().length < 5 && (
                  <p className="text-xs text-destructive mt-1">A justificação deve ter pelo menos 5 caracteres.</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setManualClockDialog(null); setManualNotes(""); }}>
                Cancelar
              </Button>
              <Button
                disabled={manualNotes.trim().length < 5 || clockAction.isPending}
                onClick={() => {
                  if (!manualClockDialog) return;
                  clockAction.mutate(
                    { employee_id: manualClockDialog.employeeId, entry_type: manualClockDialog.type, method: "manual", notes: manualNotes.trim() },
                    { onSuccess: () => { setManualClockDialog(null); setManualNotes(""); } }
                  );
                }}
              >
                {clockAction.isPending ? "A registar..." : "Confirmar Registo"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </ModuleGuard>
  );
}
