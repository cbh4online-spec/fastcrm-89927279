import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModuleGuard } from "@/components/guards/ModuleGuard";
import { useHREmployees, useCreateHREmployee, useDeleteHREmployee, type HREmployee } from "@/hooks/hr/useHREmployees";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Eye, QrCode } from "lucide-react";
import { Link } from "react-router-dom";
import QRCode from "react-qr-code";
import { toast } from "sonner";

const STATUS_MAP: Record<string, { label: string; class: string }> = {
  active: { label: "Activo", class: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  inactive: { label: "Inactivo", class: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200" },
  on_leave: { label: "Ausente", class: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
};

const CONTRACT_MAP: Record<string, string> = {
  full_time: "Tempo inteiro",
  part_time: "Part-time",
  contractor: "Prestador",
  intern: "Estagiário",
};

export default function HREmployeesPage() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [deptFilter, setDeptFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [qrEmployee, setQrEmployee] = useState<HREmployee | null>(null);
  const { data: employees = [], isLoading } = useHREmployees(statusFilter);
  const createEmployee = useCreateHREmployee();
  const deleteEmployee = useDeleteHREmployee();

  // Form state
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", job_title: "", department: "", employee_number: "", contract_type: "full_time", start_date: "", weekly_hours: "40", notes: "" });

  const filtered = deptFilter
    ? employees.filter(e => e.department?.toLowerCase().includes(deptFilter.toLowerCase()))
    : employees;

  const departments = [...new Set(employees.map(e => e.department).filter(Boolean))];

  const handleCreate = () => {
    if (!form.full_name) { toast.error("Nome é obrigatório"); return; }
    createEmployee.mutate({
      full_name: form.full_name,
      email: form.email || null,
      phone: form.phone || null,
      job_title: form.job_title || null,
      department: form.department || null,
      employee_number: form.employee_number || null,
      contract_type: form.contract_type as any,
      start_date: form.start_date || null,
      weekly_hours: parseFloat(form.weekly_hours) || 40,
      notes: form.notes || null,
    }, {
      onSuccess: () => {
        setDialogOpen(false);
        setForm({ full_name: "", email: "", phone: "", job_title: "", department: "", employee_number: "", contract_type: "full_time", start_date: "", weekly_hours: "40", notes: "" });
      }
    });
  };

  return (
    <ModuleGuard moduleSlug="hr-management" moduleName="Recursos Humanos">
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Funcionários</h1>
              <p className="text-muted-foreground">Gestão de recursos humanos</p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="h-4 w-4" /> Novo Funcionário</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Novo Funcionário</DialogTitle></DialogHeader>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                  <div><Label>Nome Completo *</Label><Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
                    <div><Label>Telefone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Cargo</Label><Input value={form.job_title} onChange={e => setForm(f => ({ ...f, job_title: e.target.value }))} /></div>
                    <div><Label>Departamento</Label><Input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Nº Funcionário</Label><Input value={form.employee_number} onChange={e => setForm(f => ({ ...f, employee_number: e.target.value }))} /></div>
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
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Data Início</Label><Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
                    <div><Label>Horas Semanais</Label><Input type="number" value={form.weekly_hours} onChange={e => setForm(f => ({ ...f, weekly_hours: e.target.value }))} /></div>
                  </div>
                  <div><Label>Notas</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
                  <Button onClick={handleCreate} disabled={createEmployee.isPending} className="w-full">
                    {createEmployee.isPending ? "A criar..." : "Criar Funcionário"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex gap-3">
            <Select value={statusFilter || "all"} onValueChange={v => setStatusFilter(v === "all" ? undefined : v)}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="inactive">Inactivos</SelectItem>
                <SelectItem value="on_leave">Ausentes</SelectItem>
              </SelectContent>
            </Select>
            {departments.length > 0 && (
              <Select value={deptFilter || "all"} onValueChange={v => setDeptFilter(v === "all" ? "" : v)}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Departamento" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {departments.map(d => <SelectItem key={d!} value={d!}>{d}</SelectItem>)}
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
                    <TableHead>Cargo</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Contrato</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={6} className="text-center">A carregar...</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Sem funcionários</TableCell></TableRow>
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
                      <TableCell className="text-sm">{emp.job_title || "—"}</TableCell>
                      <TableCell className="text-sm">{emp.department || "—"}</TableCell>
                      <TableCell className="text-sm">{CONTRACT_MAP[emp.contract_type] || emp.contract_type}</TableCell>
                      <TableCell>
                        <Badge className={STATUS_MAP[emp.status]?.class || ""}>{STATUS_MAP[emp.status]?.label || emp.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" asChild>
                            <Link to={`/dashboard/hr/employees/${emp.id}`}><Eye className="h-4 w-4" /></Link>
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setQrEmployee(emp)}>
                            <QrCode className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => {
                            if (confirm("Eliminar este funcionário?")) deleteEmployee.mutate(emp.id);
                          }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* QR Code Dialog */}
          <Dialog open={!!qrEmployee} onOpenChange={() => setQrEmployee(null)}>
            <DialogContent>
              <DialogHeader><DialogTitle>QR Code — {qrEmployee?.full_name}</DialogTitle></DialogHeader>
              <div className="flex flex-col items-center gap-4 p-4">
                {qrEmployee && <QRCode value={qrEmployee.qr_code_token} size={200} />}
                <p className="text-sm text-muted-foreground">Use este QR no terminal de ponto</p>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </DashboardLayout>
    </ModuleGuard>
  );
}
