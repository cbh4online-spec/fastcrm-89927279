import { useParams, Link } from "react-router-dom";
import { useCustomerAccount, useCustomerSuccess } from "@/hooks/useCustomerSuccess";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, RefreshCw, Sparkles, FileText } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";

const healthVariant = (status?: string | null) => {
  switch (status) {
    case "excellent": return "bg-success/10 text-success border-success/20";
    case "healthy":   return "bg-primary/10 text-primary border-primary/20";
    case "neutral":   return "bg-muted text-foreground";
    case "at_risk":   return "bg-warning/10 text-warning border-warning/20";
    case "critical":  return "bg-destructive/10 text-destructive border-destructive/20";
    default: return "bg-muted text-muted-foreground";
  }
};

export default function CustomerAccountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useCustomerAccount(id);
  const { refreshHealth, generateSummary, generateQBR } = useCustomerSuccess();
  const [aiSummary, setAiSummary] = useState<any>(null);

  if (isLoading) return <div className="container py-8 text-muted-foreground">A carregar…</div>;
  if (!data?.account) return <div className="container py-8">Cliente não encontrado.</div>;

  const a = data.account;
  const lastSnap = data.snapshots[0];

  const handleSummary = async () => {
    const r = await generateSummary.mutateAsync({ customer_account_id: id!, mode: "summary" });
    setAiSummary(r);
  };

  return (
    <div className="container max-w-7xl py-6 space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild><Link to="/dashboard/customer-success"><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Link></Button>
      </div>

      <Card>
        <CardContent className="pt-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{a.name}</h1>
            <div className="flex flex-wrap gap-2 mt-2 text-sm text-muted-foreground">
              <span>MRR €{Number(a.mrr ?? 0).toLocaleString("pt-PT")}</span>
              <span>·</span>
              <span>Ciclo: {a.lifecycle_stage}</span>
              <span>·</span>
              <span>Go-live: {a.go_live_date ?? "—"}</span>
              <span>·</span>
              <span>Renovação: {a.renewal_date ?? "—"}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant="outline" className={healthVariant(a.health_status)}>
              Health {a.health_score ?? "—"}/100 · {a.health_status}
            </Badge>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => refreshHealth.mutate(id!)} disabled={refreshHealth.isPending}>
                <RefreshCw className="h-4 w-4 mr-1" /> Recalcular
              </Button>
              <Button size="sm" onClick={handleSummary} disabled={generateSummary.isPending}>
                <Sparkles className="h-4 w-4 mr-1" /> Resumo IA
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="health">Health Score</TabsTrigger>
          <TabsTrigger value="usage">Uso</TabsTrigger>
          <TabsTrigger value="value">Valor</TabsTrigger>
          <TabsTrigger value="support">Suporte</TabsTrigger>
          <TabsTrigger value="comm">Comunicação</TabsTrigger>
          <TabsTrigger value="risks">Riscos ({data.risks.length})</TabsTrigger>
          <TabsTrigger value="upsell">Upsell ({data.opportunities.length})</TabsTrigger>
          <TabsTrigger value="checkins">Check-ins ({data.checkins.length})</TabsTrigger>
          <TabsTrigger value="qbr">QBR ({data.qbrs.length})</TabsTrigger>
          <TabsTrigger value="tasks">Tarefas ({data.tasks.length})</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {aiSummary && (
            <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Resumo IA</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-2">
                {aiSummary.summary && <p>{aiSummary.summary}</p>}
                {aiSummary.health_explanation && <p className="text-muted-foreground">{aiSummary.health_explanation}</p>}
                {aiSummary.recommended_actions?.length > 0 && (
                  <ul className="list-disc list-inside text-muted-foreground">
                    {aiSummary.recommended_actions.map((x: any, i: number) => <li key={i}>{typeof x === "string" ? x : x.action ?? JSON.stringify(x)}</li>)}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <Card><CardHeader><CardTitle className="text-base">Sinais recentes</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {data.signals.length === 0 ? <p className="text-muted-foreground text-sm">Sem sinais.</p> :
                  data.signals.slice(0, 5).map(s => <div key={s.id} className="text-sm"><Badge variant="outline" className="mr-2">{s.severity}</Badge>{s.title}</div>)}
              </CardContent>
            </Card>
            <Card><CardHeader><CardTitle className="text-base">Próximas ações</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {data.tasks.filter(t => t.status === "open").slice(0, 5).map(t => (
                  <div key={t.id} className="text-sm flex justify-between"><span>{t.title}</span><span className="text-muted-foreground text-xs">{t.due_at ? new Date(t.due_at).toLocaleDateString("pt-PT") : "—"}</span></div>
                ))}
                {data.tasks.length === 0 && <p className="text-muted-foreground text-sm">Sem tarefas.</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="health">
          <Card><CardHeader><CardTitle>Componentes do Health Score</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {!lastSnap ? <p className="text-muted-foreground">Sem snapshot. Clique em Recalcular.</p> : (
                <>
                  {[
                    ["Adoção", lastSnap.adoption_score],
                    ["Uso", lastSnap.usage_score],
                    ["Suporte", lastSnap.support_score],
                    ["Valor", lastSnap.value_score],
                    ["Engagement", lastSnap.engagement_score],
                    ["Satisfação", lastSnap.satisfaction_score],
                    ["Financeiro", lastSnap.financial_score],
                  ].map(([label, v]) => (
                    <div key={label as string}>
                      <div className="flex justify-between text-sm mb-1"><span>{label}</span><span className="font-mono">{Math.round(Number(v ?? 0))}/100</span></div>
                      <Progress value={Number(v ?? 0)} />
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage"><Card><CardContent className="pt-6 text-sm text-muted-foreground">
          Uso vs plano será integrado com Cost Guard e workspace_usage_limits.
        </CardContent></Card></TabsContent>

        <TabsContent value="value"><Card><CardContent className="pt-6 text-sm text-muted-foreground">
          Valor entregue agregado de leads, conversas, oportunidades, receita atribuída.
        </CardContent></Card></TabsContent>

        <TabsContent value="support"><Card><CardContent className="pt-6 text-sm text-muted-foreground">
          Tickets do Support Center associados a este cliente.
        </CardContent></Card></TabsContent>

        <TabsContent value="comm"><Card><CardContent className="pt-6 text-sm text-muted-foreground">
          Resumo de conversações WhatsApp / Voz / Chat.
        </CardContent></Card></TabsContent>

        <TabsContent value="risks">
          <Card><CardContent className="pt-6">
            {data.risks.length === 0 ? <p className="text-muted-foreground py-6 text-center">Sem riscos abertos.</p> : (
              <Table><TableHeader><TableRow><TableHead>Risco</TableHead><TableHead>Severidade</TableHead><TableHead className="text-right">MRR</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader>
                <TableBody>{data.risks.map((r: any) => (
                  <TableRow key={r.id}><TableCell>{r.title}</TableCell><TableCell><Badge variant={r.severity === "critical" ? "destructive" : "outline"}>{r.severity}</Badge></TableCell>
                    <TableCell className="text-right">€{Number(r.estimated_mrr_at_risk ?? 0).toLocaleString("pt-PT")}</TableCell><TableCell>{r.status}</TableCell></TableRow>
                ))}</TableBody></Table>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="upsell">
          <Card><CardContent className="pt-6">
            {data.opportunities.length === 0 ? <p className="text-muted-foreground py-6 text-center">Sem oportunidades.</p> : (
              <Table><TableHeader><TableRow><TableHead>Oportunidade</TableHead><TableHead>Tipo</TableHead><TableHead className="text-right">+MRR</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader>
                <TableBody>{data.opportunities.map((o: any) => (
                  <TableRow key={o.id}><TableCell>{o.title}</TableCell><TableCell>{o.opportunity_type}</TableCell>
                    <TableCell className="text-right text-success">+€{Number(o.estimated_mrr_increase ?? 0).toLocaleString("pt-PT")}</TableCell><TableCell>{o.status}</TableCell></TableRow>
                ))}</TableBody></Table>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="checkins">
          <Card><CardContent className="pt-6">
            {data.checkins.length === 0 ? <p className="text-muted-foreground py-6 text-center">Sem check-ins.</p> : (
              <Table><TableHeader><TableRow><TableHead>Tipo</TableHead><TableHead>Estado</TableHead><TableHead>Agendado</TableHead><TableHead>Canal</TableHead></TableRow></TableHeader>
                <TableBody>{data.checkins.map((c: any) => (
                  <TableRow key={c.id}><TableCell>{c.checkin_type}</TableCell><TableCell><Badge variant="outline">{c.status}</Badge></TableCell>
                    <TableCell>{c.scheduled_at ? new Date(c.scheduled_at).toLocaleString("pt-PT") : "—"}</TableCell><TableCell>{c.channel ?? "—"}</TableCell></TableRow>
                ))}</TableBody></Table>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="qbr">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base">QBRs</CardTitle>
              <Button size="sm" onClick={() => generateQBR.mutate(id!)} disabled={generateQBR.isPending}>
                <FileText className="h-4 w-4 mr-1" /> Gerar QBR com IA
              </Button>
            </CardHeader>
            <CardContent>
              {data.qbrs.length === 0 ? <p className="text-muted-foreground py-6 text-center">Nenhuma revisão de negócio planeada.</p> : (
                <div className="space-y-3">{data.qbrs.map((q: any) => (
                  <div key={q.id} className="border rounded-lg p-3">
                    <div className="flex justify-between"><strong>{q.period_start} → {q.period_end}</strong><Badge variant="outline">{q.status}</Badge></div>
                    {q.executive_summary && <p className="text-sm text-muted-foreground mt-2">{q.executive_summary}</p>}
                  </div>
                ))}</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks">
          <Card><CardContent className="pt-6">
            {data.tasks.length === 0 ? <p className="text-muted-foreground py-6 text-center">Sem tarefas.</p> : (
              <Table><TableHeader><TableRow><TableHead>Tarefa</TableHead><TableHead>Tipo</TableHead><TableHead>Prioridade</TableHead><TableHead>Estado</TableHead><TableHead>Vencimento</TableHead></TableRow></TableHeader>
                <TableBody>{data.tasks.map(t => (
                  <TableRow key={t.id}><TableCell>{t.title}</TableCell><TableCell>{t.task_type ?? "—"}</TableCell>
                    <TableCell><Badge variant={t.priority === "critical" ? "destructive" : "outline"}>{t.priority}</Badge></TableCell>
                    <TableCell>{t.status}</TableCell><TableCell>{t.due_at ? new Date(t.due_at).toLocaleDateString("pt-PT") : "—"}</TableCell></TableRow>
                ))}</TableBody></Table>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="timeline">
          <Card><CardContent className="pt-6 space-y-2">
            {data.signals.length === 0 ? <p className="text-muted-foreground">Sem eventos.</p> : data.signals.map(s => (
              <div key={s.id} className="text-sm flex gap-2 border-l-2 pl-3 py-1 border-primary/30">
                <span className="text-muted-foreground text-xs whitespace-nowrap">{new Date(s.detected_at).toLocaleDateString("pt-PT")}</span>
                <span>{s.title}</span>
              </div>
            ))}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
