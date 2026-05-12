import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Code2,
  Columns2,
  Eye,
  ExternalLink,
  FileCode2,
  Home,
  Loader2,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { BuilderPreviewFrame } from "./BuilderPreviewFrame";
import { BuilderCodeEditor } from "./BuilderCodeEditor";
import { cn } from "@/lib/utils";

interface SitePage {
  id: string;
  site_id: string;
  source_url: string;
  path: string;
  slug: string;
  title: string | null;
  html: string;
  status: "pending" | "cloning" | "completed" | "failed";
  is_home: boolean;
  bytes: number;
  error: string | null;
  order_index: number;
  updated_at: string;
}

interface SiteRow {
  id: string;
  source_url: string;
  source_host: string;
  status: string;
  pages_total: number;
  pages_done: number;
  pages_failed: number;
  error: string | null;
}

const STATUS_META: Record<SitePage["status"], { label: string; icon: typeof CheckCircle2; cls: string }> = {
  pending: { label: "Pendente", icon: Clock, cls: "text-muted-foreground" },
  cloning: { label: "A clonar", icon: Loader2, cls: "text-blue-500 animate-spin" },
  completed: { label: "OK", icon: CheckCircle2, cls: "text-emerald-500" },
  failed: { label: "Falhou", icon: XCircle, cls: "text-destructive" },
};

interface Props {
  assetId: string;
  workspaceId: string;
}

export function BuilderClonedSiteWorkspace({ assetId, workspaceId }: Props) {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [draftHtml, setDraftHtml] = useState<string>("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<"split" | "preview" | "code">("preview");
  const [previewKey, setPreviewKey] = useState(0);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const lastLoadedRef = useRef<string | null>(null);

  // 1. Site agregador
  const siteQuery = useQuery({
    queryKey: ["builder-site-by-asset", assetId],
    queryFn: async (): Promise<SiteRow | null> => {
      const { data, error } = await supabase
        .from("builder_sites")
        .select("id,source_url,source_host,status,pages_total,pages_done,pages_failed,error")
        .eq("asset_id", assetId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as SiteRow) ?? null;
    },
  });

  const siteId = siteQuery.data?.id ?? null;

  // 2. Páginas
  const pagesQuery = useQuery({
    queryKey: ["builder-site-pages", siteId],
    enabled: !!siteId,
    queryFn: async (): Promise<SitePage[]> => {
      const { data, error } = await supabase
        .from("builder_site_pages")
        .select("id,site_id,source_url,path,slug,title,html,status,is_home,bytes,error,order_index,updated_at")
        .eq("site_id", siteId!)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return (data ?? []) as SitePage[];
    },
  });

  // 3. Realtime: site + páginas
  useEffect(() => {
    if (!siteId) return;
    const ch = supabase
      .channel(`cloned-site-${siteId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "builder_sites", filter: `id=eq.${siteId}` },
        () => qc.invalidateQueries({ queryKey: ["builder-site-by-asset", assetId] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "builder_site_pages", filter: `site_id=eq.${siteId}` },
        () => qc.invalidateQueries({ queryKey: ["builder-site-pages", siteId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [siteId, assetId, qc]);

  const pages = pagesQuery.data ?? [];
  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return pages;
    return pages.filter(
      (p) =>
        p.path.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        (p.title ?? "").toLowerCase().includes(q),
    );
  }, [pages, filter]);

  // selecção inicial: home > primeira completed > primeira
  useEffect(() => {
    if (!pages.length) return;
    if (selectedId && pages.find((p) => p.id === selectedId)) return;
    const home = pages.find((p) => p.is_home && p.status === "completed");
    const firstDone = pages.find((p) => p.status === "completed");
    const fallback = home ?? firstDone ?? pages[0];
    setSelectedId(fallback.id);
  }, [pages, selectedId]);

  const selected = pages.find((p) => p.id === selectedId) ?? null;

  // hidratar draft quando muda página seleccionada
  useEffect(() => {
    if (!selected) {
      setDraftHtml("");
      setDirty(false);
      lastLoadedRef.current = null;
      return;
    }
    if (lastLoadedRef.current !== selected.id) {
      setDraftHtml(selected.html ?? "");
      setDirty(false);
      lastLoadedRef.current = selected.id;
    }
  }, [selected]);

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("builder_site_pages")
        .update({ html: draftHtml, bytes: new Blob([draftHtml]).size })
        .eq("id", selected.id);
      if (error) throw error;
      toast.success("Página guardada");
      setDirty(false);
      setLastSavedAt(new Date());
      setPreviewKey((k) => k + 1);
      qc.invalidateQueries({ queryKey: ["builder-site-pages", siteId] });
    } catch (err) {
      toast.error("Erro a guardar", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  if (siteQuery.isLoading) {
    return (
      <div className="grid grid-cols-4 gap-3 h-full">
        <Skeleton className="h-full" />
        <Skeleton className="h-full col-span-3" />
      </div>
    );
  }

  if (!siteQuery.data) {
    return (
      <div className="flex items-center gap-3 text-muted-foreground p-6 border rounded-lg max-w-xl mx-auto mt-12">
        <AlertCircle className="h-5 w-5" />
        <div>
          <p className="font-medium text-foreground">Site clonado não encontrado</p>
          <p className="text-sm">
            Este asset está marcado como site multi-página mas não tem registo
            em <code>builder_sites</code>. Pode ter falhado a clonar — tenta de novo.
          </p>
        </div>
      </div>
    );
  }

  const site = siteQuery.data;
  const progressPct =
    site.pages_total > 0
      ? Math.round(((site.pages_done + site.pages_failed) / site.pages_total) * 100)
      : 0;
  const isCloning = site.status === "discovering" || site.status === "cloning";

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg border">
      {/* Sidebar páginas */}
      <ResizablePanel defaultSize={22} minSize={16} maxSize={35}>
        <div className="flex flex-col h-full bg-muted/20">
          <div className="p-3 border-b space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate" title={site.source_url}>
                  {site.source_host}
                </p>
                <a
                  href={site.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-muted-foreground hover:underline inline-flex items-center gap-1"
                >
                  Original <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
              <Badge
                variant={
                  site.status === "completed"
                    ? "default"
                    : site.status === "failed"
                      ? "destructive"
                      : "secondary"
                }
                className="shrink-0"
              >
                {site.status}
              </Badge>
            </div>
            {(isCloning || site.pages_failed > 0) && (
              <div className="space-y-1">
                <Progress value={progressPct} className="h-1.5" />
                <p className="text-[11px] text-muted-foreground">
                  {site.pages_done}/{site.pages_total} concluídas
                  {site.pages_failed > 0 && ` · ${site.pages_failed} falharam`}
                </p>
              </div>
            )}
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Filtrar páginas…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="h-8 pl-7 text-xs"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              {filtered.length} de {pages.length} páginas
            </p>
          </div>

          <ScrollArea className="flex-1">
            {pagesQuery.isLoading ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-full" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                Sem páginas {filter ? "para este filtro" : "ainda"}.
              </div>
            ) : (
              <ul className="divide-y">
                {filtered.map((p) => {
                  const meta = STATUS_META[p.status];
                  const Icon = meta.icon;
                  const active = p.id === selectedId;
                  return (
                    <li key={p.id}>
                      <button
                        onClick={() => setSelectedId(p.id)}
                        className={cn(
                          "w-full text-left px-3 py-2 hover:bg-muted/60 transition-colors flex items-start gap-2",
                          active && "bg-background border-l-2 border-l-primary",
                        )}
                      >
                        <Icon className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", meta.cls)} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            {p.is_home && <Home className="h-3 w-3 text-primary shrink-0" />}
                            <span className="text-xs font-medium truncate">
                              {p.title || p.path || p.slug}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate font-mono">
                            {p.path}
                          </p>
                          {p.status === "failed" && p.error && (
                            <p className="text-[10px] text-destructive truncate" title={p.error}>
                              {p.error}
                            </p>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </ScrollArea>
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* Editor + preview da página seleccionada */}
      <ResizablePanel defaultSize={78} minSize={40}>
        {!selected ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            {pages.length === 0
              ? isCloning
                ? "A descobrir páginas…"
                : "Sem páginas"
              : "Selecciona uma página à esquerda"}
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between gap-3 px-3 py-2 border-b bg-background">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <FileCode2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium truncate">
                    {selected.title || selected.path}
                  </span>
                  {selected.is_home && (
                    <Badge variant="outline" className="h-5 text-[10px]">
                      Home
                    </Badge>
                  )}
                </div>
                <a
                  href={selected.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-muted-foreground hover:underline inline-flex items-center gap-1"
                >
                  {selected.source_url} <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] text-muted-foreground">
                  {(selected.bytes / 1024).toFixed(1)} KB
                </span>
                {dirty && <Badge variant="secondary" className="text-[10px]">Não guardado</Badge>}
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={!dirty || saving || selected.status !== "completed"}
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                  Guardar página
                </Button>
              </div>
            </div>

            {selected.status !== "completed" ? (
              <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground p-6 text-center">
                {selected.status === "failed" ? (
                  <div className="space-y-2">
                    <XCircle className="h-8 w-8 text-destructive mx-auto" />
                    <p className="font-medium text-foreground">Falha ao clonar esta página</p>
                    {selected.error && <p className="text-xs">{selected.error}</p>}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    <p>A clonar esta página…</p>
                  </div>
                )}
              </div>
            ) : (
              <ResizablePanelGroup direction="horizontal" className="flex-1">
                <ResizablePanel defaultSize={45} minSize={25}>
                  <BuilderCodeEditor
                    value={draftHtml}
                    onChange={(v) => {
                      setDraftHtml(v);
                      setDirty(v !== (selected.html ?? ""));
                    }}
                    saveState={dirty ? "dirty" : saving ? "saving" : "idle"}
                  />
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={55} minSize={30}>
                  <BuilderPreviewFrame html={draftHtml} />
                </ResizablePanel>
              </ResizablePanelGroup>
            )}
          </div>
        )}
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
