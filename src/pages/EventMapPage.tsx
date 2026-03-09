import { useState, useMemo } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useEventRegistry } from "@/hooks/useEventRegistry";
import { useEventMapStats } from "@/hooks/useEventMapStats";
import { Radio, Search, BarChart3, ShieldCheck, AlertTriangle, BookOpen } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

const TABS = [
  { id: "catalog", label: "Catálogo", icon: <BookOpen className="h-4 w-4" /> },
  { id: "live", label: "Eventos Live", icon: <Radio className="h-4 w-4" /> },
  { id: "volume", label: "Volume", icon: <BarChart3 className="h-4 w-4" /> },
  { id: "coverage", label: "Cobertura", icon: <ShieldCheck className="h-4 w-4" /> },
  { id: "failed", label: "Falhados", icon: <AlertTriangle className="h-4 w-4" /> },
];

const DOMAIN_COLORS: Record<string, string> = {
  core: "hsl(var(--chart-1))",
  crm: "hsl(var(--chart-2))",
  comm: "hsl(var(--chart-3))",
  calendar: "hsl(var(--chart-4))",
  productivity: "hsl(var(--chart-5))",
  sales: "hsl(var(--chart-1))",
  marketing: "hsl(var(--chart-2))",
  store: "hsl(var(--chart-3))",
  c2c: "hsl(var(--chart-4))",
  b2b: "hsl(var(--chart-5))",
  community: "hsl(var(--chart-1))",
  ai: "hsl(var(--chart-2))",
  strategy: "hsl(var(--chart-3))",
  admin: "hsl(var(--chart-4))",
  system: "hsl(var(--chart-5))",
  forms: "hsl(var(--chart-1))",
  imports: "hsl(var(--chart-2))",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  processed: "default",
  unregistered: "outline",
  failed: "destructive",
  inactive: "outline",
};

export default function EventMapPage() {
  const [tab, setTab] = useState("catalog");
  const [search, setSearch] = useState("");

  const { data: registry, isLoading: regLoading } = useEventRegistry();
  const { volume, liveEvents, failedEvents } = useEventMapStats();

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Event Map"
        description="Catálogo oficial e observabilidade dos eventos do Kernel"
        tabs={TABS}
        activeTab={tab}
        onTabChange={setTab}
      />

      {tab === "catalog" && (
        <CatalogTab registry={registry ?? []} isLoading={regLoading} search={search} setSearch={setSearch} />
      )}
      {tab === "live" && (
        <LiveTab events={liveEvents.data ?? []} isLoading={liveEvents.isLoading} search={search} setSearch={setSearch} />
      )}
      {tab === "volume" && (
        <VolumeTab events={volume.data ?? []} isLoading={volume.isLoading} />
      )}
      {tab === "coverage" && (
        <CoverageTab registry={registry ?? []} emitted={volume.data ?? []} isLoading={regLoading || volume.isLoading} />
      )}
      {tab === "failed" && (
        <FailedTab events={failedEvents.data ?? []} isLoading={failedEvents.isLoading} />
      )}
    </div>
  );
}

/* ---- Tab Components ---- */

function CatalogTab({ registry, isLoading, search, setSearch }: { registry: any[]; isLoading: boolean; search: string; setSearch: (s: string) => void }) {
  const grouped = useMemo((): Record<string, any[]> => {
    const filtered = registry.filter((e: any) =>
      !search || e.event_name.toLowerCase().includes(search.toLowerCase()) || e.description?.toLowerCase().includes(search.toLowerCase())
    );
    return filtered.reduce((acc: Record<string, any[]>, e: any) => {
      (acc[e.domain] ??= []).push(e);
      return acc;
    }, {} as Record<string, any[]>);
  }, [registry, search]);

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Pesquisar eventos..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>
      {Object.entries(grouped).sort().map(([domain, events]) => (
        <Card key={domain} className="border-border/50 bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">{domain}</Badge>
              <span className="text-muted-foreground text-xs">{events.length} eventos</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-[300px]">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/30 text-muted-foreground">
                    <th className="text-left px-4 py-2 font-medium">Evento</th>
                    <th className="text-left px-4 py-2 font-medium">Entidade</th>
                    <th className="text-left px-4 py-2 font-medium">Módulo</th>
                    <th className="text-left px-4 py-2 font-medium">Descrição</th>
                    <th className="text-center px-4 py-2 font-medium">v</th>
                    <th className="text-center px-4 py-2 font-medium">Ativo</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e: any) => (
                    <tr key={e.id} className="border-b border-border/20 hover:bg-muted/30">
                      <td className="px-4 py-2 font-mono text-foreground">{e.event_name}</td>
                      <td className="px-4 py-2 text-muted-foreground">{e.entity_type}</td>
                      <td className="px-4 py-2 text-muted-foreground">{e.source_module}</td>
                      <td className="px-4 py-2 text-muted-foreground">{e.description ?? "—"}</td>
                      <td className="px-4 py-2 text-center text-muted-foreground">{e.version}</td>
                      <td className="px-4 py-2 text-center">
                        <Badge variant={e.is_active ? "default" : "outline"} className="text-[10px]">
                          {e.is_active ? "Sim" : "Não"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function LiveTab({ events, isLoading, search, setSearch }: { events: any[]; isLoading: boolean; search: string; setSearch: (s: string) => void }) {
  const filtered = events.filter(e =>
    !search || (e.event_name ?? e.type ?? "").toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Filtrar eventos..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>
      <Card className="border-border/50 bg-card/50">
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/30 text-muted-foreground sticky top-0 bg-card">
                  <th className="text-left px-4 py-2 font-medium">Evento</th>
                  <th className="text-left px-4 py-2 font-medium">Entidade</th>
                  <th className="text-left px-4 py-2 font-medium">Módulo</th>
                  <th className="text-center px-4 py-2 font-medium">Status</th>
                  <th className="text-right px-4 py-2 font-medium">Quando</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e: any) => (
                  <tr key={e.id} className="border-b border-border/20 hover:bg-muted/30">
                    <td className="px-4 py-2 font-mono text-foreground">{e.event_name ?? e.type}</td>
                    <td className="px-4 py-2 text-muted-foreground">{e.entity_kind}:{e.entity_id?.slice(0, 8)}</td>
                    <td className="px-4 py-2 text-muted-foreground">{e.source_module ?? "—"}</td>
                    <td className="px-4 py-2 text-center">
                      <Badge variant={STATUS_VARIANT[e.status] ?? "secondary"} className="text-[10px]">{e.status}</Badge>
                    </td>
                    <td className="px-4 py-2 text-right text-muted-foreground">
                      {formatDistanceToNow(new Date(e.created_at), { addSuffix: true, locale: pt })}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Sem eventos</td></tr>
                )}
              </tbody>
            </table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function VolumeTab({ events, isLoading }: { events: any[]; isLoading: boolean }) {
  const chartData = useMemo(() => {
    const counts: Record<string, number> = {};
    events.forEach(e => {
      const domain = (e.event_name ?? e.type ?? "unknown").split(".")[0];
      counts[domain] = (counts[domain] ?? 0) + 1;
    });
    return Object.entries(counts)
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count);
  }, [events]);

  if (isLoading) return <LoadingSkeleton />;

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Volume por Domínio — últimos 7 dias</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Sem dados de volume</p>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData}>
              <XAxis dataKey="domain" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell key={entry.domain} fill={DOMAIN_COLORS[entry.domain] ?? "hsl(var(--primary))"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function CoverageTab({ registry, emitted, isLoading }: { registry: any[]; emitted: any[]; isLoading: boolean }) {
  const coverage = useMemo(() => {
    const emittedSet = new Set(emitted.map(e => e.event_name ?? e.type));
    const byModule: Record<string, { total: number; covered: number; events: { name: string; hit: boolean }[] }> = {};

    registry.forEach(r => {
      const mod = r.source_module;
      if (!byModule[mod]) byModule[mod] = { total: 0, covered: 0, events: [] };
      const hit = emittedSet.has(r.event_name);
      byModule[mod].total++;
      if (hit) byModule[mod].covered++;
      byModule[mod].events.push({ name: r.event_name, hit });
    });

    return Object.entries(byModule).sort((a, b) => a[0].localeCompare(b[0]));
  }, [registry, emitted]);

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {coverage.map(([mod, data]) => {
        const pct = data.total > 0 ? Math.round((data.covered / data.total) * 100) : 0;
        return (
          <Card key={mod} className="border-border/50 bg-card/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span>{mod}</span>
                <Badge variant={pct >= 50 ? "default" : "destructive"} className="text-xs">{pct}%</Badge>
              </CardTitle>
              <p className="text-[10px] text-muted-foreground">{data.covered}/{data.total} eventos emitidos</p>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-1">
                {data.events.map(e => (
                  <Badge key={e.name} variant={e.hit ? "default" : "outline"} className="text-[9px] font-mono">
                    {e.name.split(".").pop()}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function FailedTab({ events, isLoading }: { events: any[]; isLoading: boolean }) {
  if (isLoading) return <LoadingSkeleton />;

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader>
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          Eventos Falhados / Não Registados
          {events.length > 0 && <Badge variant="destructive" className="text-xs">{events.length}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sem eventos falhados 🎉</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/30 text-muted-foreground sticky top-0 bg-card">
                  <th className="text-left px-4 py-2 font-medium">Evento</th>
                  <th className="text-left px-4 py-2 font-medium">Entidade</th>
                  <th className="text-center px-4 py-2 font-medium">Status</th>
                  <th className="text-right px-4 py-2 font-medium">Quando</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e: any) => (
                  <tr key={e.id} className="border-b border-border/20 hover:bg-muted/30">
                    <td className="px-4 py-2 font-mono text-foreground">{e.event_name ?? e.type}</td>
                    <td className="px-4 py-2 text-muted-foreground">{e.entity_kind}:{e.entity_id?.slice(0, 8)}</td>
                    <td className="px-4 py-2 text-center">
                      <Badge variant="destructive" className="text-[10px]">{e.status}</Badge>
                    </td>
                    <td className="px-4 py-2 text-right text-muted-foreground">
                      {formatDistanceToNow(new Date(e.created_at), { addSuffix: true, locale: pt })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}
