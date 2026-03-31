import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModuleGuard } from "@/components/guards/ModuleGuard";
import { HRBreadcrumb } from "@/components/hr/HRBreadcrumb";
import { useHRDepartments, useCreateHRDepartment, useUpdateHRDepartment, useDeleteHRDepartment } from "@/hooks/hr/useHRDepartments";
import { useHREmployees } from "@/hooks/hr/useHREmployees";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Building2, Plus, Pencil, Trash2, Users, Search } from "lucide-react";
import { KPICard, KPIGrid } from "@/components/design-system/KPICard";

interface DeptForm {
  name: string;
  description: string;
  parent_department_id: string | null;
  head_id: string | null;
}

const emptyForm: DeptForm = { name: "", description: "", parent_department_id: null, head_id: null };

export default function HRDepartmentsPage() {
  const { data: departments, isLoading } = useHRDepartments();
  const { data: employees = [] } = useHREmployees();
  const createDept = useCreateHRDepartment();
  const updateDept = useUpdateHRDepartment();
  const deleteDept = useDeleteHRDepartment();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<DeptForm>(emptyForm);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; headcount: number } | null>(null);

  const filtered = departments?.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  const activeDepts = departments?.filter((d) => d.is_active).length ?? 0;
  const totalHeadcount = departments?.reduce((sum, d) => sum + d.headcount, 0) ?? 0;

  const openCreate = () => { setEditId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (d: any) => {
    setEditId(d.id);
    setForm({
      name: d.name,
      description: d.description || "",
      parent_department_id: d.parent_department_id || null,
      head_id: d.head_id || null,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      parent_department_id: form.parent_department_id,
      head_id: form.head_id,
    };
    if (editId) {
      updateDept.mutate({ id: editId, ...payload });
    } else {
      createDept.mutate(payload);
    }
    setDialogOpen(false);
  };

  const handleDeleteClick = (d: any) => {
    setDeleteTarget({ id: d.id, name: d.name, headcount: d.headcount });
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteDept.mutate(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  return (
    <ModuleGuard moduleSlug="hr-management" moduleName="Gestão de RH">
      <DashboardLayout>
        <HRBreadcrumb />

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Departamentos</h1>
                <p className="text-muted-foreground text-sm">Estrutura organizacional da empresa</p>
              </div>
            </div>
            <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Novo Departamento</Button>
          </div>

          <KPIGrid columns={3}>
            <KPICard title="Total" value={departments?.length ?? 0} icon={<Building2 className="h-5 w-5" />} />
            <KPICard title="Ativos" value={activeDepts} icon={<Building2 className="h-5 w-5" />} />
            <KPICard title="Colaboradores" value={totalHeadcount} icon={<Users className="h-5 w-5" />} />
          </KPIGrid>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Pesquisar departamentos..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {isLoading ? (
                <p className="text-muted-foreground text-sm py-8 text-center">A carregar...</p>
              ) : !filtered?.length ? (
                <p className="text-muted-foreground text-sm py-8 text-center">
                  {search ? "Nenhum departamento encontrado." : "Nenhum departamento configurado."}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Dep. Pai</TableHead>
                      <TableHead className="text-center">Colaboradores</TableHead>
                      <TableHead className="w-24 text-center">Estado</TableHead>
                      <TableHead className="w-24 text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium">{d.name}</TableCell>
                        <TableCell className="text-muted-foreground">{d.description || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{d.head?.full_name || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{d.parent?.name || "—"}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{d.headcount}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={d.is_active}
                            onCheckedChange={(checked) => updateDept.mutate({ id: d.id, is_active: checked })}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(d)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(d)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editId ? "Editar" : "Novo"} Departamento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome do departamento" />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descrição opcional" rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Departamento Pai</Label>
                <Select value={form.parent_department_id || "none"} onValueChange={(v) => setForm({ ...form, parent_department_id: v === "none" ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {departments?.filter((d) => d.id !== editId).map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Responsável</Label>
                <Select value={form.head_id || "none"} onValueChange={(v) => setForm({ ...form, head_id: v === "none" ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={!form.name.trim()}>Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar departamento "{deleteTarget?.name}"?</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteTarget?.headcount && deleteTarget.headcount > 0
                  ? `Este departamento tem ${deleteTarget.headcount} colaborador(es) associado(s). Ao eliminar, os colaboradores ficarão sem departamento atribuído.`
                  : "Esta ação não pode ser desfeita."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DashboardLayout>
    </ModuleGuard>
  );
}
