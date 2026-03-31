import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form } from "@/components/ui/form";
import { RHFormField, RHSelectField, RHDateField, RHTextareaField, RHFormActions } from "@/components/hr/form";
import { employeeSchema, type EmployeeFormValues } from "@/schemas/hr/employeeSchema";
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

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      department_id: null,
      position_id: null,
      manager_id: null,
      employee_number: "",
      contract_type: "full_time",
      start_date: "",
      weekly_hours: 40,
      notes: "",
      status: "active",
    },
  });

  const filtered = deptFilter
    ? employees.filter(e => e.department_id === deptFilter)
    : employees;

  const openEdit = (emp: HREmployee) => {
    form.reset({
      department_id: emp.department_id || null,
      position_id: emp.position_id || null,
      manager_id: emp.manager_id || null,
      employee_number: emp.employee_number || "",
      contract_type: (emp.contract_type as EmployeeFormValues["contract_type"]) || "full_time",
      start_date: emp.start_date || "",
      weekly_hours: emp.weekly_hours || 40,
      notes: emp.notes || "",
      status: (emp.status as EmployeeFormValues["status"]) || "active",
    });
    setEditEmployee(emp);
  };

  const onSubmit = (values: EmployeeFormValues) => {
    if (!editEmployee) return;
    updateEmployee.mutate({
      id: editEmployee.id,
      department_id: values.department_id || null,
      position_id: values.position_id || null,
      manager_id: values.manager_id || null,
      employee_number: values.employee_number || null,
      contract_type: values.contract_type,
      start_date: values.start_date || null,
      weekly_hours: values.weekly_hours,
      notes: values.notes || null,
      status: values.status,
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
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[60vh] overflow-y-auto">
                  <div className="grid grid-cols-2 gap-4">
                    <RHSelectField
                      name="department_id"
                      label="Departamento"
                      allowNone
                      noneLabel="Nenhum"
                      options={departments.map(d => ({ value: d.id, label: d.name }))}
                    />
                    <RHSelectField
                      name="position_id"
                      label="Cargo"
                      allowNone
                      noneLabel="Nenhum"
                      options={positions.map(p => ({ value: p.id, label: p.name }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <RHSelectField
                      name="manager_id"
                      label="Manager"
                      allowNone
                      noneLabel="Nenhum"
                      options={employees.filter(e => e.id !== editEmployee?.id).map(e => ({ value: e.id, label: e.full_name }))}
                    />
                    <RHFormField name="employee_number" label="Nº Funcionário" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <RHSelectField
                      name="contract_type"
                      label="Tipo de Contrato"
                      options={[
                        { value: "full_time", label: "Tempo inteiro" },
                        { value: "part_time", label: "Part-time" },
                        { value: "contractor", label: "Prestador" },
                        { value: "intern", label: "Estagiário" },
                      ]}
                    />
                    <RHDateField name="start_date" label="Data Início" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <RHFormField name="weekly_hours" label="Horas Semanais" type="number" required />
                    <RHSelectField
                      name="status"
                      label="Estado"
                      options={[
                        { value: "active", label: "Activo" },
                        { value: "inactive", label: "Inactivo" },
                        { value: "on_leave", label: "Ausente" },
                        { value: "terminated", label: "Terminado" },
                        { value: "suspended", label: "Suspenso" },
                      ]}
                    />
                  </div>
                  <RHTextareaField name="notes" label="Notas" />
                  <DialogFooter>
                    <RHFormActions
                      onCancel={() => setEditEmployee(null)}
                      isSubmitting={updateEmployee.isPending}
                    />
                  </DialogFooter>
                </form>
              </Form>
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
