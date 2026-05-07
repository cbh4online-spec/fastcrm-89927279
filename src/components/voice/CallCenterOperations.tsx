/**
 * Call Center Operations — painel operacional do VoiceHub.
 * KPIs de SLA, taxa de atendimento, abandono, duração média, ocupação por agente,
 * distribuição por hora e fila em tempo real (chamadas ativas/em espera).
 */
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Activity, Clock, PhoneCall, PhoneMissed, PhoneOff, Timer, Users,
  TrendingUp, AlertTriangle, CheckCircle2, RefreshCw, Gauge,
} from "lucide-react";
import { useVoiceCallLogs } from "@/hooks/useVoiceHub";
import { format, subDays, isAfter, differenceInSeconds } from "date-fns";
import { pt } from "date-fns/locale";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line, Legend,
} from "recharts";

type Range = "today" | "7d" | "30d";

function rangeStart(r: Range): Date {
  const now = new Date();
  if (r === "today") { const d = new Date(now); d.setHours(0,0,0,0); return d; }
  return subDays(now, r === "7d" ? 7 : 30);
}

function fmtSec(s: number | null | undefined) {
  if (!s || s <= 0) return "—";
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}m ${sec}s`;
}

function pct(n: number) {
  return `${Math.round(n * 10) / 10}%`;
}

export function CallCenterOperations() {
  const [range, setRange] = useState<Range>("7d");
  const slaSec = 20; // SLA padrão de atendimento: 20s
  const { data: allCalls = [], isLoading, refetch } = useVoiceCallLogs({});

  const calls = useMemo(() => {
    const start = rangeStart(range);
    return (allCalls as any[]).filter((c) => c.created_at && isAfter(new Date(c.created_at), start));
  }, [allCalls, range]);

  const stats = useMemo(() => {
    const total = calls.length;
    const inbound = calls.filter((c) => c.call_direction === "inbound");
    const outbound = calls.filter((c) => c.call_direction === "outbound");
    const answered = calls.filter((c) => ["completed", "answered", "in_progress"].includes(c.status));
    const missed = calls.filter((c) => ["missed", "no_answer", "failed", "busy"].includes(c.status));
    const abandoned = inbound.filter((c) => ["missed", "no_answer", "abandoned"].includes(c.status));

    const durations = calls.map((c) => c.duration_seconds || 0).filter((d) => d > 0);
    const avgDur = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

    // SLA: % de chamadas inbound atendidas em <= slaSec (usa wait_seconds se existir, senão fallback queue_seconds)
    const inboundAnswered = inbound.filter((c) => ["completed", "answered"].includes(c.status));
    const withWait = inboundAnswered.map((c) => c.wait_seconds ?? c.queue_seconds ?? null).filter((w) => w != null) as number[];
    const slaHits = withWait.filter((w) => w <= slaSec).length;
    const slaPct = withWait.length ? (slaHits / withWait.length) * 100 : 0;
    const avgWait = withWait.length ? withWait.reduce((a, b) => a + b, 0) / withWait.length : 0;

    const answerRate = inbound.length ? (inboundAnswered.length / inbound.length) * 100 : 0;
    const abandonRate = inbound.length ? (abandoned.length / inbound.length) * 100 : 0;

    return {
      total, inbound: inbound.length, outbound: outbound.length,
      answered: answered.length, missed: missed.length, abandoned: abandoned.length,
      avgDur, slaPct, avgWait, answerRate, abandonRate,
    };
  }, [calls]);

  // Distribuição por hora
  const byHour = useMemo(() => {
    const buckets = Array.from({ length: 24 }, (_, h) => ({ hour: `${String(h).padStart(2,"0")}h`, total: 0, atendidas: 0, perdidas: 0 }));
    calls.forEach((c) => {
      if (!c.created_at) return;
      const h = new Date(c.created_at).getHours();
      buckets[h].total++;
      if (["completed","answered","in_progress"].includes(c.status)) buckets[h].atendidas++;
      else if (["missed","no_answer","failed","busy","abandoned"].includes(c.status)) buckets[h].perdidas++;
    });
    return buckets;
  }, [calls]);

  // Tendência diária (SLA + volume)
  const byDay = useMemo(() => {
    const map = new Map<string, { day: string; total: number; sla: number; cumWait: number; waitN: number }>();
    calls.forEach((c) => {
      if (!c.created_at) return;
      const day = format(new Date(c.created_at), "dd/MM");
      const e = map.get(day) ?? { day, total: 0, sla: 0, cumWait: 0, waitN: 0 };
      e.total++;
      const w = c.wait_seconds ?? c.queue_seconds ?? null;
      if (w != null) { e.waitN++; e.cumWait += w; if (w <= slaSec) e.sla++; }
      map.set(day, e);
    });
    return Array.from(map.values()).map((e) => ({
      day: e.day, total: e.total,
      sla: e.waitN ? Math.round((e.sla / e.waitN) * 100) : 0,
      avgWait: e.waitN ? Math.round(e.cumWait / e.waitN) : 0,
    }));
  }, [calls]);

  // Ocupação por agente
  const byAgent = useMemo(() => {
    const map = new Map<string, { agent: string; total: number; atendidas: number; perdidas: number; talkSec: number }>();
    calls.forEach((c) => {
      const agent = c.assigned_to_name || c.assigned_to || c.user_id || "Sem agente";
      const e = map.get(agent) ?? { agent, total: 0, atendidas: 0, perdidas: 0, talkSec: 0 };
      e.total++;
      if (["completed","answered","in_progress"].includes(c.status)) e.atendidas++;
      else if (["missed","no_answer","failed","busy"].includes(c.status)) e.perdidas++;
      e.talkSec += c.duration_seconds || 0;
      map.set(agent, e);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [calls]);

  // Fila em tempo real: chamadas a decorrer / em espera
  const liveQueue = useMemo(() => {
    return calls.filter((c) => ["ringing","queued","in_progress"].includes(c.status))
      .map((c) => ({
        ...c,
        elapsed: c.created_at ? differenceInSeconds(new Date(), new Date(c.created_at)) : 0,
      }))
      .sort((a, b) => b.elapsed - a.elapsed);
  }, [calls]);

  return (
    <div className="space-y-4">
      {/* Cabeçalho + filtros */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" /> Call Center Operations
          </h2>
          <p className="text-xs text-muted-foreground">SLA, atendimento, abandono e ocupação operacional em tempo real.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={range} onValueChange={(v) => setRange(v as Range)}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* KPIs operacionais */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <KpiCard icon={<Gauge className="h-4 w-4" />} label={`SLA ≤ ${slaSec}s`} value={pct(stats.slaPct)}
          tone={stats.slaPct >= 80 ? "ok" : stats.slaPct >= 60 ? "warn" : "bad"} />
        <KpiCard icon={<CheckCircle2 className="h-4 w-4" />} label="Taxa atendimento" value={pct(stats.answerRate)}
          tone={stats.answerRate >= 90 ? "ok" : stats.answerRate >= 70 ? "warn" : "bad"} />
        <KpiCard icon={<PhoneOff className="h-4 w-4" />} label="Abandono" value={pct(stats.abandonRate)}
          tone={stats.abandonRate <= 5 ? "ok" : stats.abandonRate <= 15 ? "warn" : "bad"} />
        <KpiCard icon={<Timer className="h-4 w-4" />} label="Espera média" value={fmtSec(stats.avgWait)} />
        <KpiCard icon={<Clock className="h-4 w-4" />} label="Duração média" value={fmtSec(stats.avgDur)} />
        <KpiCard icon={<PhoneCall className="h-4 w-4" />} label="Volume total" value={String(stats.total)} />
      </div>

      {/* Resumo entrada/saída/perdidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MiniStat label="Entrada" value={stats.inbound} />
        <MiniStat label="Saída" value={stats.outbound} />
        <MiniStat label="Atendidas" value={stats.answered} tone="ok" />
        <MiniStat label="Perdidas" value={stats.missed} tone="bad" />
      </div>

      {/* Fila em tempo real */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-600 animate-pulse" /> Fila em tempo real
            <Badge variant="outline">{liveQueue.length}</Badge>
          </CardTitle>
          <CardDescription>Chamadas a tocar, em fila ou em curso neste momento.</CardDescription>
        </CardHeader>
        <CardContent>
          {liveQueue.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Sem chamadas ativas.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estado</TableHead>
                  <TableHead>Número</TableHead>
                  <TableHead>Agente</TableHead>
                  <TableHead>Decorrido</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {liveQueue.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell><Badge variant={c.status === "in_progress" ? "default" : "secondary"}>{c.status}</Badge></TableCell>
                    <TableCell className="font-medium">{c.from_number || c.to_number || "—"}</TableCell>
                    <TableCell className="text-sm">{c.assigned_to_name || c.assigned_to || "—"}</TableCell>
                    <TableCell className="tabular-nums">{fmtSec(c.elapsed)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Distribuição por hora
            </CardTitle>
          </CardHeader>
          <CardContent style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byHour}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="atendidas" stackId="a" fill="hsl(var(--primary))" name="Atendidas" />
                <Bar dataKey="perdidas" stackId="a" fill="hsl(var(--destructive))" name="Perdidas" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Gauge className="h-4 w-4" /> Tendência SLA & espera
            </CardTitle>
          </CardHeader>
          <CardContent style={{ height: 260 }}>
            {byDay.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">Sem dados suficientes.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={byDay}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line yAxisId="left" type="monotone" dataKey="sla" stroke="hsl(var(--primary))" name="SLA %" strokeWidth={2} />
                  <Line yAxisId="right" type="monotone" dataKey="avgWait" stroke="hsl(var(--destructive))" name="Espera (s)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ocupação por agente */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" /> Ocupação por agente (top 10)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {byAgent.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Sem dados de agentes.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agente</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Atendidas</TableHead>
                  <TableHead>Perdidas</TableHead>
                  <TableHead>Tempo total</TableHead>
                  <TableHead className="w-40">Taxa atendimento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byAgent.map((a) => {
                  const rate = a.total ? (a.atendidas / a.total) * 100 : 0;
                  return (
                    <TableRow key={a.agent}>
                      <TableCell className="font-medium">{a.agent}</TableCell>
                      <TableCell>{a.total}</TableCell>
                      <TableCell className="text-emerald-600">{a.atendidas}</TableCell>
                      <TableCell className="text-red-600">{a.perdidas}</TableCell>
                      <TableCell className="tabular-nums">{fmtSec(a.talkSec)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={rate} className="h-2" />
                          <span className="text-xs tabular-nums w-10">{Math.round(rate)}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" />
        SLA calculado com base no tempo de espera por chamada. Para métricas reais, garante que o provider envia <code>wait_seconds</code> ou <code>queue_seconds</code> no webhook.
      </p>
    </div>
  );
}

function KpiCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone?: "ok" | "warn" | "bad" }) {
  const color = tone === "ok" ? "text-emerald-600" : tone === "warn" ? "text-amber-600" : tone === "bad" ? "text-red-600" : "";
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">{icon}{label}</div>
        <p className={`text-xl font-semibold mt-1 ${color}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: number; tone?: "ok" | "bad" }) {
  const color = tone === "ok" ? "text-emerald-600" : tone === "bad" ? "text-red-600" : "";
  return (
    <Card>
      <CardContent className="pt-4 pb-3 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className={`text-lg font-semibold ${color}`}>{value}</span>
      </CardContent>
    </Card>
  );
}
