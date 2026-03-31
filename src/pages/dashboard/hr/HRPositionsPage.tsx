import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModuleGuard } from "@/components/guards/ModuleGuard";
import { HRBreadcrumb } from "@/components/hr/HRBreadcrumb";
import { useHRJobTitles, useCreateHRJobTitle, useUpdateHRJobTitle, useDeleteHRJobTitle } from "@/hooks/hr/useHRJobTitles";
import { useHRDepartments } from "@/hooks/hr/useHRDepartments";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { RHFormField, RHSelectField, RHTextareaField, RHFormActions } from "@/components/hr/form";
import { positionSchema, type PositionFormValues } from "@/schemas/hr/positionSchema";
import { Briefcase, Plus, Pencil, Trash2, Search } from "lucide-react";
import { KPICard, KPIGrid } from "@/components/design-system/KPICard";

export default function HRPositionsPage() {
  const { data: jobTitles, isLoading } = useHRJobTitles();
  const { data: departments } = useHRDepartments(true);
  const createJob = useCreateHRJobTitle();
  const updateJob = useUpdateHRJobTitle();
  const deleteJob = useDeleteHRJobTitle();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const form = useForm<PositionFormValues>({
    resolver: zodResolver(positionSchema),
    defaultValues: { name: "", description: "", department_id: null, level: "", salary_min: null, salary_max: null, currency: "EUR" },
  });

  const filtered = jobTitles?.filter((j) =>
    j.name.toLowerCase().includes(search.toLowerCase())
  );

  const activeJobs = jobTitles?.filter((j) => j.is_active).length ?? 0;

  const openCreate = () => {
    setEditId(null);
    form.reset({ name: "", description: "", department_id: null, level: "", salary_min: null, salary_max: null, currency: "EUR" });
    setDialogOpen(true);
  };

  const openEdit = (j: any) => {
    setEditId(j.id);
    form.reset({
      name: j.name,
      description: j.description || "",
      department_id: j.department_id || null,
      level: j.level || "",
      salary_min: j.salary_min ?? null,
      salary_max: j.salary_max ?? null,
      currency: j.currency || "EUR",
    });
    setDialogOpen(true);
  };

  const onSubmit = (values: PositionFormValues) => {
    const payload = {
      name: values.name.trim(),
      description: values.description.trim() || undefined,
      department_id: values.department_id,
      level: values.level.trim() || null,
      salary_min: values.salary_min,
      salary_max: values.salary_max,
      currency: values.currency,
    };
    if (editId) {
      updateJob.mutate({ id: editId, ...payload });
    } else {
      createJob.mutate(payload);
    }
    setDialogOpen(false);
  };

  return (
    <ModuleGuard moduleSlug="hr-management" moduleName="Gestão de RH">
      <DashboardLayout>
        <HRBreadcrumb />

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Briefcase className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Cargos</h1>
                <p className="text-muted-foreground text-sm">Gestão de cargos e funções da organização</p>
              </div>
            </div>
            <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Novo Cargo</Button>
          </div>

          <KPIGrid columns={3}>
            <KPICard title="Total" value={jobTitles?.length ?? 0} icon={<Briefcase className="h-5 w-5" />} />
            <KPICard title="Ativos" value={activeJobs} icon={<Briefcase className="h-5 w-5" />} />
            <KPICard title="Inativos" value={(jobTitles?.length ?? 0) - activeJobs} icon={<Briefcase className="h-5 w-5" />} />
          </KPIGrid>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Pesquisar cargos..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                </div>
              </div>

              {isLoading ? (
                <p className="text-muted-foreground text-sm py-8 text-center">A carregar...</p>
              ) : !filtered?.length ? (
                <p className="text-muted-foreground text-sm py-8 text-center">
                  {search ? "Nenhum cargo encontrado." : "Nenhum cargo configurado."}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Departamento</TableHead>
                      <TableHead>Nível</TableHead>
                      <TableHead>Faixa Salarial</TableHead>
                      <TableHead className="w-24 text-center">Estado</TableHead>
                      <TableHead className="w-24 text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((j) => (
                      <TableRow key={j.id}>
                        <TableCell className="font-medium">{j.name}</TableCell>
                        <TableCell className="text-muted-foreground">{(j as any).hr_departments?.name || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{j.level || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {j.salary_min || j.salary_max
                            ? `${j.salary_min?.toLocaleString() ?? "—"} – ${j.salary_max?.toLocaleString() ?? "—"} ${j.currency || "EUR"}`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch checked={j.is_active} onCheckedChange={(checked) => updateJob.mutate({ id: j.id, is_active: checked })} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(j)}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteJob.mutate(j.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editId ? "Editar" : "Novo"} Cargo</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
                <RHFormField name="name" label="Nome" required placeholder="Nome do cargo" />
                <RHTextareaField name="description" label="Descrição" placeholder="Descrição das funções" rows={3} />
                <RHSelectField
                  name="department_id"
                  label="Departamento"
                  allowNone
                  noneLabel="Sem departamento"
                  options={departments?.map((d) => ({ value: d.id, label: d.name })) || []}
                />
                <RHFormField name="level" label="Nível" placeholder="Ex: Junior, Senior, Lead" />
                <div className="grid grid-cols-3 gap-3">
                  <RHFormField name="salary_min" label="Salário Mín." type="number" placeholder="0" />
                  <RHFormField name="salary_max" label="Salário Máx." type="number" placeholder="0" />
                  <RHSelectField
                    name="currency"
                    label="Moeda"
                    options={[
                      { value: "EUR", label: "EUR" },
                      { value: "USD", label: "USD" },
                      { value: "GBP", label: "GBP" },
                    ]}
                  />
                </div>
                <DialogFooter>
                  <RHFormActions
                    onCancel={() => setDialogOpen(false)}
                    isSubmitting={createJob.isPending || updateJob.isPending}
                  />
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </ModuleGuard>
  );
}
