import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface DiscoveredPage {
  url: string;
  selected: boolean;
}

export interface DiscoverResult {
  sourceUrl: string;
  host: string;
  pages: string[];
  pagesCount: number;
  branding: { colors: string[]; fonts: string[]; logo: string | null };
}

export interface SiteCloneProgress {
  pages_total: number;
  pages_done: number;
  pages_failed: number;
  status: string;
}

export function useSiteClone() {
  const { currentWorkspace } = useWorkspace();
  const [discovering, setDiscovering] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [discovery, setDiscovery] = useState<DiscoverResult | null>(null);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [progress, setProgress] = useState<SiteCloneProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setDiscovery(null);
    setSiteId(null);
    setAssetId(null);
    setProgress(null);
    setError(null);
    setDiscovering(false);
    setCloning(false);
  }, []);

  const discover = useCallback(
    async (url: string, includeSubdomains = false) => {
      setError(null);
      setDiscovering(true);
      setDiscovery(null);
      try {
        const { data, error } = await supabase.functions.invoke("builder-site-discover", {
          body: { url, includeSubdomains },
        });
        if (error) throw error;
        const payload = data as DiscoverResult & { error?: string };
        if (payload?.error) throw new Error(payload.error);
        setDiscovery(payload);
        return payload;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Falha na descoberta";
        setError(msg);
        throw e;
      } finally {
        setDiscovering(false);
      }
    },
    [],
  );

  const startClone = useCallback(
    async (params: {
      sourceUrl: string;
      pages: string[];
      name?: string;
      keepScripts?: boolean;
      includeSubdomains?: boolean;
      designTokens?: Record<string, unknown>;
    }) => {
      if (!currentWorkspace?.id) throw new Error("Workspace não selecionado");
      setError(null);
      setCloning(true);
      setProgress({ pages_total: params.pages.length, pages_done: 0, pages_failed: 0, status: "queued" });
      try {
        const { data, error } = await supabase.functions.invoke("builder-site-clone", {
          body: {
            workspace_id: currentWorkspace.id,
            source_url: params.sourceUrl,
            pages: params.pages,
            options: {
              name: params.name,
              keepScripts: !!params.keepScripts,
              includeSubdomains: !!params.includeSubdomains,
              design_tokens: params.designTokens,
            },
          },
        });
        if (error) throw error;
        const payload = data as { site_id?: string; asset_id?: string; pages_total?: number; error?: string };
        if (payload?.error) throw new Error(payload.error);
        if (!payload.site_id) throw new Error("Resposta inválida");
        setSiteId(payload.site_id);
        setAssetId(payload.asset_id ?? null);
        return payload;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Falha ao iniciar clone";
        setError(msg);
        setCloning(false);
        throw e;
      }
    },
    [currentWorkspace?.id],
  );

  // Realtime subscription on builder_sites for progress
  useEffect(() => {
    if (!siteId) return;
    const channel = supabase
      .channel(`builder-site-${siteId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "builder_sites", filter: `id=eq.${siteId}` },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          setProgress({
            pages_total: Number(row.pages_total ?? 0),
            pages_done: Number(row.pages_done ?? 0),
            pages_failed: Number(row.pages_failed ?? 0),
            status: String(row.status ?? "cloning"),
          });
          if (row.status === "completed" || row.status === "failed") {
            setCloning(false);
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [siteId]);

  return {
    discovering,
    cloning,
    discovery,
    siteId,
    assetId,
    progress,
    error,
    discover,
    startClone,
    reset,
  };
}
