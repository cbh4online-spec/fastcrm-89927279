import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useCustomerSuccess } from "@/hooks/useCustomerSuccess";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, AlertTriangle, TrendingUp, Calendar, Users, Activity, Sparkles } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KPICard, KPIGrid } from "@/components/design-system/KPICard";

const healthVariant = (status?: string | null) => {
  switch (status) {
    case "excellent": return "bg-success/10 text-success border-success/20";
    case "healthy":   return "bg-primary/10 text-primary border-primary/20";
    case "neutral":   return "bg-muted text-foreground border-border";
    case "at_risk":   return "bg-warning/10 text-warning border-warning/20";
    case "critical":  return "bg-destructive/10 text-destructive border-destructive/20";
    default: return "bg-muted text-muted-foreground";
  }
};

export default function CustomerSuccessPage() {
  const { accounts, risks, opportunities, checkins, playbooks } = useCustomerSuccess();
  const list = accounts.data ?? [];

  const kpis = useMemo(() => {
    const total = list.length;
    const healthy = list.filter(a => a.health_status === "healthy" || a.health_status === "excellent").length;
    const atRisk = list.filter(a => a.health_status === "at_risk").length;
    const critical = list.filter(a => a.health_status === "critical").length;
    const mrrAtRisk = list.filter(a => ["at_risk", "critical"].includes(a.health_status ?? "")).reduce((s, a) => s + Number(a.mrr ?? 0), 0);
    const expansion = (opportunities.data ?? []).reduce((s, o) => s + Number(o.estimated_mrr_increase ?? 0), 0);
    const avg = total ? Math.round(list.reduce((s, a) => s + Number(a.health_score ?? 0), 0) / total) : 0;
    return { total, healthy, atRisk, critical, mrrAtRisk, expansion, avg };
  }, [list, opportunities.data]);

  return (
    <div className="container max-w-7xl py-6 space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Heart className="h-7 w-7 text-primary" /> Customer Success</h1>
          <p className="text-muted-foreground mt-1">Acompanhe adoção, valor, risco e expansão após o go-live.</p>
        </div>
      </header>

      <KPIGrid columns={4}>
        <KPICard title="Clientes ativos" value={kpis.total} icon={<Users className="h-4 w-4" />} variant="primary" />
        <KPICard title="Saudáveis" value={kpis.healthy} icon={<Heart className="h-4 w-4" />} variant="success" />
        <KPICard title="Em risco" value={kpis.atRisk + kpis.critical} icon={<AlertTriangle className="h-4 w-4" />} variant="warning" description={`${kpis.critical} críticos`} />
        <KPICard title="Health Score médio" value={kpis.avg} icon={<Activity className="h-4 w-4" />} variant="default" />
        <KPICard title="MRR em risco" value={`€${kpis.mrrAtRisk.toLocaleString("pt-PT")}`} icon={<AlertTriangle className="h-4 w-4" />} variant="destructive" />
        <KPICard title="Expansão potencial" value={`€${kpis.expansion.toLocaleString("pt-PT")}`} icon={<TrendingUp className="h-4 w-4" />} variant="success" description="MRR adicional" />
        <KPICard title="Check-ins pendentes" value={(checkins.data ?? []).filter(c => c.status === "scheduled").length} icon={<Calendar className="h-4 w-4" />} variant="default" />
        <KPICard title="Playbooks ativos" value={(playbooks.data ?? []).filter(p => p.active).length} icon={<Sparkles className="h-4 w-4" />} variant="primary" />
      </KPIGrid>

      <Tabs defaultValue="customers">
        <TabsList>
          <TabsTrigger value="customers">Clientes</TabsTrigger>
          <TabsTrigger value="risks">Riscos ({risks.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="upsell">Upsell ({opportunities.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="checkins">Check-ins</TabsTrigger>
          <TabsTrigger value="playbooks">Playbooks</TabsTrigger>
        </TabsList>

        <TabsContent value="customers">
          <Card>
            <CardHeader><CardTitle>Carteira de clientes</CardTitle></CardHeader>
            <CardContent>
              {list.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center">Ainda não existem clientes em acompanhamento.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead className="text-right">MRR</TableHead>
                      <TableHead>Health</TableHead>
                      <TableHead>Ciclo</TableHead>
                      <TableHead>Renovação</TableHead>
                      <TableHead>Próximo check-in</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.map(a => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.name}</TableCell>
                        <TableCell className="text-muted-foreground">{a.segment ?? "—"}</TableCell>
                        <TableCell className="text-right">€{Number(a.mrr ?? 0).toLocaleString("pt-PT")}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={healthVariant(a.health_status)}>
                            {a.health_score ?? "—"} · {a.health_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">{a.lifecycle_stage}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{a.renewal_date ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{a.next_checkin_at ? new Date(a.next_checkin_at).toLocaleDateString("pt-PT") : "—"}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" asChild>
                            <Link to={`/dashboard/customer-success/${a.id}`}>Abrir</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risks">
          <Card><CardContent className="pt-6">
            {(risks.data ?? []).length === 0 ? (
              <p className="text-muted-foreground py-8 text-center">Nenhum risco crítico identificado.</p>
            ) : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Cliente</TableHead><TableHead>Risco</TableHead><TableHead>Severidade</TableHead>
                  <TableHead className="text-right">MRR em risco</TableHead><TableHead>Ação recomendada</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {(risks.data ?? []).map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.customer_accounts?.name ?? "—"}</TableCell>
                      <TableCell>{r.title}</TableCell>
                      <TableCell><Badge variant={r.severity === "critical" ? "destructive" : "outline"}>{r.severity}</Badge></TableCell>
                      <TableCell className="text-right">€{Number(r.estimated_mrr_at_risk ?? 0).toLocaleString("pt-PT")}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{r.recommended_action ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="upsell">
          <Card><CardContent className="pt-6">
            {(opportunities.data ?? []).length === 0 ? (
              <p className="text-muted-foreground py-8 text-center">Nenhuma oportunidade de expansão identificada neste momento.</p>
            ) : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Cliente</TableHead><TableHead>Oportunidade</TableHead><TableHead>Tipo</TableHead>
                  <TableHead className="text-right">+MRR</TableHead><TableHead>Confiança</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {(opportunities.data ?? []).map((o: any) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-medium">{o.customer_accounts?.name ?? "—"}</TableCell>
                      <TableCell>{o.title}</TableCell>
                      <TableCell><Badge variant="outline">{o.opportunity_type}</Badge></TableCell>
                      <TableCell className="text-right text-success font-medium">+€{Number(o.estimated_mrr_increase ?? 0).toLocaleString("pt-PT")}</TableCell>
                      <TableCell>{Math.round(Number(o.confidence ?? 0) * 100)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="checkins">
          <Card><CardContent className="pt-6">
            {(checkins.data ?? []).length === 0 ? (
              <p className="text-muted-foreground py-8 text-center">Não existem check-ins agendados.</p>
            ) : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Cliente</TableHead><TableHead>Tipo</TableHead><TableHead>Estado</TableHead>
                  <TableHead>Agendado</TableHead><TableHead>Canal</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {(checkins.data ?? []).map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell>{c.customer_accounts?.name ?? "—"}</TableCell>
                      <TableCell>{c.checkin_type}</TableCell>
                      <TableCell><Badge variant="outline">{c.status}</Badge></TableCell>
                      <TableCell className="text-muted-foreground text-sm">{c.scheduled_at ? new Date(c.scheduled_at).toLocaleString("pt-PT") : "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{c.channel ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="playbooks">
          <div className="grid gap-3 md:grid-cols-2">
            {(playbooks.data ?? []).map((p: any) => (
              <Card key={p.id}>
                <CardHeader className="pb-2"><CardTitle className="text-base flex items-center justify-between">
                  {p.name} {p.active && <Badge variant="outline" className="bg-success/10 text-success">Ativo</Badge>}
                </CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{p.description}</p>
                  <p className="text-xs text-muted-foreground mt-2">Tipo: {p.playbook_type}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
