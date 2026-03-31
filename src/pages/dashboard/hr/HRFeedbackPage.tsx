import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModuleGuard } from "@/components/guards/ModuleGuard";
import { useFeedback, useCreateFeedback, useMarkFeedbackRead } from "@/hooks/hr/useFeedback";
import { useHREmployees, useCurrentHREmployee } from "@/hooks/hr/useHREmployees";
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
import { Switch } from "@/components/ui/switch";
import { Plus, MessageSquare, Eye, EyeOff, Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

const FEEDBACK_TYPES = [
  { value: "praise", label: "Elogio" },
  { value: "constructive", label: "Construtivo" },
  { value: "suggestion", label: "Sugestão" },
  { value: "concern", label: "Preocupação" },
];

export default function HRFeedbackPage() {
  const [tab, setTab] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: currentEmployee } = useCurrentHREmployee();
  const { data: feedback = [], isLoading } = useFeedback(tab as "received" | "sent" | "all", currentEmployee?.id);
  const { data: employees = [] } = useHREmployees("active");
  const createFeedback = useCreateFeedback();
  const markRead = useMarkFeedbackRead();

  const [form, setForm] = useState({
    to_employee_id: "",
    feedback_type: "praise",
    title: "",
    content: "",
    is_private: false,
    is_anonymous: false,
  });

  const unreadCount = feedback.filter(f => f.to_employee_id === currentEmployee?.id && !f.read_at).length;

  const handleCreate = () => {
    if (!currentEmployee || !form.to_employee_id || !form.title || !form.content) return;
    createFeedback.mutate(
      { from_employee_id: currentEmployee.id, ...form },
      { onSuccess: () => { setDialogOpen(false); setForm({ to_employee_id: "", feedback_type: "praise", title: "", content: "", is_private: false, is_anonymous: false }); } }
    );
  };

  const handleCardClick = (f: typeof feedback[0]) => {
    if (f.to_employee_id === currentEmployee?.id && !f.read_at) {
      markRead.mutate(f.id);
    }
  };

  const typeLabel = (t: string) => FEEDBACK_TYPES.find(ft => ft.value === t)?.label || t;

  return (
    <ModuleGuard moduleSlug="hr-management" moduleName="Recursos Humanos">
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Feedback</h1>
              <p className="text-muted-foreground">Dar e receber feedback entre colegas</p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Dar Feedback</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Enviar Feedback</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Destinatário</Label>
                    <Select value={form.to_employee_id} onValueChange={v => setForm(f => ({ ...f, to_employee_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>{employees.filter(e => e.id !== currentEmployee?.id).map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Tipo</Label>
                    <Select value={form.feedback_type} onValueChange={v => setForm(f => ({ ...f, feedback_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{FEEDBACK_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Título</Label>
                    <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Excelente apresentação" />
                  </div>
                  <div>
                    <Label>Conteúdo</Label>
                    <Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={4} />
                  </div>
                  <div className="flex gap-6">
                    <div className="flex items-center gap-2">
                      <Switch checked={form.is_private} onCheckedChange={v => setForm(f => ({ ...f, is_private: v }))} />
                      <Label className="text-sm">Privado</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={form.is_anonymous} onCheckedChange={v => setForm(f => ({ ...f, is_anonymous: v }))} />
                      <Label className="text-sm">Anónimo</Label>
                    </div>
                  </div>
                  <Button onClick={handleCreate} disabled={createFeedback.isPending} className="w-full">
                    {createFeedback.isPending ? "A enviar..." : "Enviar Feedback"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="received">
                Recebidos {unreadCount > 0 && <Badge variant="destructive" className="ml-1.5 h-5 px-1.5 text-xs">{unreadCount}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="sent">Enviados</TabsTrigger>
            </TabsList>
          </Tabs>

          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>
          ) : feedback.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Nenhum feedback encontrado</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {feedback.map(f => {
                const isUnread = f.to_employee_id === currentEmployee?.id && !f.read_at;
                return (
                  <Card key={f.id} className={isUnread ? "border-primary/50 bg-primary/5" : ""} onClick={() => handleCardClick(f)}>
                    <CardContent className="py-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-9 w-9 mt-0.5">
                          {!f.is_anonymous && f.from_employee ? (
                            <>
                              <AvatarImage src={f.from_employee.avatar_url || undefined} />
                              <AvatarFallback>{f.from_employee.full_name?.charAt(0)}</AvatarFallback>
                            </>
                          ) : (
                            <AvatarFallback><EyeOff className="h-4 w-4" /></AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">
                              {f.is_anonymous ? "Anónimo" : f.from_employee?.full_name || "—"}
                            </span>
                            <span className="text-muted-foreground text-xs">→</span>
                            <span className="text-sm">{f.to_employee?.full_name || "—"}</span>
                            <Badge variant="outline" className="text-xs">{typeLabel(f.feedback_type)}</Badge>
                            {f.is_private && <Lock className="h-3 w-3 text-muted-foreground" />}
                            {isUnread && <Badge variant="destructive" className="text-xs">Novo</Badge>}
                          </div>
                          <p className="font-medium text-sm">{f.title}</p>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{f.content}</p>
                          <p className="text-xs text-muted-foreground mt-2">{format(new Date(f.created_at), "d MMM yyyy, HH:mm", { locale: pt })}</p>
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
