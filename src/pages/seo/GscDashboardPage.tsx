import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { Helmet } from "react-helmet-async";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import {
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  TrendingUp,
  Eye,
  MousePointerClick,
  Target,
  Bell,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import { pt } from "date-fns/locale";

const DEFAULT_SITE = "sc-domain:fastcrm.metodopare.ai";
const INSPECT_SITE = "https://fastcrm.metodopare.ai/";

type Range = 7 | 28 | 90;

async function callGsc<T>(payload: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("gsc-dashboard", { body: payload });
  if (error) throw error;
  if (data?.fallback) throw new Error(data?.error ?? "Erro GSC");
  return data as T;
}

interface SitemapEntry {
  path: string;
  lastSubmitted?: string;
  lastDownloaded?: string;
  isPending?: boolean;
  isSitemapsIndex?: boolean;
  warnings?: string;
  errors?: string;
  contents?: Array<{ type?: string; submitted?: string; indexed?: string }>;
}
interface OverviewData {
  totals: { rows?: Array<{ clicks: number; impressions: number; ctr: number; position: number }> };
  byDate: { rows?: Array<{ keys: string[]; clicks: number; impressions: number; ctr: number; position: number }> };
  sitemaps: { sitemap?: SitemapEntry[] };
  range: { startDate: string; endDate: string; days: number };
}
interface PagesData {
  rows?: Array<{ keys: string[]; clicks: number; impressions: number; ctr: number; position: number }>;
}
interface InspectData {
  inspectionResult?: {
    indexStatusResult?: {
      verdict?: string;
      coverageState?: string;
      robotsTxtState?: string;
      indexingState?: string;
      lastCrawlTime?: string;
      pageFetchState?: string;
      googleCanonical?: string;
      userCanonical?: string;
      sitemap?: string[];
      referringUrls?: string[];
      crawledAs?: string;
    };
    mobileUsabilityResult?: { verdict?: string };
    richResultsResult?: { verdict?: string };
    inspectionResultLink?: string;
  };
}

interface GscAlert {
  id: string;
  alert_type: string;
  severity: "info" | "warning" | "critical";
  url: string | null;
  title: string;
  message: string | null;
  status: "open" | "resolved" | "snoozed";
  first_seen_at: string;
  last_seen_at: string;
  details: Record<string, unknown>;
}

const ALERT_LABELS: Record<string, string> = {
  sitemap_error: "Erro de sitemap",
  sitemap_warning: "Aviso de sitemap",
  sitemap_pending: "Sitemap pendente",
  url_not_indexed: "Página não indexada",
  canonical_mismatch: "Canonical divergente",
  crawl_error: "Erro de rastreio",
  robots_blocked: "Bloqueado por robots.txt",
};

function SeverityBadge({ severity }: { severity: string }) {
  if (severity === "critical")
    return <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30"><XCircle className="h-3 w-3 mr-1" />Crítico</Badge>;
  if (severity === "warning")
    return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"><AlertTriangle className="h-3 w-3 mr-1" />Aviso</Badge>;
  return <Badge variant="outline">Info</Badge>;
}


function VerdictBadge({ verdict }: { verdict?: string }) {
  if (!verdict) return <Badge variant="outline">—</Badge>;
  const v = verdict.toUpperCase();
  if (v === "PASS")
    return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"><CheckCircle2 className="h-3 w-3 mr-1" />Indexado</Badge>;
  if (v === "PARTIAL")
    return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"><AlertTriangle className="h-3 w-3 mr-1" />Parcial</Badge>;
  if (v === "FAIL" || v === "NEUTRAL")
    return <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30"><XCircle className="h-3 w-3 mr-1" />{v === "FAIL" ? "Não indexado" : "Neutral"}</Badge>;
  return <Badge variant="outline">{verdict}</Badge>;
}

function KpiCard({ label, value, icon: Icon, hint }: { label: string; value: string; icon: typeof Eye; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="text-2xl font-semibold">{value}</div>
        {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
      </CardContent>
    </Card>
  );
}

export default function GscDashboardPage() {
  const [range, setRange] = useState<Range>(28);
  const [inspectUrl, setInspectUrl] = useState(INSPECT_SITE);

  const overview = useQuery({
    queryKey: ["gsc", "overview", range],
    queryFn: () => callGsc<OverviewData>({ action: "overview", site: DEFAULT_SITE, days: range }),
    staleTime: 5 * 60_000,
  });

  const topPages = useQuery({
    queryKey: ["gsc", "pages", range],
    queryFn: () =>
      callGsc<PagesData>({
        action: "search_analytics",
        site: DEFAULT_SITE,
        days: range,
        dimensions: ["page"],
        rowLimit: 50,
      }),
    staleTime: 5 * 60_000,
  });

  const topQueries = useQuery({
    queryKey: ["gsc", "queries", range],
    queryFn: () =>
      callGsc<PagesData>({
        action: "search_analytics",
        site: DEFAULT_SITE,
        days: range,
        dimensions: ["query"],
        rowLimit: 50,
      }),
    staleTime: 5 * 60_000,
  });

  const inspect = useMutation({
    mutationFn: (url: string) =>
      callGsc<InspectData>({
        action: "inspect_url",
        site: DEFAULT_SITE,
        inspectSite: INSPECT_SITE,
        url,
      }),
    onError: (err: Error) => toast.error(err.message ?? "Erro ao inspeccionar URL"),
  });

  const resubmit = useMutation({
    mutationFn: () =>
      callGsc<{ submitted: Array<{ feed: string; ok: boolean; error?: string }> }>({
        action: "submit_sitemaps",
        site: DEFAULT_SITE,
      }),
    onSuccess: (data) => {
      const ok = data.submitted.filter((s) => s.ok).length;
      const fail = data.submitted.length - ok;
      if (fail === 0) toast.success(`${ok} sitemap(s) resubmetido(s) ao Google.`);
      else toast.warning(`${ok} ok, ${fail} falharam.`);
      overview.refetch();
    },
    onError: (err: Error) => toast.error(err.message ?? "Erro ao resubmeter sitemaps"),
  });

  const totals = overview.data?.totals?.rows?.[0];
  const sitemaps = overview.data?.sitemaps?.sitemap ?? [];

  const sitemapStats = useMemo(() => {
    let warn = 0, err = 0, pending = 0;
    for (const s of sitemaps) {
      warn += Number(s.warnings ?? 0);
      err += Number(s.errors ?? 0);
      if (s.isPending) pending += 1;
    }
    return { warn, err, pending, total: sitemaps.length };
  }, [sitemaps]);

  const refreshAll = () => {
    overview.refetch();
    topPages.refetch();
    topQueries.refetch();
  };

  return (
    <DashboardLayout>
      <Helmet><title>Search Console — FastCRM</title></Helmet>
      <div className="space-y-6 p-4 md:p-6">
        <PageHeader
          title="Google Search Console"
          description="Cobertura, indexação e desempenho de fastcrm.metodopare.ai"
        >
          <div className="flex items-center gap-2">
            <Select value={String(range)} onValueChange={(v) => setRange(Number(v) as Range)}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="28">Últimos 28 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={refreshAll} disabled={overview.isFetching}>
              <RefreshCw className={`h-4 w-4 ${overview.isFetching ? "animate-spin" : ""}`} />
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={`https://search.google.com/search-console?resource_id=${encodeURIComponent(DEFAULT_SITE)}`} target="_blank" rel="noreferrer">
                Abrir no GSC <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </Button>
          </div>
        </PageHeader>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {overview.isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)
          ) : (
            <>
              <KpiCard label="Cliques" value={totals ? totals.clicks.toLocaleString("pt-PT") : "—"} icon={MousePointerClick} hint={`${range} dias`} />
              <KpiCard label="Impressões" value={totals ? totals.impressions.toLocaleString("pt-PT") : "—"} icon={Eye} hint={`${range} dias`} />
              <KpiCard label="CTR" value={totals ? `${(totals.ctr * 100).toFixed(2)}%` : "—"} icon={TrendingUp} />
              <KpiCard label="Posição média" value={totals ? totals.position.toFixed(1) : "—"} icon={Target} />
            </>
          )}
        </div>

        {/* Sitemap summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Sitemaps" value={String(sitemapStats.total)} icon={CheckCircle2} />
          <KpiCard label="Pendentes" value={String(sitemapStats.pending)} icon={AlertTriangle} />
          <KpiCard label="Avisos" value={String(sitemapStats.warn)} icon={AlertTriangle} />
          <KpiCard label="Erros" value={String(sitemapStats.err)} icon={XCircle} />
        </div>

        <Tabs defaultValue="sitemaps" className="space-y-4">
          <TabsList>
            <TabsTrigger value="sitemaps">Sitemaps</TabsTrigger>
            <TabsTrigger value="pages">Top URLs</TabsTrigger>
            <TabsTrigger value="queries">Top Queries</TabsTrigger>
            <TabsTrigger value="inspect">Inspector de URL</TabsTrigger>
          </TabsList>

          {/* SITEMAPS */}
          <TabsContent value="sitemaps">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Sitemaps submetidos</CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => resubmit.mutate()}
                  disabled={resubmit.isPending}
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-2 ${resubmit.isPending ? "animate-spin" : ""}`} />
                  Resubmeter ao Google
                </Button>
              </CardHeader>
              <CardContent>
                {overview.isLoading ? (
                  <Skeleton className="h-40" />
                ) : sitemaps.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum sitemap submetido.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Sitemap</TableHead>
                          <TableHead>Último envio</TableHead>
                          <TableHead>Último download</TableHead>
                          <TableHead className="text-center">Avisos</TableHead>
                          <TableHead className="text-center">Erros</TableHead>
                          <TableHead>Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sitemaps.map((s) => (
                          <TableRow key={s.path}>
                            <TableCell className="font-mono text-xs max-w-[360px] truncate">
                              <a href={s.path} target="_blank" rel="noreferrer" className="hover:underline">{s.path}</a>
                            </TableCell>
                            <TableCell className="text-sm">
                              {s.lastSubmitted ? formatDistanceToNow(new Date(s.lastSubmitted), { addSuffix: true, locale: pt }) : "—"}
                            </TableCell>
                            <TableCell className="text-sm">
                              {s.lastDownloaded ? formatDistanceToNow(new Date(s.lastDownloaded), { addSuffix: true, locale: pt }) : <span className="text-muted-foreground">nunca</span>}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant={Number(s.warnings ?? 0) > 0 ? "secondary" : "outline"}>{s.warnings ?? 0}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant={Number(s.errors ?? 0) > 0 ? "destructive" : "outline"}>{s.errors ?? 0}</Badge>
                            </TableCell>
                            <TableCell>
                              {s.isPending
                                ? <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30">Pendente</Badge>
                                : <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">Processado</Badge>}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TOP URLS */}
          <TabsContent value="pages">
            <Card>
              <CardHeader><CardTitle>URLs com mais desempenho</CardTitle></CardHeader>
              <CardContent>
                {topPages.isLoading ? <Skeleton className="h-40" /> : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>URL</TableHead>
                          <TableHead className="text-right">Cliques</TableHead>
                          <TableHead className="text-right">Impressões</TableHead>
                          <TableHead className="text-right">CTR</TableHead>
                          <TableHead className="text-right">Pos.</TableHead>
                          <TableHead className="text-right">Acção</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(topPages.data?.rows ?? []).map((row) => (
                          <TableRow key={row.keys[0]}>
                            <TableCell className="font-mono text-xs max-w-[420px] truncate">{row.keys[0]}</TableCell>
                            <TableCell className="text-right">{row.clicks.toLocaleString("pt-PT")}</TableCell>
                            <TableCell className="text-right">{row.impressions.toLocaleString("pt-PT")}</TableCell>
                            <TableCell className="text-right">{(row.ctr * 100).toFixed(2)}%</TableCell>
                            <TableCell className="text-right">{row.position.toFixed(1)}</TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="ghost" onClick={() => { setInspectUrl(row.keys[0]); inspect.mutate(row.keys[0]); }}>
                                <Search className="h-3 w-3 mr-1" /> Inspeccionar
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {(topPages.data?.rows?.length ?? 0) === 0 && (
                          <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">Sem dados no período seleccionado.</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TOP QUERIES */}
          <TabsContent value="queries">
            <Card>
              <CardHeader><CardTitle>Pesquisas com mais desempenho</CardTitle></CardHeader>
              <CardContent>
                {topQueries.isLoading ? <Skeleton className="h-40" /> : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Query</TableHead>
                          <TableHead className="text-right">Cliques</TableHead>
                          <TableHead className="text-right">Impressões</TableHead>
                          <TableHead className="text-right">CTR</TableHead>
                          <TableHead className="text-right">Pos.</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(topQueries.data?.rows ?? []).map((row) => (
                          <TableRow key={row.keys[0]}>
                            <TableCell className="text-sm">{row.keys[0]}</TableCell>
                            <TableCell className="text-right">{row.clicks.toLocaleString("pt-PT")}</TableCell>
                            <TableCell className="text-right">{row.impressions.toLocaleString("pt-PT")}</TableCell>
                            <TableCell className="text-right">{(row.ctr * 100).toFixed(2)}%</TableCell>
                            <TableCell className="text-right">{row.position.toFixed(1)}</TableCell>
                          </TableRow>
                        ))}
                        {(topQueries.data?.rows?.length ?? 0) === 0 && (
                          <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground">Sem dados no período seleccionado.</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* INSPECT */}
          <TabsContent value="inspect">
            <Card>
              <CardHeader><CardTitle>Inspeccionar URL no índice do Google</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <form
                  className="flex flex-col sm:flex-row gap-2"
                  onSubmit={(e) => { e.preventDefault(); if (inspectUrl) inspect.mutate(inspectUrl); }}
                >
                  <Input
                    value={inspectUrl}
                    onChange={(e) => setInspectUrl(e.target.value)}
                    placeholder="https://fastcrm.metodopare.ai/precos"
                    maxLength={2048}
                  />
                  <Button type="submit" disabled={inspect.isPending || !inspectUrl}>
                    {inspect.isPending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                    Inspeccionar
                  </Button>
                </form>

                {inspect.isPending && <Skeleton className="h-40" />}

                {inspect.data?.inspectionResult && (() => {
                  const r = inspect.data.inspectionResult;
                  const idx = r.indexStatusResult ?? {};
                  return (
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        <VerdictBadge verdict={idx.verdict} />
                        {idx.coverageState && <Badge variant="outline">{idx.coverageState}</Badge>}
                        {idx.robotsTxtState && <Badge variant="outline">robots: {idx.robotsTxtState}</Badge>}
                        {idx.indexingState && <Badge variant="outline">{idx.indexingState}</Badge>}
                        {idx.pageFetchState && <Badge variant="outline">fetch: {idx.pageFetchState}</Badge>}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div><span className="text-muted-foreground">Último crawl: </span>{idx.lastCrawlTime ? format(new Date(idx.lastCrawlTime), "Pp", { locale: pt }) : "—"}</div>
                        <div><span className="text-muted-foreground">Crawled as: </span>{idx.crawledAs ?? "—"}</div>
                        <div className="md:col-span-2"><span className="text-muted-foreground">Canónico do Google: </span><span className="font-mono text-xs break-all">{idx.googleCanonical ?? "—"}</span></div>
                        <div className="md:col-span-2"><span className="text-muted-foreground">Canónico do utilizador: </span><span className="font-mono text-xs break-all">{idx.userCanonical ?? "—"}</span></div>
                      </div>

                      {idx.sitemap && idx.sitemap.length > 0 && (
                        <div className="text-sm">
                          <p className="font-medium mb-1">Sitemaps que referenciam o URL</p>
                          <ul className="list-disc pl-5 space-y-1">
                            {idx.sitemap.map((s) => <li key={s} className="font-mono text-xs break-all">{s}</li>)}
                          </ul>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">Mobile: {r.mobileUsabilityResult?.verdict ?? "—"}</Badge>
                        <Badge variant="outline">Rich results: {r.richResultsResult?.verdict ?? "—"}</Badge>
                      </div>

                      {r.inspectionResultLink && (
                        <Button asChild variant="outline" size="sm">
                          <a href={r.inspectionResultLink} target="_blank" rel="noreferrer">Ver no Search Console <ExternalLink className="h-3 w-3 ml-1" /></a>
                        </Button>
                      )}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {overview.data?.range && (
          <p className="text-xs text-muted-foreground">
            Período: {overview.data.range.startDate} → {overview.data.range.endDate} · Propriedade: <code>{DEFAULT_SITE}</code>
          </p>
        )}
      </div>
    </DashboardLayout>
  );
}
