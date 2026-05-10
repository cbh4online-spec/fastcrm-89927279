import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useWhatsAppAnalytics } from "@/hooks/useWhatsAppAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
} from "recharts";
import { BarChart3, Download, MessageSquare, CheckCheck, Eye, AlertTriangle, UserMinus, Send } from "lucide-react";
import { Link } from "react-router-dom";

function KpiCard({ icon: Icon, label, value, hint, tone = "default" }: { icon: any; label: string; value: string; hint?: string; tone?: "default" | "success" | "warning" | "danger" }) {
  const toneClass =
    tone === "success" ? "text-emerald-500" :
    tone === "warning" ? "text-amber-500" :
    tone === "danger" ? "text-destructive" :
    "text-primary";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
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
  const csv = [headers.join(","), ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? "")).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function WhatsAppAnalyticsPage() {
  const [days, setDays] = useState(30);
  const { data, isLoading } = useWhatsAppAnalytics(days);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Métricas WhatsApp Pro</h1>
              <p className="text-sm text-muted-foreground">Taxas de entrega, leitura, falha e opt-out por campanha</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="14">Últimos 14 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              disabled={!data?.campaigns.length}
              onClick={() => data && exportCsv(data.campaigns, `whatsapp-campanhas-${days}d.csv`)}
            >
              <Download className="h-4 w-4 mr-2" /> Exportar CSV
            </Button>
            <Link to="/dashboard/whatsapp-pro/campaigns">
              <Button size="sm" variant="secondary">Ir para Campanhas</Button>
            </Link>
          </div>
        </div>

        {isLoading || !data ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard icon={MessageSquare} label="Campanhas" value={String(data.kpis.totalCampaigns)} hint={`${data.kpis.totalRecipients} destinatários`} />
              <KpiCard icon={Send} label="Enviados" value={data.kpis.sent.toLocaleString("pt-PT")} />
              <KpiCard icon={CheckCheck} label="Taxa de entrega" tone="success" value={`${data.kpis.deliveryRate}%`} hint={`${data.kpis.delivered} entregues`} />
              <KpiCard icon={Eye} label="Taxa de leitura" tone="success" value={`${data.kpis.readRate}%`} hint={`${data.kpis.read} lidos`} />
              <KpiCard icon={AlertTriangle} label="Falhas" tone="danger" value={`${data.kpis.failureRate}%`} hint={`${data.kpis.failed} falharam`} />
              <KpiCard icon={UserMinus} label="Opt-outs" tone="warning" value={`${data.kpis.optoutRate}%`} hint={`${data.kpis.optouts} no período`} />
              <KpiCard icon={CheckCheck} label="Conversão (lidos/enviados)" value={`${data.kpis.sent ? Math.round((data.kpis.read / data.kpis.sent) * 1000) / 10 : 0}%`} />
              <KpiCard icon={MessageSquare} label="Engajamento líquido" value={`${data.kpis.delivered - data.kpis.optouts >= 0 ? data.kpis.delivered - data.kpis.optouts : 0}`} hint="Entregues − opt-outs" />
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
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gRead" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(142 70% 45%)" stopOpacity={0.5} />
                          <stop offset="100%" stopColor="hsl(142 70% 45%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                      <Legend />
                      <Area type="monotone" dataKey="sent" name="Enviados" stroke="hsl(var(--primary))" fill="url(#gSent)" />
                      <Area type="monotone" dataKey="delivered" name="Entregues" stroke="hsl(199 89% 48%)" fillOpacity={0} />
                      <Area type="monotone" dataKey="read" name="Lidos" stroke="hsl(142 70% 45%)" fill="url(#gRead)" />
                      <Area type="monotone" dataKey="failed" name="Falhas" stroke="hsl(var(--destructive))" fillOpacity={0} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Por campanha</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {data.campaigns.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">Sem campanhas no período selecionado.</div>
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
                      {data.campaigns.map(c => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell><Badge variant="outline">{c.status}</Badge></TableCell>
                          <TableCell className="text-right">{c.total_recipients}</TableCell>
                          <TableCell className="text-right">{c.sent_count}</TableCell>
                          <TableCell className="text-right text-emerald-500">{c.deliveryRate}%</TableCell>
                          <TableCell className="text-right text-emerald-500">{c.readRate}%</TableCell>
                          <TableCell className="text-right text-destructive">{c.failed_count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
