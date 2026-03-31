import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModuleGuard } from "@/components/guards/ModuleGuard";
import { HRBreadcrumb } from "@/components/hr/HRBreadcrumb";
import { useOKRs, useCreateOKR, useUpdateKeyResultProgress, useUpdateOKRStatus, useDeleteOKR, type HROKR } from "@/hooks/hr/useOKRs";
import { useHREmployees } from "@/hooks/hr/useHREmployees";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Target, Trash2, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Rascunho", variant: "outline" },
  active: { label: "Activo", variant: "default" },
  completed: { label: "Concluído", variant: "secondary" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};

const PERIODS = ["Q1", "Q2", "Q3", "Q4", "H1", "H2", "Annual"];
const TYPES = [
  { value: "company", label: "Empresa" },
  { value: "team", label: "Equipa" },
  { value: "individual", label: "Individual" },
];

export default function HROKRsPage() {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [dialogOpen, setDialogOpen] = useState(false);
  const currentYear = new Date().getFullYear();

  const filters = {
    ...(typeFilter !== "all" ? { type: typeFilter } : {}),
    ...(statusFilter !== "all" ? { status: statusFilter } : {}),
  };
  const { data: okrs = [], isLoading } = useOKRs(filters);
  const { data: employees = [] } = useHREmployees("active");
  const createOKR = useCreateOKR();
  const updateKR = useUpdateKeyResultProgress();
  const updateStatus = useUpdateOKRStatus();
  const deleteOKR = useDeleteOKR();

  const [form, setForm] = useState({
    employee_id: "",
    type: "individual",
    objective: "",
    description: "",
    period: "Q1",
    year: currentYear,
    start_date: "",
    end_date: "",
    key_results: [{ description: "", target_value: 100, unit: "%" }],
  });

  const handleCreate = () => {
    if (!form.employee_id || !form.objective) return;
    createOKR.mutate(
      {
        employee_id: form.employee_id,
        type: form.type,
        objective: form.objective,
        description: form.description,
        period: form.period,
        year: form.year,
        start_date: form.start_date || undefined,
        end_date: form.end_date || undefined,
        key_results: form.key_results.filter(kr => kr.description),
      },
      {
        onSuccess: () => {
          setDialogOpen(false);
          setForm({ employee_id: "", type: "individual", objective: "", description: "", period: "Q1", year: currentYear, start_date: "", end_date: "", key_results: [{ description: "", target_value: 100, unit: "%" }] });
        },
      }
    );
  };

  const addKR = () => setForm(f => ({ ...f, key_results: [...f.key_results, { description: "", target_value: 100, unit: "%" }] }));
  const removeKR = (i: number) => setForm(f => ({ ...f, key_results: f.key_results.filter((_, idx) => idx !== i) }));
  const updateFormKR = (i: number, field: string, value: string | number) =>
    setForm(f => ({ ...f, key_results: f.key_results.map((kr, idx) => idx === i ? { ...kr, [field]: value } : kr) }));

  // Calculate OKR progress from key results
  const getOKRProgress = (okr: HROKR) => {
    const krs = okr.hr_key_results || [];
    if (krs.length === 0) return okr.progress;
    const totalWeight = krs.reduce((a, kr) => a + kr.weight, 0);
    if (totalWeight === 0) return 0;
    return krs.reduce((a, kr) => a + (kr.progress * kr.weight) / totalWeight, 0);
  };

  return (
    <ModuleGuard moduleSlug="hr-management" moduleName="Recursos Humanos">
      <DashboardLayout>
        <HRBreadcrumb />
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">OKRs</h1>
              <p className="text-muted-foreground">Objectivos e Resultados-Chave</p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Novo OKR</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Criar OKR</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Funcionário</Label>
                      <Select value={form.employee_id} onValueChange={v => setForm(f => ({ ...f, employee_id: v }))}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                        <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Tipo</Label>
                      <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Objectivo</Label>
                    <Input value={form.objective} onChange={e => setForm(f => ({ ...f, objective: e.target.value }))} placeholder="Ex: Aumentar receita recorrente" />
                  </div>
                  <div>
                    <Label>Descrição</Label>
                    <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Período</Label>
                      <Select value={form.period} onValueChange={v => setForm(f => ({ ...f, period: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{PERIODS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Ano</Label>
                      <Input type="number" value={form.year} onChange={e => setForm(f => ({ ...f, year: parseInt(e.target.value) }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Data Início</Label><Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
                    <div><Label>Data Fim</Label><Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">Resultados-Chave</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addKR}><Plus className="h-3 w-3 mr-1" />Adicionar</Button>
                    </div>
                    {form.key_results.map((kr, i) => (
                      <div key={i} className="flex gap-2 items-end">
                        <div className="flex-1">
                          <Input placeholder="Descrição do KR" value={kr.description} onChange={e => updateFormKR(i, "description", e.target.value)} />
                        </div>
                        <div className="w-24">
                          <Input type="number" placeholder="Meta" value={kr.target_value} onChange={e => updateFormKR(i, "target_value", parseFloat(e.target.value) || 0)} />
                        </div>
                        <div className="w-20">
                          <Input placeholder="Un." value={kr.unit} onChange={e => updateFormKR(i, "unit", e.target.value)} />
                        </div>
                        {form.key_results.length > 1 && (
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeKR(i)}><Trash2 className="h-4 w-4" /></Button>
                        )}
                      </div>
                    ))}
                  </div>

                  <Button onClick={handleCreate} disabled={createOKR.isPending} className="w-full">
                    {createOKR.isPending ? "A criar..." : "Criar OKR"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Filters */}
          <div className="flex gap-3">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* OKR Cards */}
          {isLoading ? (
            <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full" />)}</div>
          ) : okrs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Target className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Nenhum OKR encontrado</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {okrs.map(okr => {
                const computedProgress = getOKRProgress(okr);
                const statusInfo = STATUS_MAP[okr.status] || STATUS_MAP.draft;
                return (
                  <Card key={okr.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={okr.hr_employees?.avatar_url || undefined} />
                            <AvatarFallback>{okr.hr_employees?.full_name?.charAt(0) || "?"}</AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-base">{okr.objective}</CardTitle>
                            <p className="text-xs text-muted-foreground">
                              {okr.hr_employees?.full_name} · {okr.period} {okr.year}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                          <Badge variant="outline">{TYPES.find(t => t.value === okr.type)?.label || okr.type}</Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Progress value={computedProgress} className="flex-1" />
                        <span className="text-sm font-medium w-12 text-right">{Math.round(computedProgress)}%</span>
                      </div>
                      {okr.hr_key_results && okr.hr_key_results.length > 0 && (
                        <div className="space-y-2 pl-4 border-l-2 border-muted">
                          {okr.hr_key_results.map(kr => (
                            <div key={kr.id} className="flex items-center gap-3">
                              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="text-sm flex-1">{kr.description}</span>
                              <div className="flex items-center gap-2 shrink-0">
                                <Input
                                  type="number"
                                  className="w-20 h-7 text-xs"
                                  value={kr.current_value}
                                  onChange={e => updateKR.mutate({ id: kr.id, current_value: parseFloat(e.target.value) || 0 })}
                                />
                                <span className="text-xs text-muted-foreground w-16">/ {kr.target_value} {kr.unit}</span>
                                <span className="text-xs font-medium w-10 text-right">{Math.round(kr.progress)}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2 pt-2">
                        {okr.status === "active" && (
                          <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: okr.id, status: "completed" })}>Concluir</Button>
                        )}
                        {okr.status === "draft" && (
                          <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: okr.id, status: "active" })}>Activar</Button>
                        )}
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteOKR.mutate(okr.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </DashboardLayout>
    </ModuleGuard>
  );
}
