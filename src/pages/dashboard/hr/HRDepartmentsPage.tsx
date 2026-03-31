import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModuleGuard } from "@/components/guards/ModuleGuard";
import { HRBreadcrumb } from "@/components/hr/HRBreadcrumb";
import { useHRDepartments, useCreateHRDepartment, useUpdateHRDepartment, useDeleteHRDepartment } from "@/hooks/hr/useHRDepartments";
import { useHREmployees } from "@/hooks/hr/useHREmployees";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form } from "@/components/ui/form";
import { RHFormField, RHSelectField, RHTextareaField, RHFormActions } from "@/components/hr/form";
import { departmentSchema, type DepartmentFormValues } from "@/schemas/hr/departmentSchema";
import { Building2, Plus, Pencil, Trash2, Users, Search } from "lucide-react";
import { KPICard, KPIGrid } from "@/components/design-system/KPICard";

export default function HRDepartmentsPage() {
  const { data: departments, isLoading } = useHRDepartments();
  const { data: employees = [] } = useHREmployees();
  const createDept = useCreateHRDepartment();
  const updateDept = useUpdateHRDepartment();
  const deleteDept = useDeleteHRDepartment();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; headcount: number } | null>(null);

  const form = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentSchema),
    defaultValues: { name: "", description: "", parent_department_id: null, head_id: null },
  });

  const filtered = departments?.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  const activeDepts = departments?.filter((d) => d.is_active).length ?? 0;
  const totalHeadcount = departments?.reduce((sum, d) => sum + d.headcount, 0) ?? 0;

  const openCreate = () => {
    setEditId(null);
    form.reset({ name: "", description: "", parent_department_id: null, head_id: null });
    setDialogOpen(true);
  };

  const openEdit = (d: any) => {
    setEditId(d.id);
    form.reset({
      name: d.name,
      description: d.description || "",
      parent_department_id: d.parent_department_id || null,
      head_id: d.head_id || null,
    });
    setDialogOpen(true);
  };

  const onSubmit = (values: DepartmentFormValues) => {
    const payload = {
      name: values.name.trim(),
      description: values.description.trim() || null,
      parent_department_id: values.parent_department_id,
      head_id: values.head_id,
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
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
                <RHFormField name="name" label="Nome" required placeholder="Nome do departamento" />
                <RHTextareaField name="description" label="Descrição" placeholder="Descrição opcional" rows={3} />
                <RHSelectField
                  name="parent_department_id"
                  label="Departamento Pai"
                  allowNone
                  noneLabel="Nenhum"
                  options={departments?.filter((d) => d.id !== editId).map((d) => ({ value: d.id, label: d.name })) || []}
                />
                <RHSelectField
                  name="head_id"
                  label="Responsável"
                  allowNone
                  noneLabel="Nenhum"
                  options={employees.map((emp) => ({ value: emp.id, label: emp.full_name }))}
                />
                <DialogFooter>
                  <RHFormActions
                    onCancel={() => setDialogOpen(false)}
                    isSubmitting={createDept.isPending || updateDept.isPending}
                  />
                </DialogFooter>
              </form>
            </Form>
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
