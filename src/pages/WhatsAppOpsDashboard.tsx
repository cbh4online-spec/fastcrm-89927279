import { useState } from "react";
import { useWhatsAppOpsDashboard } from "@/hooks/useWhatsAppOpsDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, MessageCircle, Timer, Target, TrendingUp, AlertTriangle } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from "recharts";

function fmtMin(v: number | null | undefined): string {
  if (v == null) return "—";
  if (v < 1) return `${Math.round(v * 60)}s`;
  if (v < 60) return `${v.toFixed(1)} min`;
  return `${(v / 60).toFixed(1)}h`;
}

function fmtCurrency(v: number): string {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v || 0);
}

export default function WhatsAppOpsDashboard() {
  const [fromDays, setFromDays] = useState(30);
  const [slaMinutes, setSlaMinutes] = useState(15);
  const { data, isLoading, isError, error } = useWhatsAppOpsDashboard({ fromDays, slaMinutes });

  const overall = data?.overall;
  const bySource = data?.by_source ?? [];
  const byDay = data?.by_day ?? [];
  const byAgent = data?.by_agent ?? [];

  const slaPct = overall?.sla_compliance_pct ?? 0;
  const slaColor = slaPct >= 80 ? "text-success" : slaPct >= 60 ? "text-warning" : "text-destructive";

  return (
    <div className="container mx-auto p-6 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Operação WhatsApp</h1>
          <p className="text-sm text-muted-foreground">
            SLA, tempo de resposta e conversões nos últimos {fromDays} dias
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={String(fromDays)} onValueChange={(v) => setFromDays(Number(v))}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 dias</SelectItem>
              <SelectItem value="14">14 dias</SelectItem>
              <SelectItem value="30">30 dias</SelectItem>
              <SelectItem value="90">90 dias</SelectItem>
            </SelectContent>
          </Select>
          <Select value={String(slaMinutes)} onValueChange={(v) => setSlaMinutes(Number(v))}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">SLA 5 min</SelectItem>
              <SelectItem value="15">SLA 15 min</SelectItem>
              <SelectItem value="30">SLA 30 min</SelectItem>
              <SelectItem value="60">SLA 60 min</SelectItem>
              <SelectItem value="240">SLA 4h</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {isError && (
        <Card className="border-destructive">
          <CardContent className="pt-6 text-sm text-destructive">
            Erro ao carregar dados: {(error as Error)?.message ?? "desconhecido"}
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && overall && (
        <>
          {/* KPIs */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <KPI
              icon={<MessageCircle className="h-4 w-4" />}
              title="Conversas"
              value={overall.total_conversations.toLocaleString("pt-PT")}
              hint={`${overall.responded} respondidas · ${overall.pending_response} por responder`}
            />
            <KPI
              icon={<Target className="h-4 w-4" />}
              title={`SLA ${slaMinutes} min`}
              value={overall.sla_compliance_pct != null ? `${overall.sla_compliance_pct.toFixed(1)}%` : "—"}
              hint={`${overall.within_sla} dentro · ${overall.sla_breached} fora`}
              valueClass={slaColor}
              progress={slaPct}
            />
            <KPI
              icon={<Timer className="h-4 w-4" />}
              title="Tempo médio 1ª resposta"
              value={fmtMin(overall.avg_first_response_minutes)}
              hint={`mediana ${fmtMin(overall.median_first_response_minutes)} · p90 ${fmtMin(overall.p90_first_response_minutes)}`}
            />
            <KPI
              icon={<AlertTriangle className="h-4 w-4" />}
              title="Por responder"
              value={overall.pending_response.toLocaleString("pt-PT")}
              hint={overall.pending_response > 0 ? "Requer atenção" : "Tudo respondido"}
              valueClass={overall.pending_response > 0 ? "text-destructive" : "text-success"}
            />
          </div>

          {/* Série temporal */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Volume e tempo de resposta diário
              </CardTitle>
            </CardHeader>
            <CardContent>
              {byDay.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Sem dados no período</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={byDay}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="conversations" name="Conversas" stroke="hsl(var(--primary))" strokeWidth={2} />
                    <Line yAxisId="right" type="monotone" dataKey="avg_first_response_minutes" name="Tempo médio (min)" stroke="hsl(var(--destructive))" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Conversões por origem */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Conversões por origem</CardTitle>
              </CardHeader>
              <CardContent>
                {bySource.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">Sem dados</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={bySource} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="source" tick={{ fontSize: 11 }} width={100} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="conversations" name="Conversas" fill="hsl(var(--primary))" />
                      <Bar dataKey="conversions" name="Conversões" fill="hsl(var(--success))" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Detalhe por origem</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Origem</TableHead>
                      <TableHead className="text-right">Conv.</TableHead>
                      <TableHead className="text-right">Convertidas</TableHead>
                      <TableHead className="text-right">Taxa</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bySource.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Sem dados</TableCell></TableRow>
                    )}
                    {bySource.map((s) => (
                      <TableRow key={s.source}>
                        <TableCell className="font-medium">{s.source}</TableCell>
                        <TableCell className="text-right">{s.conversations}</TableCell>
                        <TableCell className="text-right">{s.conversions}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={s.conversion_rate_pct >= 20 ? "default" : "secondary"}>
                            {s.conversion_rate_pct.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{fmtCurrency(s.converted_value)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Por agente */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Performance por agente</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agente</TableHead>
                    <TableHead className="text-right">Conversas</TableHead>
                    <TableHead className="text-right">Tempo médio</TableHead>
                    <TableHead className="text-right">SLA</TableHead>
                    <TableHead className="text-right">Conversões</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byAgent.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Sem conversas atribuídas</TableCell></TableRow>
                  )}
                  {byAgent.map((a) => {
                    const pct = a.conversations > 0 ? (a.within_sla / a.conversations) * 100 : 0;
                    return (
                      <TableRow key={a.agent_id}>
                        <TableCell className="font-medium">{a.agent_name}</TableCell>
                        <TableCell className="text-right">{a.conversations}</TableCell>
                        <TableCell className="text-right">{fmtMin(a.avg_first_response_minutes)}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={pct >= 80 ? "default" : pct >= 60 ? "secondary" : "destructive"}>
                            {pct.toFixed(0)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{a.conversions}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function KPI({
  icon, title, value, hint, valueClass, progress,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  hint?: string;
  valueClass?: string;
  progress?: number;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="p-2 rounded-lg bg-primary/10 text-primary">{icon}</div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className={`text-2xl font-bold ${valueClass ?? ""}`}>{value}</div>
        {progress != null && <Progress value={Math.min(progress, 100)} className="h-1.5" />}
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
