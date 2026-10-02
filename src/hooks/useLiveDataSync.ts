import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

/**
 * Mantém o ecrã atualizado sem refresh: escuta alterações (via RLS) no catálogo,
 * CRM e sincronização e invalida as queries correspondentes, com debounce para
 * não sobrecarregar durante operações em massa.
 */
const TABLES: { table: string; scoped: boolean; keys: string[] }[] = [
  { table: "products", scoped: true, keys: ["products", "product", "store-products"] },
  { table: "product_tags", scoped: true, keys: ["product-tags", "workspace-tags", "products"] },
  { table: "product_ai_commerce", scoped: false, keys: ["product-ai-commerce", "products"] },
  { table: "product_spec_attributes", scoped: false, keys: ["product", "products"] },
  { table: "product_relations", scoped: false, keys: ["product-relations", "products"] },
  { table: "product_bundles", scoped: false, keys: ["product-bundles"] },
  { table: "leads", scoped: true, keys: ["leads", "smart-leads", "lead"] },
  { table: "contacts", scoped: true, keys: ["contacts", "contact"] },
  { table: "companies", scoped: true, keys: ["companies", "company"] },
  { table: "mymia_crm_sync_runs", scoped: true, keys: ["mymia-crm-sync-runs", "mymia-crm-sync-settings", "mymia-crm-state-counts", "mymia-crm-linked-count"] },
  { table: "mymia_crm_sync_logs", scoped: true, keys: ["mymia-crm-sync-logs"] },
];

export function useLiveDataSync() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  useEffect(() => {
    if (!workspaceId) return;
    const pending = new Set<string>();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const flush = () => {
      timer = null;
      pending.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      pending.clear();
    };

    let channel = supabase.channel(`live-sync-${workspaceId}`);
    for (const t of TABLES) {
      channel = channel.on(
        "postgres_changes" as any,
        {
          event: "*",
          schema: "public",
          table: t.table,
          ...(t.scoped ? { filter: `workspace_id=eq.${workspaceId}` } : {}),
        },
        () => {
          t.keys.forEach((k) => pending.add(k));
          if (!timer) timer = setTimeout(flush, 800);
        },
      );
    }
    channel.subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [workspaceId, qc]);
}
