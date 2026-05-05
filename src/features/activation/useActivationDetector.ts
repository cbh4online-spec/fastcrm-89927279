import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useActivationProgress, useMarkGoal } from "./useActivation";
import { useBusinessContext } from "@/hooks/useBusinessContext";

/**
 * Deteta automaticamente metas concluídas com base em dados reais do workspace.
 * Corre uma vez por sessão / mudança de workspace.
 */
export function useActivationDetector() {
  const { currentWorkspace } = useWorkspace();
  const { data: progress } = useActivationProgress();
  const { data: businessContext } = useBusinessContext();
  const mark = useMarkGoal();
  const ranRef = useRef<string | null>(null);

  useEffect(() => {
    const wsId = currentWorkspace?.id;
    if (!wsId || !progress) return;
    if (ranRef.current === wsId) return;
    ranRef.current = wsId;

    const completed = new Set(progress.filter((p) => p.completed_at).map((p) => p.goal_key));

    const check = async (goalKey: string, predicate: () => Promise<boolean>) => {
      if (completed.has(goalKey)) return;
      try {
        if (await predicate()) {
          await mark.mutateAsync({ goalKey, source: "auto" });
        }
      } catch (e) {
        // silencioso — detecção é best-effort
      }
    };

    const countGte = async (table: string, min: number) => {
      const { count } = await supabase
        .from(table as any)
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", wsId);
      return (count ?? 0) >= min;
    };

    void (async () => {
      await check("business_context", async () => !!businessContext?.business_description);
      await check("create_pipeline", () => countGte("pipelines", 1));
      await check("invite_member", async () => {
        const { count } = await supabase
          .from("workspace_members" as any)
          .select("user_id", { count: "exact", head: true })
          .eq("workspace_id", wsId);
        return (count ?? 0) >= 2;
      });
      await check("first_contact", () => countGte("contacts", 5));
      await check("first_company", () => countGte("companies", 1));
      await check("first_deal", () => countGte("deals", 1));
      await check("connect_whatsapp", async () => {
        const { count } = await supabase
          .from("whatsapp_zapi_connections" as any)
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", wsId)
          .eq("status", "connected");
        return (count ?? 0) >= 1;
      });
      await check("first_product", () => countGte("products", 1));
    })();
  }, [currentWorkspace?.id, progress, businessContext, mark]);
}
