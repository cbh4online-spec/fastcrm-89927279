import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModuleGuard } from "@/components/guards/ModuleGuard";
import { HRBreadcrumb } from "@/components/hr/HRBreadcrumb";
import { useCheckins, useCreateCheckin, useUpdateCheckin } from "@/hooks/hr/useCheckins";
import { useHREmployees } from "@/hooks/hr/useHREmployees";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, CalendarCheck, CheckCircle, Smile, Meh, Frown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  scheduled: { label: "Agendado", variant: "outline" },
  completed: { label: "Concluído", variant: "secondary" },
  cancelled: { label: "Cancelado", variant: "outline" },
};

const MOOD_ICONS = [
  { value: 1, icon: Frown, label: "Muito Baixo", color: "text-destructive" },
  { value: 2, icon: Frown, label: "Baixo", color: "text-orange-500" },
  { value: 3, icon: Meh, label: "Neutro", color: "text-yellow-500" },
  { value: 4, icon: Smile, label: "Bom", color: "text-green-500" },
  { value: 5, icon: Smile, label: "Excelente", color: "text-primary" },
];

export default function HRCheckinsPage() {
  const [tab, setTab] = useState("scheduled");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailCheckin, setDetailCheckin] = useState<string | null>(null);

  const statusFilter = tab === "all" ? undefined : tab;
  const { data: checkins = [], isLoading } = useCheckins(statusFilter);
  const { data: employees = [] } = useHREmployees("active");
  const createCheckin = useCreateCheckin();
  const updateCheckin = useUpdateCheckin();

  const [form, setForm] = useState({ employee_id: "", manager_id: "", scheduled_at: "", agenda: "" });
  const [detailForm, setDetailForm] = useState({ notes: "", mood_rating: 0, newActionItem: "" });

  const handleCreate = () => {
    if (!form.employee_id || !form.manager_id || !form.scheduled_at) return;
    createCheckin.mutate(form, {
      onSuccess: () => { setDialogOpen(false); setForm({ employee_id: "", manager_id: "", scheduled_at: "", agenda: "" }); },
    });
  };

  const selectedCheckin = checkins.find(c => c.id === detailCheckin);

  const handleComplete = (id: string) => {
    updateCheckin.mutate({
      id,
      status: "completed",
      completed_at: new Date().toISOString(),
      notes: detailForm.notes || undefined,
      mood_rating: detailForm.mood_rating || undefined,
    });
    setDetailCheckin(null);
  };

  const handleAddActionItem = (checkinId: string, items: { text: string; done: boolean }[]) => {
    if (!detailForm.newActionItem) return;
    const updated = [...items, { text: detailForm.newActionItem, done: false }];
    updateCheckin.mutate({ id: checkinId, action_items: updated });
    setDetailForm(f => ({ ...f, newActionItem: "" }));
  };

  const toggleActionItem = (checkinId: string, items: { text: string; done: boolean }[], index: number) => {
    const updated = items.map((item, i) => i === index ? { ...item, done: !item.done } : item);
    updateCheckin.mutate({ id: checkinId, action_items: updated });
  };

  return (
    <ModuleGuard moduleSlug="hr-management" moduleName="Recursos Humanos">
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Check-ins</h1>
              <p className="text-muted-foreground">Reuniões 1:1 entre funcionários e managers</p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Agendar Check-in</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Agendar Check-in</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Funcionário</Label>
                    <Select value={form.employee_id} onValueChange={v => setForm(f => ({ ...f, employee_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Manager</Label>
                    <Select value={form.manager_id} onValueChange={v => setForm(f => ({ ...f, manager_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Data e Hora</Label>
                    <Input type="datetime-local" value={form.scheduled_at} onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Agenda</Label>
                    <Textarea value={form.agenda} onChange={e => setForm(f => ({ ...f, agenda: e.target.value }))} rows={3} placeholder="Tópicos a discutir" />
                  </div>
                  <Button onClick={handleCreate} disabled={createCheckin.isPending} className="w-full">
                    {createCheckin.isPending ? "A agendar..." : "Agendar"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="scheduled">Agendados</TabsTrigger>
              <TabsTrigger value="completed">Concluídos</TabsTrigger>
              <TabsTrigger value="all">Todos</TabsTrigger>
            </TabsList>
          </Tabs>

          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full" />)}</div>
          ) : checkins.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CalendarCheck className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Nenhum check-in encontrado</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {checkins.map(c => {
                const statusInfo = STATUS_MAP[c.status] || STATUS_MAP.scheduled;
                const moodInfo = c.mood_rating ? MOOD_ICONS.find(m => m.value === c.mood_rating) : null;
                const actionItems = Array.isArray(c.action_items) ? c.action_items : [];

                return (
                  <Card key={c.id}>
                    <CardContent className="py-4">
                      <div className="flex items-start gap-4">
                        <div className="flex -space-x-2">
                          <Avatar className="h-8 w-8 border-2 border-background">
                            <AvatarImage src={c.employee?.avatar_url || undefined} />
                            <AvatarFallback>{c.employee?.full_name?.charAt(0) || "?"}</AvatarFallback>
                          </Avatar>
                          <Avatar className="h-8 w-8 border-2 border-background">
                            <AvatarImage src={c.manager?.avatar_url || undefined} />
                            <AvatarFallback>{c.manager?.full_name?.charAt(0) || "?"}</AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{c.employee?.full_name}</span>
                            <span className="text-muted-foreground text-xs">↔</span>
                            <span className="text-sm">{c.manager?.full_name}</span>
                            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                            {moodInfo && <moodInfo.icon className={`h-4 w-4 ${moodInfo.color}`} />}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(c.scheduled_at), "d MMM yyyy, HH:mm", { locale: pt })}
                          </p>
                          {c.agenda && <p className="text-sm mt-1 text-muted-foreground line-clamp-2">{c.agenda}</p>}
                          {actionItems.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {actionItems.map((item, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm cursor-pointer" onClick={() => toggleActionItem(c.id, actionItems, i)}>
                                  <CheckCircle className={`h-3.5 w-3.5 ${item.done ? "text-green-500" : "text-muted-foreground"}`} />
                                  <span className={item.done ? "line-through text-muted-foreground" : ""}>{item.text}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {c.status === "scheduled" && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="outline" onClick={() => { setDetailCheckin(c.id); setDetailForm({ notes: c.notes || "", mood_rating: c.mood_rating || 0, newActionItem: "" }); }}>
                                  Completar
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader><DialogTitle>Completar Check-in</DialogTitle></DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label>Notas</Label>
                                    <Textarea value={detailForm.notes} onChange={e => setDetailForm(f => ({ ...f, notes: e.target.value }))} rows={4} />
                                  </div>
                                  <div>
                                    <Label>Mood Rating</Label>
                                    <div className="flex gap-2 mt-1">
                                      {MOOD_ICONS.map(m => (
                                        <Button
                                          key={m.value}
                                          variant={detailForm.mood_rating === m.value ? "default" : "outline"}
                                          size="sm"
                                          onClick={() => setDetailForm(f => ({ ...f, mood_rating: m.value }))}
                                        >
                                          <m.icon className={`h-4 w-4 mr-1 ${m.color}`} />{m.value}
                                        </Button>
                                      ))}
                                    </div>
                                  </div>
                                  <div>
                                    <Label>Acção</Label>
                                    <div className="flex gap-2">
                                      <Input value={detailForm.newActionItem} onChange={e => setDetailForm(f => ({ ...f, newActionItem: e.target.value }))} placeholder="Nova acção" />
                                      <Button variant="outline" onClick={() => handleAddActionItem(c.id, actionItems)}>+</Button>
                                    </div>
                                  </div>
                                  <Button onClick={() => handleComplete(c.id)} className="w-full">Marcar como Concluído</Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
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
