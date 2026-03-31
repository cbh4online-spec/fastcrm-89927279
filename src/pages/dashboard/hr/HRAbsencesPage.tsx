import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModuleGuard } from "@/components/guards/ModuleGuard";
import { useHRAbsences, useHRAbsenceTypes, useCreateAbsence, useApproveAbsence, useSeedAbsenceDefaults } from "@/hooks/hr/useHRAbsences";
import { useHREmployees } from "@/hooks/hr/useHREmployees";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Check, X } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Rejeitado",
  cancelled: "Cancelado",
};

export default function HRAbsencesPage() {
  const [tab, setTab] = useState("pending");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [form, setForm] = useState({ employee_id: "", absence_type_id: "", start_date: "", end_date: "", reason: "" });

  const statusFilter = tab === "all" ? undefined : tab;
  const { data: absences = [], isLoading } = useHRAbsences(statusFilter);
  const { data: absenceTypes = [] } = useHRAbsenceTypes();
  const { data: employees = [] } = useHREmployees("active");
  const createAbsence = useCreateAbsence();
  const approveAbsence = useApproveAbsence();
  const seedDefaults = useSeedAbsenceDefaults();

  const pendingCount = absences.filter(a => a.status === "pending").length;

  const handleCreate = () => {
    if (!form.employee_id || !form.absence_type_id || !form.start_date || !form.end_date) return;
    createAbsence.mutate(form, {
      onSuccess: () => { setDialogOpen(false); setForm({ employee_id: "", absence_type_id: "", start_date: "", end_date: "", reason: "" }); }
    });
  };

  const handleReject = () => {
    if (!rejectId) return;
    approveAbsence.mutate({ absence_id: rejectId, action: "rejected", rejection_reason: rejectReason }, {
      onSuccess: () => { setRejectId(null); setRejectReason(""); }
    });
  };

  return (
    <ModuleGuard moduleSlug="hr-management" moduleName="Recursos Humanos">
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Férias & Ausências</h1>
              <p className="text-muted-foreground">Gestão de pedidos de ausência</p>
            </div>
            <div className="flex gap-2">
              {absenceTypes.length === 0 && (
                <Button variant="outline" onClick={() => seedDefaults.mutate()} disabled={seedDefaults.isPending}>
                  Inicializar Tipos
                </Button>
              )}
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2"><Plus className="h-4 w-4" /> Novo Pedido</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Novo Pedido de Ausência</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Funcionário</Label>
                      <Select value={form.employee_id} onValueChange={v => setForm(f => ({ ...f, employee_id: v }))}>
                        <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                        <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Tipo de Ausência</Label>
                      <Select value={form.absence_type_id} onValueChange={v => setForm(f => ({ ...f, absence_type_id: v }))}>
                        <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                        <SelectContent>{absenceTypes.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Data Início</Label><Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
                      <div><Label>Data Fim</Label><Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
                    </div>
                    <div><Label>Motivo (opcional)</Label><Textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} /></div>
                    <Button onClick={handleCreate} disabled={createAbsence.isPending} className="w-full">Submeter Pedido</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="pending">Pendentes {pendingCount > 0 && <Badge variant="secondary" className="ml-1">{pendingCount}</Badge>}</TabsTrigger>
              <TabsTrigger value="approved">Aprovadas</TabsTrigger>
              <TabsTrigger value="rejected">Rejeitadas</TabsTrigger>
              <TabsTrigger value="all">Todas</TabsTrigger>
            </TabsList>

            <TabsContent value={tab}>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Funcionário</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Período</TableHead>
                        <TableHead>Dias</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow><TableCell colSpan={6} className="text-center">A carregar...</TableCell></TableRow>
                      ) : absences.length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Sem pedidos</TableCell></TableRow>
                      ) : absences.map(a => (
                        <TableRow key={a.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-7 w-7"><AvatarFallback className="text-xs">{a.hr_employees?.full_name?.charAt(0)}</AvatarFallback></Avatar>
                              <span className="text-sm">{a.hr_employees?.full_name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge style={{ backgroundColor: a.hr_absence_types?.color }} className="text-white text-xs">{a.hr_absence_types?.name}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">{a.start_date} → {a.end_date}</TableCell>
                          <TableCell>{a.total_days}</TableCell>
                          <TableCell>
                            <Badge variant={a.status === "approved" ? "default" : a.status === "pending" ? "secondary" : "destructive"}>
                              {STATUS_LABELS[a.status] || a.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {a.status === "pending" && (
                              <div className="flex gap-1">
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={() => approveAbsence.mutate({ absence_id: a.id, action: "approved" })}>
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600" onClick={() => setRejectId(a.id)}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                            {a.status === "rejected" && a.rejection_reason && (
                              <span className="text-xs text-muted-foreground">Motivo: {a.rejection_reason}</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Reject dialog */}
          <Dialog open={!!rejectId} onOpenChange={() => setRejectId(null)}>
            <DialogContent>
              <DialogHeader><DialogTitle>Rejeitar Pedido</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Motivo da rejeição</Label><Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Indique o motivo..." /></div>
                <Button onClick={handleReject} variant="destructive" className="w-full" disabled={approveAbsence.isPending}>Rejeitar</Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Absence types legend */}
          {absenceTypes.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Tipos de Ausência</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {absenceTypes.map(t => (
                    <Badge key={t.id} style={{ backgroundColor: t.color }} className="text-white">
                      {t.name} {t.paid ? "(paga)" : "(não paga)"}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardLayout>
    </ModuleGuard>
  );
}
