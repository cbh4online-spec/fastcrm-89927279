import { useState } from "react";
import { Settings, Plus, Pencil, Trash2, Building2, Briefcase, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useHRDepartments, useCreateHRDepartment, useUpdateHRDepartment, useDeleteHRDepartment } from "@/hooks/hr/useHRDepartments";
import { useHRJobTitles, useCreateHRJobTitle, useUpdateHRJobTitle, useDeleteHRJobTitle } from "@/hooks/hr/useHRJobTitles";
import { useHRContractTypes, useCreateHRContractType, useUpdateHRContractType, useDeleteHRContractType } from "@/hooks/hr/useHRContractTypes";

// ─── Generic CRUD Table ──────────────────────────────────────────────────────

interface CrudItem {
  id: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  department_id?: string | null;
}

interface CrudTableProps {
  items: CrudItem[] | undefined;
  isLoading: boolean;
  onCreate: (v: any) => void;
  onUpdate: (v: any) => void;
  onDelete: (id: string) => void;
  type: "department" | "job_title" | "contract_type";
  departments?: { id: string; name: string }[];
}

function CrudTable({ items, isLoading, onCreate, onUpdate, onDelete, type, departments }: CrudTableProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<CrudItem | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [departmentId, setDepartmentId] = useState<string | null>(null);

  const openCreate = () => {
    setEditItem(null);
    setName("");
    setDescription("");
    setDepartmentId(null);
    setDialogOpen(true);
  };

  const openEdit = (item: CrudItem) => {
    setEditItem(item);
    setName(item.name);
    setDescription(item.description || "");
    setDepartmentId(item.department_id || null);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    if (editItem) {
      const payload: any = { id: editItem.id, name: name.trim() };
      if (type === "job_title") payload.department_id = departmentId || null;
      if (type !== "job_title") payload.description = description.trim() || null;
      onUpdate(payload);
    } else {
      const payload: any = { name: name.trim() };
      if (type === "job_title") payload.department_id = departmentId || null;
      if (type !== "job_title") payload.description = description.trim() || null;
      onCreate(payload);
    }
    setDialogOpen(false);
  };

  const labels = {
    department: { singular: "Departamento", plural: "Departamentos" },
    job_title: { singular: "Cargo", plural: "Cargos" },
    contract_type: { singular: "Tipo de Contrato", plural: "Tipos de Contrato" },
  }[type];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">{labels.plural}</h3>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> Novo {labels.singular}
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">A carregar...</p>
      ) : !items?.length ? (
        <p className="text-muted-foreground text-sm">Nenhum {labels.singular.toLowerCase()} configurado.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              {type === "job_title" && <TableHead>Departamento</TableHead>}
              {type !== "job_title" && <TableHead>Descrição</TableHead>}
              <TableHead className="w-24 text-center">Ativo</TableHead>
              <TableHead className="w-24 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                {type === "job_title" && (
                  <TableCell className="text-muted-foreground">
                    {departments?.find((d) => d.id === item.department_id)?.name || "—"}
                  </TableCell>
                )}
                {type !== "job_title" && (
                  <TableCell className="text-muted-foreground">{item.description || "—"}</TableCell>
                )}
                <TableCell className="text-center">
                  <Switch
                    checked={item.is_active}
                    onCheckedChange={(checked) => onUpdate({ id: item.id, is_active: checked })}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(item.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem ? "Editar" : "Novo"} {labels.singular}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={`Nome do ${labels.singular.toLowerCase()}`} />
            </div>
            {type === "job_title" && departments && (
              <div className="space-y-2">
                <Label>Departamento</Label>
                <Select value={departmentId || "none"} onValueChange={(v) => setDepartmentId(v === "none" ? null : v)}>
                  <SelectTrigger><SelectValue placeholder="Sem departamento" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem departamento</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {type !== "job_title" && (
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição opcional" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!name.trim()}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function HRSettingsPage() {
  const { data: departments, isLoading: loadingDepts } = useHRDepartments();
  const { data: jobTitles, isLoading: loadingJobs } = useHRJobTitles();
  const { data: contractTypes, isLoading: loadingContracts } = useHRContractTypes();

  const createDept = useCreateHRDepartment();
  const updateDept = useUpdateHRDepartment();
  const deleteDept = useDeleteHRDepartment();

  const createJob = useCreateHRJobTitle();
  const updateJob = useUpdateHRJobTitle();
  const deleteJob = useDeleteHRJobTitle();

  const createContract = useCreateHRContractType();
  const updateContract = useUpdateHRContractType();
  const deleteContract = useDeleteHRContractType();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configurações RH</h1>
          <p className="text-muted-foreground text-sm">Gerir departamentos, cargos e tipos de contrato</p>
        </div>
      </div>

      <Tabs defaultValue="departments" className="w-full">
        <TabsList>
          <TabsTrigger value="departments" className="gap-1.5">
            <Building2 className="h-4 w-4" /> Departamentos
          </TabsTrigger>
          <TabsTrigger value="job_titles" className="gap-1.5">
            <Briefcase className="h-4 w-4" /> Cargos
          </TabsTrigger>
          <TabsTrigger value="contract_types" className="gap-1.5">
            <FileText className="h-4 w-4" /> Contratos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="departments">
          <CrudTable
            items={departments as CrudItem[] | undefined}
            isLoading={loadingDepts}
            onCreate={(v) => createDept.mutate(v)}
            onUpdate={(v) => updateDept.mutate(v)}
            onDelete={(id) => deleteDept.mutate(id)}
            type="department"
          />
        </TabsContent>

        <TabsContent value="job_titles">
          <CrudTable
            items={jobTitles as CrudItem[] | undefined}
            isLoading={loadingJobs}
            onCreate={(v) => createJob.mutate(v)}
            onUpdate={(v) => updateJob.mutate(v)}
            onDelete={(id) => deleteJob.mutate(id)}
            type="job_title"
            departments={departments?.map((d) => ({ id: d.id, name: d.name })) || []}
          />
        </TabsContent>

        <TabsContent value="contract_types">
          <CrudTable
            items={contractTypes as CrudItem[] | undefined}
            isLoading={loadingContracts}
            onCreate={(v) => createContract.mutate(v)}
            onUpdate={(v) => updateContract.mutate(v)}
            onDelete={(id) => deleteContract.mutate(id)}
            type="contract_type"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
