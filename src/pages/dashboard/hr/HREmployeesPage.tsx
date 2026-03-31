import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModuleGuard } from "@/components/guards/ModuleGuard";
import { HRBreadcrumb } from "@/components/hr/HRBreadcrumb";
import { useHREmployees, useUpdateHREmployee, type HREmployee } from "@/hooks/hr/useHREmployees";
import { useHRDepartments } from "@/hooks/hr/useHRDepartments";
import { useHRJobTitles } from "@/hooks/hr/useHRJobTitles";
import { useHRContractTypes } from "@/hooks/hr/useHRContractTypes";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Eye, QrCode, UserCog } from "lucide-react";
import { Link } from "react-router-dom";
import QRCode from "react-qr-code";

const STATUS_MAP: Record<string, { label: string; class: string }> = {
  active: { label: "Activo", class: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  inactive: { label: "Inactivo", class: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200" },
  on_leave: { label: "Ausente", class: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  terminated: { label: "Terminado", class: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  suspended: { label: "Suspenso", class: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
};

const CONTRACT_MAP: Record<string, string> = {
  full_time: "Tempo inteiro",
  part_time: "Part-time",
  contractor: "Prestador",
  contract: "Prestador",
  intern: "Estagiário",
};

export default function HREmployeesPage() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [deptFilter, setDeptFilter] = useState("");
  const [editEmployee, setEditEmployee] = useState<HREmployee | null>(null);
  const [qrEmployee, setQrEmployee] = useState<HREmployee | null>(null);
  const { data: employees = [], isLoading } = useHREmployees(statusFilter);
  const { data: departments = [] } = useHRDepartments(true);
  const { data: positions = [] } = useHRJobTitles(true);
  const { data: contractTypes = [] } = useHRContractTypes(true);
  const updateEmployee = useUpdateHREmployee();

  const [form, setForm] = useState({
    department_id: "" as string | null,
    position_id: "" as string | null,
    manager_id: "" as string | null,
    employee_number: "",
    contract_type: "full_time",
    start_date: "",
    weekly_hours: "40",
    notes: "",
    status: "active",
  });

  const filtered = deptFilter
    ? employees.filter(e => e.department_id === deptFilter)
    : employees;

  const openEdit = (emp: HREmployee) => {
    setForm({
      department_id: emp.department_id || null,
      position_id: emp.position_id || null,
      manager_id: emp.manager_id || null,
      employee_number: emp.employee_number || "",
      contract_type: emp.contract_type || "full_time",
      start_date: emp.start_date || "",
      weekly_hours: String(emp.weekly_hours || 40),
      notes: emp.notes || "",
      status: emp.status || "active",
    });
    setEditEmployee(emp);
  };

  const handleSave = () => {
    if (!editEmployee) return;
    updateEmployee.mutate({
      id: editEmployee.id,
      department_id: form.department_id || null,
      position_id: form.position_id || null,
      manager_id: form.manager_id || null,
      employee_number: form.employee_number || null,
      contract_type: form.contract_type,
      start_date: form.start_date || null,
      weekly_hours: parseFloat(form.weekly_hours) || 40,
      notes: form.notes || null,
      status: form.status,
    }, {
      onSuccess: () => setEditEmployee(null),
    });
  };

  return (
    <ModuleGuard moduleSlug="hr-management" moduleName="Recursos Humanos">
      <DashboardLayout>
        <HRBreadcrumb />
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Funcionários</h1>
              <p className="text-muted-foreground">Gestão de colaboradores</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Select value={statusFilter || "all"} onValueChange={v => setStatusFilter(v === "all" ? undefined : v)}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="inactive">Inactivos</SelectItem>
                <SelectItem value="on_leave">Ausentes</SelectItem>
                <SelectItem value="terminated">Terminados</SelectItem>
                <SelectItem value="suspended">Suspensos</SelectItem>
              </SelectContent>
            </Select>
            {departments.length > 0 && (
              <Select value={deptFilter || "all"} onValueChange={v => setDeptFilter(v === "all" ? "" : v)}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Departamento" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Nº</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Manager</TableHead>
                    <TableHead>Contrato</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={8} className="text-center">A carregar...</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Sem funcionários</TableCell></TableRow>
                  ) : filtered.map(emp => (
                    <TableRow key={emp.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={emp.avatar_url || undefined} />
                            <AvatarFallback>{emp.full_name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{emp.full_name}</p>
                            {emp.email && <p className="text-xs text-muted-foreground">{emp.email}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{emp.employee_number || "—"}</TableCell>
                      <TableCell className="text-sm">{emp.position_name || emp.job_title || "—"}</TableCell>
                      <TableCell className="text-sm">{emp.department_name || "—"}</TableCell>
                      <TableCell className="text-sm">{emp.manager_name || "—"}</TableCell>
                      <TableCell className="text-sm">{CONTRACT_MAP[emp.contract_type || ""] || emp.contract_type || "—"}</TableCell>
                      <TableCell>
                        <Badge className={STATUS_MAP[emp.status]?.class || ""}>{STATUS_MAP[emp.status]?.label || emp.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" asChild>
                            <Link to={`/dashboard/hr/employees/${emp.id}`}><Eye className="h-4 w-4" /></Link>
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(emp)} title="Editar perfil HR">
                            <UserCog className="h-4 w-4" />
                          </Button>
                          {emp.qr_code_token && (
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setQrEmployee(emp)}>
                              <QrCode className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Edit HR Profile Dialog */}
          <Dialog open={!!editEmployee} onOpenChange={() => setEditEmployee(null)}>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Editar — {editEmployee?.full_name}</DialogTitle></DialogHeader>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Departamento</Label>
                    <Select value={form.department_id || "none"} onValueChange={v => setForm(f => ({ ...f, department_id: v === "none" ? null : v }))}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Cargo</Label>
                    <Select value={form.position_id || "none"} onValueChange={v => setForm(f => ({ ...f, position_id: v === "none" ? null : v }))}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {positions.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Manager</Label>
                    <Select value={form.manager_id || "none"} onValueChange={v => setForm(f => ({ ...f, manager_id: v === "none" ? null : v }))}>
                      <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {employees.filter(e => e.id !== editEmployee?.id).map(e => (
                          <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Nº Funcionário</Label><Input value={form.employee_number} onChange={e => setForm(f => ({ ...f, employee_number: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Tipo de Contrato</Label>
                    <Select value={form.contract_type} onValueChange={v => setForm(f => ({ ...f, contract_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full_time">Tempo inteiro</SelectItem>
                        <SelectItem value="part_time">Part-time</SelectItem>
                        <SelectItem value="contractor">Prestador</SelectItem>
                        <SelectItem value="intern">Estagiário</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Data Início</Label><Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Horas Semanais</Label><Input type="number" value={form.weekly_hours} onChange={e => setForm(f => ({ ...f, weekly_hours: e.target.value }))} /></div>
                  <div>
                    <Label>Estado</Label>
                    <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Activo</SelectItem>
                        <SelectItem value="inactive">Inactivo</SelectItem>
                        <SelectItem value="on_leave">Ausente</SelectItem>
                        <SelectItem value="terminated">Terminado</SelectItem>
                        <SelectItem value="suspended">Suspenso</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Notas</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
                <Button onClick={handleSave} disabled={updateEmployee.isPending} className="w-full">
                  {updateEmployee.isPending ? "A guardar..." : "Guardar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* QR Code Dialog */}
          <Dialog open={!!qrEmployee} onOpenChange={() => setQrEmployee(null)}>
            <DialogContent>
              <DialogHeader><DialogTitle>QR Code — {qrEmployee?.full_name}</DialogTitle></DialogHeader>
              <div className="flex flex-col items-center gap-4 p-4">
                {qrEmployee?.qr_code_token && <QRCode value={qrEmployee.qr_code_token} size={200} />}
                <p className="text-sm text-muted-foreground">Use este QR no terminal de ponto</p>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </DashboardLayout>
    </ModuleGuard>
  );
}
