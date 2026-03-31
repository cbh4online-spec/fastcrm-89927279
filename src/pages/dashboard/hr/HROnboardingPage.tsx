import { useState } from "react";
import { HRBreadcrumb } from "@/components/hr/HRBreadcrumb";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Star, Plus, ChevronDown, Sparkles, UserCheck, Calendar, Briefcase, Monitor, Users, User, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { pt } from "date-fns/locale";
import {
  useOnboardings,
  useOnboardingDetail,
  useOnboardingTemplates,
  useTaskTemplates,
  useStartOnboarding,
  useBuddyMatch,
  useUpdateOnboardingTask,
  useSubmitOnboardingFeedback,
  type BuddyMatch,
  type OnboardingTask,
  type OnboardingFeedback,
} from "@/hooks/hr/useOnboarding";

const CATEGORY_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  hr: { label: "Recursos Humanos", icon: Briefcase, color: "text-blue-600" },
  it: { label: "IT & Equipamento", icon: Monitor, color: "text-purple-600" },
  manager: { label: "Gestor", icon: UserCheck, color: "text-amber-600" },
  team: { label: "Equipa", icon: Users, color: "text-green-600" },
  self: { label: "Colaborador", icon: User, color: "text-teal-600" },
};

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", variant: "outline" },
  in_progress: { label: "Em Curso", variant: "default" },
  completed: { label: "Concluído", variant: "secondary" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};

// ─── Main Page ───────────────────────────────────────────────

export default function HROnboardingPage() {
  const [activeTab, setActiveTab] = useState("active");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Onboarding</h1>
            <p className="text-muted-foreground">Gestão do processo de integração de colaboradores</p>
          </div>
          <StartOnboardingDialog />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="active">Activos</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="archive">Arquivo</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-4">
            <OnboardingsList statusFilter="active" />
          </TabsContent>
          <TabsContent value="templates" className="mt-4">
            <TemplatesTab />
          </TabsContent>
          <TabsContent value="archive" className="mt-4">
            <OnboardingsList statusFilter="archive" />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

// ─── Onboardings List ────────────────────────────────────────

function OnboardingsList({ statusFilter }: { statusFilter: "active" | "archive" }) {
  const dbFilter = statusFilter === "active" ? undefined : "completed";
  const { data: onboardings, isLoading } = useOnboardings(statusFilter === "archive" ? "completed" : undefined);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = statusFilter === "active"
    ? (onboardings || []).filter(o => o.status !== "completed" && o.status !== "cancelled")
    : (onboardings || []).filter(o => o.status === "completed" || o.status === "cancelled");

  if (isLoading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>;

  if (filtered.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <UserCheck className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">
            {statusFilter === "active" ? "Nenhum onboarding activo" : "Nenhum onboarding arquivado"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {filtered.map((ob) => {
        const daysLeft = ob.expected_end_date ? differenceInDays(new Date(ob.expected_end_date), new Date()) : null;
        const badge = STATUS_BADGE[ob.status] || STATUS_BADGE.pending;

        return (
          <Collapsible key={ob.id} open={expandedId === ob.id} onOpenChange={(open) => setExpandedId(open ? ob.id : null)}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardContent className="flex items-center gap-4 py-4 cursor-pointer hover:bg-muted/50 transition-colors">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {ob.employee?.full_name?.split(" ").map(n => n[0]).join("").slice(0, 2) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{ob.employee?.full_name || "—"}</span>
                      <Badge variant={badge.variant} className="text-xs">{badge.label}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span>{ob.employee?.job_title || ob.employee?.department || "—"}</span>
                      {ob.buddy && <span>Buddy: {ob.buddy.full_name}</span>}
                      {daysLeft !== null && daysLeft > 0 && <span>{daysLeft}d restantes</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="w-32 flex items-center gap-2">
                      <Progress value={ob.progress} className="h-2" />
                      <span className="text-xs font-medium w-8 text-right">{ob.progress}%</span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform data-[state=open]:rotate-180" />
                  </div>
                </CardContent>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <OnboardingDetail onboardingId={ob.id} />
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}
    </div>
  );
}

// ─── Onboarding Detail (tasks + feedback) ────────────────────

function OnboardingDetail({ onboardingId }: { onboardingId: string }) {
  const { data, isLoading } = useOnboardingDetail(onboardingId);
  const updateTask = useUpdateOnboardingTask();

  if (isLoading) return <div className="px-6 pb-4"><Skeleton className="h-40" /></div>;
  if (!data) return null;

  const { tasks, feedback } = data;
  const grouped = tasks.reduce((acc, t) => {
    (acc[t.category] = acc[t.category] || []).push(t);
    return acc;
  }, {} as Record<string, OnboardingTask[]>);

  return (
    <div className="px-6 pb-6 space-y-6 border-t pt-4">
      {/* Tasks by category */}
      <div>
        <h4 className="text-sm font-semibold mb-3">Checklist de Tarefas</h4>
        <div className="space-y-4">
          {Object.entries(CATEGORY_META).map(([cat, meta]) => {
            const catTasks = grouped[cat];
            if (!catTasks || catTasks.length === 0) return null;
            const Icon = meta.icon;
            const done = catTasks.filter(t => t.is_completed).length;

            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`h-4 w-4 ${meta.color}`} />
                  <span className="text-sm font-medium">{meta.label}</span>
                  <span className="text-xs text-muted-foreground">({done}/{catTasks.length})</span>
                </div>
                <div className="space-y-1.5 ml-6">
                  {catTasks.map((task) => (
                    <label key={task.id} className="flex items-center gap-2 text-sm group cursor-pointer">
                      <Checkbox
                        checked={task.is_completed}
                        onCheckedChange={(checked) => updateTask.mutate({ taskId: task.id, is_completed: !!checked })}
                      />
                      <span className={task.is_completed ? "line-through text-muted-foreground" : ""}>
                        {task.title}
                      </span>
                      {task.due_date && (
                        <span className="text-xs text-muted-foreground ml-auto">
                          {format(new Date(task.due_date), "d MMM", { locale: pt })}
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feedback checkpoints */}
      {feedback.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-3">Checkpoints de Feedback</h4>
          <div className="grid gap-3 sm:grid-cols-3">
            {feedback.map((fb) => (
              <FeedbackCard key={fb.id} feedback={fb} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Feedback Card ───────────────────────────────────────────

function FeedbackCard({ feedback: fb }: { feedback: OnboardingFeedback }) {
  const submit = useSubmitOnboardingFeedback();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(fb.employee_rating || 0);
  const [comments, setComments] = useState(fb.employee_comments || "");

  const label = fb.feedback_type === "30_days" ? "30 Dias" : fb.feedback_type === "60_days" ? "60 Dias" : "90 Dias";
  const isPast = new Date(fb.due_date) < new Date();
  const isSubmitted = !!fb.submitted_at;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-sm">{label}</span>
              {isSubmitted ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : isPast ? (
                <AlertCircle className="h-4 w-4 text-destructive" />
              ) : (
                <Clock className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {format(new Date(fb.due_date), "d MMM yyyy", { locale: pt })}
            </p>
            {fb.employee_rating && (
              <div className="flex items-center gap-0.5 mt-2">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} className={`h-3 w-3 ${s <= fb.employee_rating! ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Feedback — {label}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Satisfação (1-5)</Label>
            <div className="flex items-center gap-1 mt-1">
              {[1,2,3,4,5].map(s => (
                <button key={s} type="button" onClick={() => setRating(s)} className="hover:scale-110 transition-transform">
                  <Star className={`h-6 w-6 ${s <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Comentários</Label>
            <Textarea value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Como tem sido a experiência?" />
          </div>
          <Button
            className="w-full"
            disabled={rating === 0 || submit.isPending}
            onClick={() => {
              submit.mutate(
                { feedbackId: fb.id, employee_rating: rating, employee_comments: comments },
                { onSuccess: () => setOpen(false) }
              );
            }}
          >
            {submit.isPending ? "A submeter..." : "Submeter Feedback"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Templates Tab ───────────────────────────────────────────

function TemplatesTab() {
  const { data: templates, isLoading, createTemplate } = useOnboardingTemplates();
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  if (isLoading) return <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-20" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Templates de Onboarding</h3>
        <Dialog open={showNew} onOpenChange={setShowNew}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Novo Template</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Criar Template</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome</Label><Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ex: Onboarding Engenharia" /></div>
              <div><Label>Descrição</Label><Textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Descrição do template..." /></div>
              <Button className="w-full" disabled={!newName || createTemplate.isPending} onClick={() => {
                createTemplate.mutate({ name: newName, description: newDesc || undefined }, {
                  onSuccess: () => { setShowNew(false); setNewName(""); setNewDesc(""); },
                });
              }}>
                {createTemplate.isPending ? "A criar..." : "Criar Template"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {(!templates || templates.length === 0) && (
        <Card><CardContent className="flex flex-col items-center py-12">
          <Briefcase className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">Nenhum template criado</p>
          <p className="text-xs text-muted-foreground mt-1">Crie um template para definir as tarefas padrão de onboarding</p>
        </CardContent></Card>
      )}

      {templates?.map((tpl) => (
        <Collapsible key={tpl.id} open={selectedTemplate === tpl.id} onOpenChange={(o) => setSelectedTemplate(o ? tpl.id : null)}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{tpl.name}</CardTitle>
                    {tpl.description && <p className="text-xs text-muted-foreground mt-0.5">{tpl.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">{tpl.task_templates?.length || 0} tarefas</Badge>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <TaskTemplatesList templateId={tpl.id} />
            </CollapsibleContent>
          </Card>
        </Collapsible>
      ))}
    </div>
  );
}

// ─── Task Templates List ─────────────────────────────────────

function TaskTemplatesList({ templateId }: { templateId: string }) {
  const { data: tasks, isLoading, addTask, removeTask } = useTaskTemplates(templateId);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("hr");
  const [dueDays, setDueDays] = useState("1");

  if (isLoading) return <div className="px-6 pb-4"><Skeleton className="h-20" /></div>;

  return (
    <CardContent className="border-t pt-4 space-y-3">
      {tasks?.map((t) => {
        const meta = CATEGORY_META[t.category] || CATEGORY_META.hr;
        const Icon = meta.icon;
        return (
          <div key={t.id} className="flex items-center gap-3 text-sm group">
            <Icon className={`h-4 w-4 ${meta.color} shrink-0`} />
            <span className="flex-1">{t.title}</span>
            <span className="text-xs text-muted-foreground">Dia {t.due_days}</span>
            <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 h-6 px-2 text-xs text-destructive"
              onClick={() => removeTask.mutate(t.id)}>Remover</Button>
          </div>
        );
      })}

      {showAdd ? (
        <div className="flex items-end gap-2 pt-2 border-t">
          <div className="flex-1"><Label className="text-xs">Tarefa</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título da tarefa" className="h-8 text-sm" /></div>
          <div className="w-32"><Label className="text-xs">Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORY_META).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="w-20"><Label className="text-xs">Dia</Label><Input type="number" value={dueDays} onChange={e => setDueDays(e.target.value)} className="h-8 text-sm" min="1" /></div>
          <Button size="sm" className="h-8" disabled={!title || addTask.isPending} onClick={() => {
            addTask.mutate(
              { title, category: category as any, due_days: parseInt(dueDays) || 1, sort_order: (tasks?.length || 0), is_required: true, description: null, assigned_to_role: null },
              { onSuccess: () => { setTitle(""); setShowAdd(false); } }
            );
          }}>Adicionar</Button>
          <Button size="sm" variant="ghost" className="h-8" onClick={() => setShowAdd(false)}>Cancelar</Button>
        </div>
      ) : (
        <Button variant="outline" size="sm" className="w-full" onClick={() => setShowAdd(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar Tarefa
        </Button>
      )}
    </CardContent>
  );
}

// ─── Start Onboarding Dialog ─────────────────────────────────

function StartOnboardingDialog() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const [open, setOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [buddyId, setBuddyId] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [buddyMatches, setBuddyMatches] = useState<BuddyMatch[]>([]);

  const { data: templates } = useOnboardingTemplates();
  const startOnboarding = useStartOnboarding();
  const buddyMatch = useBuddyMatch();

  const { data: employees } = useQuery({
    queryKey: ["hr-employees-select", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data } = await supabase
        .from("hr_employees")
        .select("id, full_name, department, job_title")
        .eq("workspace_id", workspaceId)
        .eq("status", "active")
        .order("full_name");
      return data || [];
    },
    enabled: !!workspaceId && open,
  });

  const handleBuddyMatch = async () => {
    if (!employeeId || !workspaceId) return;
    const result = await buddyMatch.mutateAsync({ new_employee_id: employeeId, workspace_id: workspaceId });
    setBuddyMatches(result.matches || []);
    if (result.matches?.length > 0) setBuddyId(result.matches[0].employee_id);
  };

  const handleSubmit = () => {
    if (!employeeId || !templateId || !workspaceId) return;
    startOnboarding.mutate(
      { employee_id: employeeId, template_id: templateId, buddy_id: buddyId || undefined, start_date: startDate, workspace_id: workspaceId },
      { onSuccess: () => { setOpen(false); setEmployeeId(""); setTemplateId(""); setBuddyId(""); setBuddyMatches([]); } }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-1" /> Iniciar Onboarding</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Iniciar Onboarding</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Colaborador</Label>
            <Select value={employeeId} onValueChange={(v) => { setEmployeeId(v); setBuddyMatches([]); setBuddyId(""); }}>
              <SelectTrigger><SelectValue placeholder="Seleccionar colaborador" /></SelectTrigger>
              <SelectContent>
                {employees?.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name} — {e.job_title || e.department || "N/A"}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Template</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar template" /></SelectTrigger>
              <SelectContent>
                {templates?.map(t => <SelectItem key={t.id} value={t.id}>{t.name} ({t.task_templates?.length || 0} tarefas)</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Data de Início</Label>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>Buddy</Label>
              <Button type="button" variant="outline" size="sm" disabled={!employeeId || buddyMatch.isPending} onClick={handleBuddyMatch}>
                <Sparkles className="h-3.5 w-3.5 mr-1" />
                {buddyMatch.isPending ? "A analisar..." : "Sugerir Buddy (IA)"}
              </Button>
            </div>

            {buddyMatches.length > 0 && (
              <div className="space-y-2 mb-2">
                {buddyMatches.map((m) => (
                  <div
                    key={m.employee_id}
                    onClick={() => setBuddyId(m.employee_id)}
                    className={`flex items-center gap-3 p-2.5 rounded-md border cursor-pointer transition-colors ${
                      buddyId === m.employee_id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                    }`}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">{m.employee_name.split(" ").map(n => n[0]).join("").slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{m.employee_name}</span>
                        <Badge variant="secondary" className="text-xs">{m.score}%</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{m.reasoning}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {buddyMatches.length === 0 && (
              <Select value={buddyId} onValueChange={setBuddyId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar buddy (opcional)" /></SelectTrigger>
                <SelectContent>
                  {employees?.filter(e => e.id !== employeeId).map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <Button className="w-full" disabled={!employeeId || !templateId || startOnboarding.isPending} onClick={handleSubmit}>
            {startOnboarding.isPending ? "A iniciar..." : "Iniciar Onboarding"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
