import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModuleGuard } from "@/components/guards/ModuleGuard";
import { HRBreadcrumb } from "@/components/hr/HRBreadcrumb";
import { useHRJobTitles, useCreateHRJobTitle, useUpdateHRJobTitle, useDeleteHRJobTitle } from "@/hooks/hr/useHRJobTitles";
import { useHRDepartments } from "@/hooks/hr/useHRDepartments";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Briefcase, Plus, Pencil, Trash2, Search } from "lucide-react";
import { KPICard, KPIGrid } from "@/components/design-system/KPICard";

interface JobForm {
  name: string;
  description: string;
  department_id: string | null;
  level: string;
  salary_min: string;
  salary_max: string;
  currency: string;
}

const emptyForm: JobForm = { name: "", description: "", department_id: null, level: "", salary_min: "", salary_max: "", currency: "EUR" };

export default function HRPositionsPage() {
  const { data: jobTitles, isLoading } = useHRJobTitles();
  const { data: departments } = useHRDepartments(true);
  const createJob = useCreateHRJobTitle();
  const updateJob = useUpdateHRJobTitle();
  const deleteJob = useDeleteHRJobTitle();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<JobForm>(emptyForm);
  const [search, setSearch] = useState("");

  const filtered = jobTitles?.filter((j) =>
    j.name.toLowerCase().includes(search.toLowerCase())
  );

  const activeJobs = jobTitles?.filter((j) => j.is_active).length ?? 0;

  const openCreate = () => { setEditId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (j: any) => {
    setEditId(j.id);
    setForm({
      name: j.name,
      description: j.description || "",
      department_id: j.department_id || null,
      level: j.level || "",
      salary_min: j.salary_min?.toString() || "",
      salary_max: j.salary_max?.toString() || "",
      currency: j.currency || "EUR",
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      department_id: form.department_id,
      level: form.level.trim() || null,
      salary_min: form.salary_min ? Number(form.salary_min) : null,
      salary_max: form.salary_max ? Number(form.salary_max) : null,
      currency: form.currency,
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
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome do cargo" />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descrição das funções" rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Departamento</Label>
                <Select value={form.department_id || "none"} onValueChange={(v) => setForm({ ...form, department_id: v === "none" ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="Sem departamento" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem departamento</SelectItem>
                    {departments?.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nível</Label>
                <Input value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} placeholder="Ex: Junior, Senior, Lead" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Salário Mín.</Label>
                  <Input type="number" value={form.salary_min} onChange={(e) => setForm({ ...form, salary_min: e.target.value })} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label>Salário Máx.</Label>
                  <Input type="number" value={form.salary_max} onChange={(e) => setForm({ ...form, salary_max: e.target.value })} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label>Moeda</Label>
                  <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={!form.name.trim()}>Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </ModuleGuard>
  );
}
