import { useState } from "react";
import { useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModuleGuard } from "@/components/guards/ModuleGuard";
import { HRBreadcrumb } from "@/components/hr/HRBreadcrumb";
import { useHREmployee, useUpdateHREmployee } from "@/hooks/hr/useHREmployees";
import { useHRWorkSessions, useClockAction } from "@/hooks/hr/useHRTimeEntries";
import { useHRAbsences, useApproveAbsence } from "@/hooks/hr/useHRAbsences";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogIn, LogOut, Check, X, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import QRCode from "react-qr-code";

const STATUS_MAP: Record<string, { label: string; class: string }> = {
  active: { label: "Activo", class: "bg-green-100 text-green-800" },
  inactive: { label: "Inactivo", class: "bg-gray-100 text-gray-800" },
  on_leave: { label: "Ausente", class: "bg-yellow-100 text-yellow-800" },
};

export default function HREmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: employee, isLoading } = useHREmployee(id);
  const updateEmployee = useUpdateHREmployee();
  const { data: sessions = [] } = useHRWorkSessions(id);
  const { data: absences = [] } = useHRAbsences(undefined, id);
  const clockAction = useClockAction();
  const approveAbsence = useApproveAbsence();

  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  if (isLoading || !employee) {
    return (
      <ModuleGuard moduleSlug="hr-management" moduleName="Recursos Humanos">
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        </DashboardLayout>
      </ModuleGuard>
    );
  }

  const startEdit = () => {
    setEditForm({
      full_name: employee.full_name,
      email: employee.email || "",
      phone: employee.phone || "",
      job_title: employee.job_title || "",
      department: employee.department || "",
      contract_type: employee.contract_type,
      status: employee.status,
      weekly_hours: String(employee.weekly_hours),
    });
    setEditMode(true);
  };

  const saveEdit = () => {
    updateEmployee.mutate({
      id: employee.id,
      ...editForm,
      weekly_hours: parseFloat(editForm.weekly_hours) || 40,
    }, { onSuccess: () => setEditMode(false) });
  };

  return (
    <ModuleGuard moduleSlug="hr-management" moduleName="Recursos Humanos">
      <DashboardLayout>
        <HRBreadcrumb />
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={employee.avatar_url || undefined} />
              <AvatarFallback className="text-xl">{employee.full_name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">{employee.full_name}</h1>
              <p className="text-muted-foreground">{employee.job_title} · {employee.department}</p>
            </div>
            <Badge className={`ml-auto ${STATUS_MAP[employee.status]?.class}`}>{STATUS_MAP[employee.status]?.label}</Badge>
          </div>

          <Tabs defaultValue="perfil">
            <TabsList>
              <TabsTrigger value="perfil">Perfil</TabsTrigger>
              <TabsTrigger value="ponto">Ponto</TabsTrigger>
              <TabsTrigger value="ausencias">Ausências</TabsTrigger>
              <TabsTrigger value="qr">QR Code</TabsTrigger>
            </TabsList>

            <TabsContent value="perfil">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Dados do Funcionário</CardTitle>
                  {editMode ? (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveEdit} disabled={updateEmployee.isPending}>Guardar</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditMode(false)}>Cancelar</Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" onClick={startEdit}>Editar</Button>
                  )}
                </CardHeader>
                <CardContent>
                  {editMode ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Nome</Label><Input value={editForm.full_name} onChange={e => setEditForm((f: any) => ({ ...f, full_name: e.target.value }))} /></div>
                      <div><Label>Email</Label><Input value={editForm.email} onChange={e => setEditForm((f: any) => ({ ...f, email: e.target.value }))} /></div>
                      <div><Label>Telefone</Label><Input value={editForm.phone} onChange={e => setEditForm((f: any) => ({ ...f, phone: e.target.value }))} /></div>
                      <div><Label>Cargo</Label><Input value={editForm.job_title} onChange={e => setEditForm((f: any) => ({ ...f, job_title: e.target.value }))} /></div>
                      <div><Label>Departamento</Label><Input value={editForm.department} onChange={e => setEditForm((f: any) => ({ ...f, department: e.target.value }))} /></div>
                      <div><Label>Horas Semanais</Label><Input type="number" value={editForm.weekly_hours} onChange={e => setEditForm((f: any) => ({ ...f, weekly_hours: e.target.value }))} /></div>
                      <div>
                        <Label>Estado</Label>
                        <Select value={editForm.status} onValueChange={v => setEditForm((f: any) => ({ ...f, status: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Activo</SelectItem>
                            <SelectItem value="inactive">Inactivo</SelectItem>
                            <SelectItem value="on_leave">Ausente</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><span className="text-muted-foreground">Email:</span> {employee.email || "—"}</div>
                      <div><span className="text-muted-foreground">Telefone:</span> {employee.phone || "—"}</div>
                      <div><span className="text-muted-foreground">Nº Funcionário:</span> {employee.employee_number || "—"}</div>
                      <div><span className="text-muted-foreground">Contrato:</span> {employee.contract_type}</div>
                      <div><span className="text-muted-foreground">Data Início:</span> {employee.start_date || "—"}</div>
                      <div><span className="text-muted-foreground">Horas Semanais:</span> {employee.weekly_hours}h</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ponto">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Histórico de Ponto</CardTitle>
                  <div className="flex gap-2">
                    <Button size="sm" className="gap-1" onClick={() => clockAction.mutate({ employee_id: employee.id, entry_type: "clock_in", method: "manual" })} disabled={clockAction.isPending}>
                      <LogIn className="h-4 w-4" /> Entrada
                    </Button>
                    <Button size="sm" variant="destructive" className="gap-1" onClick={() => clockAction.mutate({ employee_id: employee.id, entry_type: "clock_out", method: "manual" })} disabled={clockAction.isPending}>
                      <LogOut className="h-4 w-4" /> Saída
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Entrada</TableHead>
                        <TableHead>Saída</TableHead>
                        <TableHead>Horas Trab.</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessions.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Sem registos</TableCell></TableRow>
                      ) : sessions.map(s => (
                        <TableRow key={s.id}>
                          <TableCell>{format(new Date(s.session_date + "T00:00:00"), "dd/MM/yyyy", { locale: pt })}</TableCell>
                          <TableCell>{s.clock_in_at ? format(new Date(s.clock_in_at), "HH:mm") : "—"}</TableCell>
                          <TableCell>{s.clock_out_at ? format(new Date(s.clock_out_at), "HH:mm") : "—"}</TableCell>
                          <TableCell>{s.worked_minutes != null ? `${Math.floor(s.worked_minutes / 60)}h ${s.worked_minutes % 60}m` : "—"}</TableCell>
                          <TableCell>
                            <Badge variant={s.status === "complete" ? "default" : "secondary"}>{s.status === "complete" ? "Completo" : "Incompleto"}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ausencias">
              <Card>
                <CardHeader><CardTitle>Pedidos de Ausência</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Período</TableHead>
                        <TableHead>Dias</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {absences.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Sem pedidos</TableCell></TableRow>
                      ) : absences.map(a => (
                        <TableRow key={a.id}>
                          <TableCell>
                            <Badge style={{ backgroundColor: a.hr_absence_types?.color }} className="text-white">{a.hr_absence_types?.name}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">{a.start_date} → {a.end_date}</TableCell>
                          <TableCell>{a.total_days}</TableCell>
                          <TableCell>
                            <Badge variant={a.status === "approved" ? "default" : a.status === "pending" ? "secondary" : "destructive"}>
                              {a.status === "approved" ? "Aprovado" : a.status === "pending" ? "Pendente" : a.status === "rejected" ? "Rejeitado" : a.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {a.status === "pending" && (
                              <div className="flex gap-1">
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={() => approveAbsence.mutate({ absence_id: a.id, action: "approved" })}>
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600" onClick={() => approveAbsence.mutate({ absence_id: a.id, action: "rejected" })}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="qr">
              <Card>
                <CardHeader><CardTitle>QR Code de Ponto</CardTitle></CardHeader>
                <CardContent className="flex flex-col items-center gap-4 py-8">
                  {employee.qr_code_token ? (
                    <>
                      <QRCode value={employee.qr_code_token} size={250} />
                      <p className="text-sm text-muted-foreground">Token: {employee.qr_code_token}</p>
                    </>
                  ) : (
                    <p className="text-muted-foreground">Nenhum token QR atribuído</p>
                  )}
                  <Button variant="outline" onClick={() => {
                    const svg = document.querySelector("svg[xmlns]");
                    if (svg) {
                      const svgData = new XMLSerializer().serializeToString(svg);
                      const blob = new Blob([svgData], { type: "image/svg+xml" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `qr-${employee.full_name.replace(/\s/g, "_")}.svg`;
                      a.click();
                    }
                  }}>
                    Descarregar QR
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    </ModuleGuard>
  );
}
