import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Shield, TrendingUp, AlertTriangle, Activity, DollarSign, Zap } from "lucide-react";
import { useCostGuardSummary, useCostGuardEvents, useCostGuardLimits, useCostGuardRates } from "@/hooks/useCostGuard";
import { format } from "date-fns";

const fmtEUR = (v: number) => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(v || 0);

export default function CostGuardPage() {
  const [tab, setTab] = useState("dashboard");
  const summary = useCostGuardSummary();
  const events = useCostGuardEvents(200);
  const limits = useCostGuardLimits();
  const rates = useCostGuardRates();

  const s = summary.data;
  const marginPct = s && s.total_billable > 0 ? (s.total_margin / s.total_billable) * 100 : 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-7 w-7 text-primary" /> Controlo de Custos
          </h1>
          <p className="text-muted-foreground mt-1">Monitore consumo, limites e rentabilidade por workspace.</p>
        </div>
        {s && <Badge variant="outline" className="text-sm">Mês: {s.month}</Badge>}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><DollarSign className="h-4 w-4" /> Custo real</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{fmtEUR(s?.total_cost || 0)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Faturável</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{fmtEUR(s?.total_billable || 0)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Zap className="h-4 w-4" /> Margem</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{fmtEUR(s?.total_margin || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">{marginPct.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Alertas abertos</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{s?.alerts?.length || 0}</div></CardContent>
        </Card>
      </div>

      {/* Active alerts banner */}
      {s?.alerts && s.alerts.length > 0 && (
        <div className="space-y-2">
          {s.alerts.slice(0, 3).map((a: any) => (
            <Alert key={a.id} variant={a.severity === "critical" ? "destructive" : "default"}>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{a.title}</AlertTitle>
              <AlertDescription>{a.description}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="limits">Limites</TabsTrigger>
          <TabsTrigger value="rates">Tarifários</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle>Consumo por módulo</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Módulo</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead className="text-right">Custo</TableHead>
                    <TableHead className="text-right">Faturável</TableHead>
                    <TableHead className="text-right">Margem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(s?.by_module || []).map((m: any) => (
                    <TableRow key={m.module}>
                      <TableCell><Badge variant="outline">{m.module}</Badge></TableCell>
                      <TableCell className="text-right">{Number(m.quantity).toLocaleString("pt-PT")}</TableCell>
                      <TableCell className="text-right">{fmtEUR(m.cost)}</TableCell>
                      <TableCell className="text-right">{fmtEUR(m.billable)}</TableCell>
                      <TableCell className="text-right text-green-600">{fmtEUR(m.margin)}</TableCell>
                    </TableRow>
                  ))}
                  {(!s?.by_module || s.by_module.length === 0) && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Sem consumo registado este mês.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="limits" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle>Limites configurados</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo de uso</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Consumo</TableHead>
                    <TableHead className="text-right">Limite</TableHead>
                    <TableHead>Bloqueio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(limits.data || []).map((l: any) => {
                    const monthly = (s?.by_usage_type || []).find((m: any) => m.usage_type === l.usage_type);
                    const used = Number(monthly?.quantity_total || 0);
                    const pct = l.hard_limit_quantity ? (used / l.hard_limit_quantity) * 100 : 0;
                    return (
                      <TableRow key={l.id}>
                        <TableCell><Badge variant="outline">{l.usage_type}</Badge></TableCell>
                        <TableCell className="text-muted-foreground">{l.limit_period}</TableCell>
                        <TableCell className="w-64">
                          <div className="space-y-1">
                            <div className="text-xs text-muted-foreground">{used.toLocaleString("pt-PT")} / {Number(l.hard_limit_quantity || 0).toLocaleString("pt-PT")}</div>
                            <Progress value={Math.min(pct, 100)} className={pct >= 100 ? "bg-destructive/20" : pct >= l.soft_limit_percentage ? "bg-yellow-500/20" : ""} />
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{Number(l.hard_limit_quantity || 0).toLocaleString("pt-PT")}</TableCell>
                        <TableCell>{l.block_when_exceeded ? <Badge variant="destructive">Bloqueia</Badge> : <Badge variant="secondary">Permite overage</Badge>}</TableCell>
                      </TableRow>
                    );
                  })}
                  {(!limits.data || limits.data.length === 0) && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Sem limites configurados. Defina limites para proteger o consumo.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rates" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle>Tarifários por provider</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead>Módulo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead className="text-right">Custo</TableHead>
                    <TableHead className="text-right">Faturável</TableHead>
                    <TableHead className="text-right">Margem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(rates.data || []).map((r: any) => {
                    const m = r.billable_unit_amount > 0 ? ((r.billable_unit_amount - r.cost_unit_amount) / r.billable_unit_amount) * 100 : 0;
                    return (
                      <TableRow key={r.id}>
                        <TableCell><Badge variant="outline">{r.provider_name}</Badge></TableCell>
                        <TableCell>{r.source_module}</TableCell>
                        <TableCell className="font-mono text-xs">{r.usage_type}</TableCell>
                        <TableCell>{r.unit}</TableCell>
                        <TableCell className="text-right">{fmtEUR(Number(r.cost_unit_amount))}</TableCell>
                        <TableCell className="text-right">{fmtEUR(Number(r.billable_unit_amount || 0))}</TableCell>
                        <TableCell className="text-right text-green-600">{m.toFixed(1)}%</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle>Eventos recentes (últimos 200)</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Módulo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                    <TableHead className="text-right">Custo</TableHead>
                    <TableHead className="text-right">Faturável</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(events.data || []).slice(0, 200).map((e: any) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-xs">{format(new Date(e.occurred_at), "dd/MM HH:mm")}</TableCell>
                      <TableCell><Badge variant="outline">{e.source_module}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{e.usage_type}</TableCell>
                      <TableCell className="text-muted-foreground">{e.provider_name || "—"}</TableCell>
                      <TableCell className="text-right">{Number(e.quantity).toLocaleString("pt-PT")} {e.unit}</TableCell>
                      <TableCell className="text-right">{fmtEUR(Number(e.cost_total_amount || 0))}</TableCell>
                      <TableCell className="text-right">{fmtEUR(Number(e.billable_total_amount || 0))}</TableCell>
                    </TableRow>
                  ))}
                  {(!events.data || events.data.length === 0) && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Sem eventos registados.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
