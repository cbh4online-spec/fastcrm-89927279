import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useWhatsAppAnalytics } from "@/hooks/useWhatsAppAnalytics";
import { useWhatsAppOpsDashboard } from "@/hooks/useWhatsAppOpsDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import {
  BarChart3,
  Download,
  MessageSquare,
  CheckCheck,
  Eye,
  AlertTriangle,
  UserMinus,
  Send,
  Clock,
  Timer,
  Target,
  Flame,
} from "lucide-react";
import { Link } from "react-router-dom";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: any;
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const toneClass =
    tone === "success"
      ? "text-emerald-500"
      : tone === "warning"
        ? "text-amber-500"
        : tone === "danger"
          ? "text-destructive"
          : "text-primary";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">
            {label}
          </span>
          <Icon className={`h-4 w-4 ${toneClass}`} />
        </div>
        <div className="mt-2 text-2xl font-semibold">{value}</div>
        {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function exportCsv(rows: any[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function Heatmap({ data }: { data: { weekday: number; hour: number; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const grid: Record<number, Record<number, number>> = {};
  data.forEach((d) => {
    grid[d.weekday] ??= {};
    grid[d.weekday][d.hour] = d.count;
  });

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        <div className="grid grid-cols-[40px_repeat(24,minmax(18px,1fr))] gap-[2px]">
          <div />
          {Array.from({ length: 24 }).map((_, h) => (
            <div
              key={h}
              className="text-[10px] text-muted-foreground text-center"
            >
              {h % 3 === 0 ? h : ""}
            </div>
          ))}
          {WEEKDAYS.map((wd, w) => (
            <>
              <div key={`l-${w}`} className="text-xs text-muted-foreground pr-2 flex items-center">
                {wd}
              </div>
              {Array.from({ length: 24 }).map((_, h) => {
                const v = grid[w]?.[h] ?? 0;
                const intensity = v / max;
                return (
                  <div
                    key={`${w}-${h}`}
                    title={`${wd} ${h}h • ${v} envios`}
                    className="h-5 rounded-sm border border-border/30"
                    style={{
                      backgroundColor:
                        v === 0
                          ? "hsl(var(--muted))"
                          : `hsl(var(--primary) / ${0.15 + intensity * 0.85})`,
                    }}
                  />
                );
              })}
            </>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
          <span>Menos</span>
          <div className="flex gap-[2px]">
            {[0.15, 0.35, 0.55, 0.75, 1].map((o) => (
              <div
                key={o}
                className="h-3 w-3 rounded-sm"
                style={{ backgroundColor: `hsl(var(--primary) / ${o})` }}
              />
            ))}
          </div>
          <span>Mais</span>
        </div>
      </div>
    </div>
  );
}

export default function WhatsAppAnalyticsPage() {
  const [days, setDays] = useState(30);
  const [slaMinutes, setSlaMinutes] = useState(15);
  const { data, isLoading } = useWhatsAppAnalytics(days);
  const { data: ops, isLoading: opsLoading } = useWhatsAppOpsDashboard({
    fromDays: days,
    slaMinutes,
  });

  const sourcesChart = useMemo(
    () =>
      (ops?.by_source ?? []).slice(0, 8).map((s) => ({
        source: s.source || "(sem origem)",
        Conversas: s.conversations,
        Conversões: s.conversions,
        Taxa: s.conversion_rate_pct,
      })),
    [ops],
  );

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Relatórios &amp; Analytics WhatsApp</h1>
              <p className="text-sm text-muted-foreground">
                Campanhas, conversas, SLA de resposta e melhor horário de envio
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="14">Últimos 14 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={String(slaMinutes)}
              onValueChange={(v) => setSlaMinutes(Number(v))}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">SLA 5 min</SelectItem>
                <SelectItem value="15">SLA 15 min</SelectItem>
                <SelectItem value="30">SLA 30 min</SelectItem>
                <SelectItem value="60">SLA 60 min</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              disabled={!data?.campaigns.length}
              onClick={() =>
                data && exportCsv(data.campaigns, `whatsapp-campanhas-${days}d.csv`)
              }
            >
              <Download className="h-4 w-4 mr-2" /> CSV
            </Button>
            <Link to="/dashboard/whatsapp-pro/campaigns">
              <Button size="sm" variant="secondary">
                Campanhas
              </Button>
            </Link>
          </div>
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Visão geral</TabsTrigger>
            <TabsTrigger value="conversations">Conversas &amp; SLA</TabsTrigger>
            <TabsTrigger value="hours">Melhores horários</TabsTrigger>
            <TabsTrigger value="campaigns">Campanhas</TabsTrigger>
          </TabsList>

          {/* OVERVIEW */}
          <TabsContent value="overview" className="space-y-6">
            {isLoading || !data ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-lg" />
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <KpiCard
                    icon={MessageSquare}
                    label="Campanhas"
                    value={String(data.kpis.totalCampaigns)}
                    hint={`${data.kpis.totalRecipients} destinatários`}
                  />
                  <KpiCard
                    icon={Send}
                    label="Enviados"
                    value={data.kpis.sent.toLocaleString("pt-PT")}
                  />
                  <KpiCard
                    icon={CheckCheck}
                    label="Taxa de entrega"
                    tone="success"
                    value={`${data.kpis.deliveryRate}%`}
                    hint={`${data.kpis.delivered} entregues`}
                  />
                  <KpiCard
                    icon={Eye}
                    label="Taxa de leitura"
                    tone="success"
                    value={`${data.kpis.readRate}%`}
                    hint={`${data.kpis.read} lidos`}
                  />
                  <KpiCard
                    icon={AlertTriangle}
                    label="Falhas"
                    tone="danger"
                    value={`${data.kpis.failureRate}%`}
                    hint={`${data.kpis.failed} falharam`}
                  />
                  <KpiCard
                    icon={UserMinus}
                    label="Opt-outs"
                    tone="warning"
                    value={`${data.kpis.optoutRate}%`}
                    hint={`${data.kpis.optouts} no período`}
                  />
                  <KpiCard
                    icon={CheckCheck}
                    label="Conv. (lidos/enviados)"
                    value={`${
                      data.kpis.sent
                        ? Math.round((data.kpis.read / data.kpis.sent) * 1000) / 10
                        : 0
                    }%`}
                  />
                  <KpiCard
                    icon={MessageSquare}
                    label="Engajamento líquido"
                    value={`${
                      data.kpis.delivered - data.kpis.optouts >= 0
                        ? data.kpis.delivered - data.kpis.optouts
                        : 0
                    }`}
                    hint="Entregues − opt-outs"
                  />
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Evolução diária</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data.series}>
                          <defs>
                            <linearGradient id="gSent" x1="0" y1="0" x2="0" y2="1">
                              <stop
                                offset="0%"
                                stopColor="hsl(var(--primary))"
                                stopOpacity={0.5}
                              />
                              <stop
                                offset="100%"
                                stopColor="hsl(var(--primary))"
                                stopOpacity={0}
                              />
                            </linearGradient>
                            <linearGradient id="gRead" x1="0" y1="0" x2="0" y2="1">
                              <stop
                                offset="0%"
                                stopColor="hsl(142 70% 45%)"
                                stopOpacity={0.5}
                              />
                              <stop
                                offset="100%"
                                stopColor="hsl(142 70% 45%)"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="hsl(var(--border))"
                          />
                          <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip
                            contentStyle={{
                              background: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                            }}
                          />
                          <Legend />
                          <Area
                            type="monotone"
                            dataKey="sent"
                            name="Enviados"
                            stroke="hsl(var(--primary))"
                            fill="url(#gSent)"
                          />
                          <Area
                            type="monotone"
                            dataKey="delivered"
                            name="Entregues"
                            stroke="hsl(199 89% 48%)"
                            fillOpacity={0}
                          />
                          <Area
                            type="monotone"
                            dataKey="read"
                            name="Lidos"
                            stroke="hsl(142 70% 45%)"
                            fill="url(#gRead)"
                          />
                          <Area
                            type="monotone"
                            dataKey="failed"
                            name="Falhas"
                            stroke="hsl(var(--destructive))"
                            fillOpacity={0}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* CONVERSATIONS */}
          <TabsContent value="conversations" className="space-y-6">
            {opsLoading || !ops ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-lg" />
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <KpiCard
                    icon={MessageSquare}
                    label="Conversas"
                    value={String(ops.overall.total_conversations)}
                    hint={`${ops.overall.responded} respondidas`}
                  />
                  <KpiCard
                    icon={Clock}
                    label="Tempo médio 1ª resposta"
                    value={
                      ops.overall.avg_first_response_minutes != null
                        ? `${ops.overall.avg_first_response_minutes.toFixed(1)} min`
                        : "—"
                    }
                    hint={
                      ops.overall.median_first_response_minutes != null
                        ? `Mediana ${ops.overall.median_first_response_minutes.toFixed(1)} min`
                        : undefined
                    }
                  />
                  <KpiCard
                    icon={Timer}
                    label="P90 1ª resposta"
                    tone="warning"
                    value={
                      ops.overall.p90_first_response_minutes != null
                        ? `${ops.overall.p90_first_response_minutes.toFixed(1)} min`
                        : "—"
                    }
                  />
                  <KpiCard
                    icon={Target}
                    label={`Cumprimento SLA ${ops.overall.sla_minutes}m`}
                    tone="success"
                    value={
                      ops.overall.sla_compliance_pct != null
                        ? `${ops.overall.sla_compliance_pct.toFixed(1)}%`
                        : "—"
                    }
                    hint={`${ops.overall.within_sla} dentro / ${ops.overall.sla_breached} fora`}
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Por origem</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={sourcesChart}>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="hsl(var(--border))"
                            />
                            <XAxis dataKey="source" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip
                              contentStyle={{
                                background: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                              }}
                            />
                            <Legend />
                            <Bar dataKey="Conversas" fill="hsl(var(--primary))" />
                            <Bar dataKey="Conversões" fill="hsl(142 70% 45%)" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Top agentes</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      {ops.by_agent.length === 0 ? (
                        <div className="p-8 text-center text-sm text-muted-foreground">
                          Sem dados de agentes no período.
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Agente</TableHead>
                              <TableHead className="text-right">Conv.</TableHead>
                              <TableHead className="text-right">Tempo médio</TableHead>
                              <TableHead className="text-right">SLA OK</TableHead>
                              <TableHead className="text-right">Convertidas</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {ops.by_agent.slice(0, 10).map((a) => (
                              <TableRow key={a.agent_id}>
                                <TableCell className="font-medium">
                                  {a.agent_name || "—"}
                                </TableCell>
                                <TableCell className="text-right">
                                  {a.conversations}
                                </TableCell>
                                <TableCell className="text-right">
                                  {a.avg_first_response_minutes != null
                                    ? `${a.avg_first_response_minutes.toFixed(1)}m`
                                    : "—"}
                                </TableCell>
                                <TableCell className="text-right text-emerald-500">
                                  {a.within_sla}
                                </TableCell>
                                <TableCell className="text-right">
                                  {a.conversions}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          {/* HOURS */}
          <TabsContent value="hours" className="space-y-6">
            {isLoading || !data ? (
              <Skeleton className="h-[280px] rounded-lg" />
            ) : (
              <>
                {data.bestHour && data.bestHour.count > 0 && (
                  <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                      <Flame className="h-5 w-5 text-amber-500" />
                      <div className="text-sm">
                        Melhor horário detectado:{" "}
                        <strong>
                          {WEEKDAYS[data.bestHour.weekday]} às {data.bestHour.hour}h
                        </strong>{" "}
                        com <strong>{data.bestHour.count}</strong> envios. Considere
                        agendar campanhas neste intervalo.
                      </div>
                    </CardContent>
                  </Card>
                )}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Heatmap de envios (dia da semana × hora)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Heatmap data={data.heatmap} />
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* CAMPAIGNS */}
          <TabsContent value="campaigns">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Por campanha</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading || !data ? (
                  <div className="p-6 space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : data.campaigns.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    Sem campanhas no período selecionado.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Destinatários</TableHead>
                        <TableHead className="text-right">Enviados</TableHead>
                        <TableHead className="text-right">Entrega</TableHead>
                        <TableHead className="text-right">Leitura</TableHead>
                        <TableHead className="text-right">Falhas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.campaigns.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{c.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {c.total_recipients}
                          </TableCell>
                          <TableCell className="text-right">{c.sent_count}</TableCell>
                          <TableCell className="text-right text-emerald-500">
                            {c.deliveryRate}%
                          </TableCell>
                          <TableCell className="text-right text-emerald-500">
                            {c.readRate}%
                          </TableCell>
                          <TableCell className="text-right text-destructive">
                            {c.failed_count}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
