import { useParams } from "react-router-dom";
import { useState } from "react";
import { useImplementationProject, useUpdateImplTask, useUpdateChecklistItem, useLogTime, useCreateBlocker, useUpdateProject, useGenerateHandoverSummary, useAnalyzeRisk } from "@/hooks/useImplementationProjects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Sparkles, AlertTriangle, CheckCircle2, Clock, FileText } from "lucide-react";
import { toast } from "sonner";

export default function DeliveryProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useImplementationProject(id);
  const updateTask = useUpdateImplTask();
  const updateChecklist = useUpdateChecklistItem();
  const logTime = useLogTime();
  const createBlocker = useCreateBlocker();
  const updateProject = useUpdateProject();
  const generateHandover = useGenerateHandoverSummary();
  const analyzeRisk = useAnalyzeRisk();

  const [hours, setHours] = useState("");
  const [hoursDesc, setHoursDesc] = useState("");
  const [blockTitle, setBlockTitle] = useState("");
  const [blockSeverity, setBlockSeverity] = useState("medium");
  const [aiSummary, setAiSummary] = useState<any>(null);

  if (isLoading || !data?.project) return <div className="p-6">A carregar...</div>;
  const p: any = data.project;

  const requiredItemsPending = data.checklistItems.filter((i: any) => i.required && !["passed","not_applicable"].includes(i.status));
  const canGoLive = data.checklist && requiredItemsPending.length === 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">{p.title}</h1>
            <Badge variant="outline">{p.project_number}</Badge>
          </div>
          <div className="flex gap-2 mt-2">
            <Badge>{p.status}</Badge>
            <Badge variant="outline">{p.health_status}</Badge>
            <Badge variant="outline">{p.priority}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={async () => { const r = await analyzeRisk.mutateAsync(p.id); toast.success(`Saúde: ${r?.health_status}`); }}><Sparkles className="h-4 w-4 mr-2" />Analisar Risco</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Progresso</div><div className="text-xl font-bold">{p.progress_percentage}%</div><Progress value={p.progress_percentage} className="mt-2" /></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Horas</div><div className="text-xl font-bold">{p.used_hours} / {p.estimated_hours ?? "—"}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Go-Live</div><div className="text-xl font-bold">{p.target_go_live_date ? new Date(p.target_go_live_date).toLocaleDateString("pt-PT") : "—"}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Bloqueios</div><div className="text-xl font-bold text-red-600">{data.blockers.filter((b:any) => b.status !== "resolved").length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Tarefas</div><div className="text-xl font-bold">{data.tasks.filter((t:any) => t.status === "completed").length}/{data.tasks.length}</div></CardContent></Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="phases">Fases</TabsTrigger>
          <TabsTrigger value="tasks">Tarefas</TabsTrigger>
          <TabsTrigger value="blockers">Bloqueios</TabsTrigger>
          <TabsTrigger value="hours">Horas</TabsTrigger>
          <TabsTrigger value="golive">Go-Live</TabsTrigger>
          <TabsTrigger value="handover">Handover</TabsTrigger>
          <TabsTrigger value="customer">Cliente</TabsTrigger>
          <TabsTrigger value="proposal">Proposta</TabsTrigger>
          <TabsTrigger value="events">Eventos</TabsTrigger>
          <TabsTrigger value="report">Relatório</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card><CardHeader><CardTitle>Escopo</CardTitle></CardHeader><CardContent><p>{p.scope_summary || "—"}</p></CardContent></Card>
          <Card><CardHeader><CardTitle>Critérios de Sucesso</CardTitle></CardHeader><CardContent><p>{p.success_criteria || "—"}</p></CardContent></Card>
        </TabsContent>

        <TabsContent value="phases" className="space-y-3">
          {data.phases.length === 0 && <p className="text-muted-foreground">Sem fases.</p>}
          {data.phases.map((ph: any) => (
            <Card key={ph.id}><CardContent className="p-4 flex items-center justify-between">
              <div><div className="font-semibold">{ph.name}</div><div className="text-sm text-muted-foreground">{ph.phase_type}</div></div>
              <Badge>{ph.status}</Badge>
            </CardContent></Card>
          ))}
        </TabsContent>

        <TabsContent value="tasks" className="space-y-2">
          {data.tasks.length === 0 && <p className="text-muted-foreground">Este projeto ainda não tem tarefas.</p>}
          {data.tasks.map((t: any) => (
            <Card key={t.id}><CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{t.title}</span>
                  {t.required && <Badge variant="outline" className="text-xs">obrigatório</Badge>}
                  {t.visible_to_customer && <Badge variant="outline" className="text-xs">cliente</Badge>}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{t.task_type} · {t.estimated_hours ?? 0}h</div>
              </div>
              <Select value={t.status} onValueChange={(v) => updateTask.mutate({ id: t.id, status: v, completed_at: v === "completed" ? new Date().toISOString() : null })}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["open","in_progress","waiting_customer","waiting_internal","blocked","review","completed","cancelled","skipped"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </CardContent></Card>
          ))}
        </TabsContent>

        <TabsContent value="blockers" className="space-y-3">
          <Dialog>
            <DialogTrigger asChild><Button size="sm"><AlertTriangle className="h-4 w-4 mr-2" />Novo bloqueio</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Criar bloqueio</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Título</Label><Input value={blockTitle} onChange={e => setBlockTitle(e.target.value)} /></div>
                <div><Label>Severidade</Label>
                  <Select value={blockSeverity} onValueChange={setBlockSeverity}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["low","medium","high","critical"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter><Button onClick={async () => { await createBlocker.mutateAsync({ project_id: p.id, title: blockTitle, severity: blockSeverity }); setBlockTitle(""); }}>Criar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
          {data.blockers.length === 0 && <p className="text-muted-foreground">Nenhum bloqueio identificado neste projeto.</p>}
          {data.blockers.map((b: any) => (
            <Card key={b.id}><CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="font-semibold">{b.title}</div>
                <div className="text-xs text-muted-foreground">{b.blocker_type} · sev {b.severity}</div>
              </div>
              <Badge variant={b.status === "resolved" ? "outline" : "destructive"}>{b.status}</Badge>
            </CardContent></Card>
          ))}
        </TabsContent>

        <TabsContent value="hours" className="space-y-3">
          <Card><CardHeader><CardTitle>Registar horas</CardTitle></CardHeader><CardContent className="flex gap-2">
            <Input placeholder="Minutos" type="number" value={hours} onChange={e => setHours(e.target.value)} className="w-32" />
            <Input placeholder="Descrição" value={hoursDesc} onChange={e => setHoursDesc(e.target.value)} />
            <Button onClick={async () => { if (!hours) return; await logTime.mutateAsync({ project_id: p.id, duration_minutes: parseInt(hours), description: hoursDesc, activity_type: "configuration" }); setHours(""); setHoursDesc(""); }}><Clock className="h-4 w-4 mr-2" />Registar</Button>
          </CardContent></Card>
          {data.timeEntries.length === 0 && <p className="text-muted-foreground">Ainda não existem horas registadas.</p>}
          {data.timeEntries.map((t: any) => (
            <Card key={t.id}><CardContent className="p-3 flex justify-between text-sm">
              <span>{t.entry_date} · {t.activity_type}</span><span>{(t.duration_minutes/60).toFixed(2)}h</span>
            </CardContent></Card>
          ))}
        </TabsContent>

        <TabsContent value="golive" className="space-y-3">
          {!data.checklist && <p className="text-muted-foreground">Sem checklist de go-live.</p>}
          {data.checklist && (
            <>
              <div className="flex justify-between items-center">
                <div><Badge>{data.checklist.status}</Badge></div>
                <Button disabled={!canGoLive} onClick={() => updateProject.mutate({ id: p.id, status: "ready_for_go_live" })}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />Marcar pronto para go-live
                </Button>
              </div>
              {data.checklistItems.map((it: any) => (
                <Card key={it.id}><CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{it.title}</div>
                    <div className="text-xs text-muted-foreground">{it.category} {it.required && "· obrigatório"}</div>
                  </div>
                  <Select value={it.status} onValueChange={(v) => updateChecklist.mutate({ id: it.id, status: v })}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>{["pending","passed","failed","not_applicable"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </CardContent></Card>
              ))}
            </>
          )}
        </TabsContent>

        <TabsContent value="handover" className="space-y-3">
          {!data.handover && <p className="text-muted-foreground">O handover será preparado quando o projeto estiver próximo do go-live.</p>}
          {data.handover && (
            <>
              <div className="flex justify-between">
                <Badge>{data.handover.status}</Badge>
                <Button onClick={async () => { const r = await generateHandover.mutateAsync(p.id); setAiSummary(r); }}>
                  <Sparkles className="h-4 w-4 mr-2" />Gerar handover IA
                </Button>
              </div>
              {aiSummary && <Card><CardHeader><CardTitle>Resumo IA</CardTitle></CardHeader><CardContent><pre className="text-xs whitespace-pre-wrap">{JSON.stringify(aiSummary, null, 2)}</pre></CardContent></Card>}
              {data.handoverItems.map((h: any) => (
                <Card key={h.id}><CardContent className="p-3 flex justify-between">
                  <div><div className="font-medium">{h.title}</div><div className="text-xs text-muted-foreground">{h.category}</div></div>
                  <Badge>{h.status}</Badge>
                </CardContent></Card>
              ))}
            </>
          )}
        </TabsContent>

        <TabsContent value="customer"><Card><CardContent className="p-4">
          <div><strong>Owner cliente:</strong> {p.customer_owner_name ?? "—"}</div>
          <div><strong>Email:</strong> {p.customer_owner_email ?? "—"}</div>
        </CardContent></Card></TabsContent>

        <TabsContent value="proposal"><Card><CardContent className="p-4">
          <div>Proposta: {p.proposal_id ?? "—"}</div>
          <div>Onboarding: {p.onboarding_project_id ?? "—"}</div>
          <div>Plano: {p.plan_id ?? "—"}</div>
          <div>Pacote: {p.package_id ?? "—"}</div>
        </CardContent></Card></TabsContent>

        <TabsContent value="events" className="space-y-2">
          {data.events.map((e: any) => (
            <Card key={e.id}><CardContent className="p-3 flex justify-between text-sm">
              <span><Badge variant="outline" className="mr-2">{e.event_type}</Badge>{e.description}</span>
              <span className="text-muted-foreground">{new Date(e.created_at).toLocaleString("pt-PT")}</span>
            </CardContent></Card>
          ))}
        </TabsContent>

        <TabsContent value="report"><Card><CardContent className="p-6">
          <Button><FileText className="h-4 w-4 mr-2" />Gerar relatório de implementação</Button>
          <p className="mt-4 text-sm text-muted-foreground">Resumo, módulos implementados, tarefas concluídas, horas, go-live, handover e recomendações.</p>
        </CardContent></Card></TabsContent>
      </Tabs>
    </div>
  );
}
