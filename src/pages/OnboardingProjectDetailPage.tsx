import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, CheckCircle2, XCircle, Copy, Sparkles, Clock, FileText, Wrench, AlertTriangle, Activity } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { useOnboardingProject, useUpdateChecklistItem, useUpdateProjectStatus } from "@/hooks/useCustomerOnboarding";
import { supabase } from "@/integrations/supabase/client";

export default function OnboardingProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useOnboardingProject(id);
  const updateItem = useUpdateChecklistItem();
  const updateStatus = useUpdateProjectStatus();
  const [aiSummary, setAiSummary] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);

  if (isLoading || !data?.project) return <div className="container py-12 text-center text-muted-foreground">A carregar…</div>;
  const { project, items, docs, tasks, blockers, events } = data;

  const total = items.length;
  const approved = items.filter((i: any) => i.status === "approved").length;
  const customerProgress = total ? Math.round(((items.filter((i: any) => i.status !== "pending").length) / total) * 100) : 0;
  const internalProgress = total ? Math.round((approved / total) * 100) : 0;

  const copyOnboardingLink = () => {
    const url = `${window.location.origin}/portal/onboarding/${project.onboarding_token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado");
  };

  const generateSummary = async () => {
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("onboarding-generate-summary", {
        body: { onboarding_project_id: project.id },
      });
      if (error) throw error;
      setAiSummary(data);
    } catch (e: any) { toast.error(e.message); }
    finally { setAiLoading(false); }
  };

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/onboarding")}><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">{project.title}</h1>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge>{project.status}</Badge>
                <Badge variant="outline">Prioridade: {project.priority}</Badge>
                {project.target_go_live_date && <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Go-live {new Date(project.target_go_live_date).toLocaleDateString("pt-PT")}</Badge>}
              </div>
              <p className="text-sm text-muted-foreground mt-2">{project.customer_company_name} · {project.customer_contact_email}</p>
            </div>
            <div className="flex flex-col gap-2 min-w-[260px]">
              <div><div className="text-xs text-muted-foreground">Progresso cliente</div><Progress value={customerProgress} /></div>
              <div><div className="text-xs text-muted-foreground">Progresso interno</div><Progress value={internalProgress} /></div>
              <div className="flex gap-2 mt-1">
                <Button size="sm" variant="outline" onClick={copyOnboardingLink}><Copy className="h-3 w-3 mr-1" /> Link cliente</Button>
                <Select value={project.status} onValueChange={(v) => updateStatus.mutate({ id: project.id, status: v })}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["waiting_customer","in_progress","blocked","ready_for_setup","setup_in_progress","completed","cancelled"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList className="grid grid-cols-4 md:grid-cols-8 w-full">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
          <TabsTrigger value="documents">Documentos</TabsTrigger>
          <TabsTrigger value="tasks">Tarefas</TabsTrigger>
          <TabsTrigger value="customer">Cliente</TabsTrigger>
          <TabsTrigger value="proposal">Proposta</TabsTrigger>
          <TabsTrigger value="events">Eventos</TabsTrigger>
          <TabsTrigger value="notes">Notas</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center justify-between"><span className="flex items-center gap-2"><Sparkles className="h-5 w-5" /> Resumo IA</span>
              <Button size="sm" onClick={generateSummary} disabled={aiLoading}>{aiLoading ? "A gerar…" : "Gerar resumo"}</Button>
            </CardTitle></CardHeader>
            <CardContent>
              {aiSummary ? (
                <div className="space-y-3 text-sm">
                  <div><strong>Resumo:</strong> {aiSummary.summary}</div>
                  {aiSummary.missing_information?.length > 0 && <div><strong>Informação em falta:</strong> {aiSummary.missing_information.join(", ")}</div>}
                  {aiSummary.risks?.length > 0 && <div><strong>Riscos:</strong> {aiSummary.risks.join(", ")}</div>}
                  {aiSummary.recommended_next_actions?.length > 0 && <div><strong>Próximas ações:</strong> {aiSummary.recommended_next_actions.join(", ")}</div>}
                </div>
              ) : <p className="text-sm text-muted-foreground">Clique para gerar um resumo IA do estado atual.</p>}
            </CardContent>
          </Card>

          {blockers.length > 0 && (
            <Card className="border-destructive/30">
              <CardHeader><CardTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="h-5 w-5" /> Bloqueios ({blockers.length})</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {blockers.map((b: any) => (
                  <div key={b.id} className="border rounded p-3"><div className="font-medium">{b.title}</div>
                    <p className="text-sm text-muted-foreground">{b.description}</p>
                    <Badge variant="outline" className="mt-1">{b.blocker_type}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="checklist" className="space-y-2">
          {items.map((it: any) => (
            <Card key={it.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2"><span className="font-medium">{it.title}</span>{it.required && <Badge variant="outline" className="text-xs">Obrigatório</Badge>}</div>
                    <p className="text-sm text-muted-foreground">{it.category} · {it.field_type}</p>
                    {it.response_value && <div className="mt-2 p-2 bg-muted rounded text-sm">{it.response_value}</div>}
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <Badge>{it.status}</Badge>
                    {it.status === "submitted" && <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => updateItem.mutate({ id: it.id, status: "approved" })}><CheckCircle2 className="h-3 w-3" /></Button>
                      <Button size="sm" variant="outline" onClick={() => updateItem.mutate({ id: it.id, status: "rejected", rejection_reason: "Precisa de mais detalhe" })}><XCircle className="h-3 w-3" /></Button>
                    </div>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="documents" className="space-y-2">
          {docs.length === 0 ? <p className="text-muted-foreground text-center py-8">Sem documentos</p> :
            docs.map((d: any) => (
              <Card key={d.id}><CardContent className="pt-4 flex items-center justify-between">
                <div className="flex items-center gap-3"><FileText className="h-5 w-5 text-muted-foreground" />
                  <div><div className="font-medium">{d.title}</div><div className="text-xs text-muted-foreground">{d.file_name} · {d.document_type}</div></div>
                </div>
                <Badge>{d.status}</Badge>
              </CardContent></Card>
            ))}
        </TabsContent>

        <TabsContent value="tasks" className="space-y-2">
          {tasks.map((t: any) => (
            <Card key={t.id}><CardContent className="pt-4 flex items-center justify-between">
              <div><div className="flex items-center gap-2"><Wrench className="h-4 w-4 text-muted-foreground" /><span className="font-medium">{t.title}</span></div>
                {t.description && <p className="text-sm text-muted-foreground mt-1">{t.description}</p>}</div>
              <div className="flex gap-1"><Badge variant="outline">{t.priority}</Badge><Badge>{t.status}</Badge></div>
            </CardContent></Card>
          ))}
        </TabsContent>

        <TabsContent value="customer">
          <Card><CardContent className="pt-6 space-y-2 text-sm">
            <div><strong>Empresa:</strong> {project.customer_company_name}</div>
            <div><strong>Contacto:</strong> {project.customer_contact_name}</div>
            <div><strong>Email:</strong> {project.customer_contact_email}</div>
            <div><strong>Telefone:</strong> {project.customer_contact_phone ?? "—"}</div>
            <Separator />
            <div><strong>Módulos:</strong> {(Array.isArray(project.selected_modules) ? project.selected_modules : []).join(", ") || "—"}</div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="proposal">
          <Card><CardContent className="pt-6 text-sm">
            {project.proposal_id ? <p>Proposta vinculada: <code>{project.proposal_id}</code></p> : <p className="text-muted-foreground">Sem proposta vinculada</p>}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-2">
          {events.map((e: any) => (
            <Card key={e.id}><CardContent className="pt-4 flex items-start gap-3">
              <Activity className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex-1"><div className="text-sm"><strong>{e.event_type}</strong> — {e.description}</div>
                <div className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString("pt-PT")}</div></div>
            </CardContent></Card>
          ))}
        </TabsContent>

        <TabsContent value="notes">
          <Card><CardContent className="pt-6 text-sm whitespace-pre-wrap">{project.internal_notes || <span className="text-muted-foreground">Sem notas internas</span>}</CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
