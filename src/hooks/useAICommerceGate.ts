/**
 * Gate de qualidade AI Commerce — configuração, avaliação e correções em massa.
 *
 * A avaliação apresentada no ecrã é calculada com o mesmo motor puro usado no
 * servidor; a decisão persistida (e aplicada à loja e aos feeds) vem sempre da
 * Edge Function `ai-commerce-gate`.
 */
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAICommerceProducts, type AICommerceProductRow } from "./useAICommerce";
import {
  DEFAULT_QUALITY_GATE_CONFIG,
  evaluateQualityGate,
  groupBlockers,
  normalizeGateConfig,
  type QualityGateConfig,
  type QualityGateResult,
} from "@/lib/ai-commerce/qualityGate";
import type { GateFixCode, GateFixDefaults } from "@/lib/ai-commerce/gateFixes";
import { DEFAULT_GATE_FIX_DEFAULTS } from "@/lib/ai-commerce/gateFixes";

export interface GateRow extends AICommerceProductRow {
  gate: QualityGateResult;
}

export function useGateConfig() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["ai-commerce-gate-config", workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<QualityGateConfig> => {
      const { data, error } = await supabase
        .from("ai_commerce_gate_config")
        .select("enabled, min_score, required_codes, block_store, block_feeds")
        .eq("workspace_id", workspaceId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return DEFAULT_QUALITY_GATE_CONFIG;
      return normalizeGateConfig({
        enabled: data.enabled,
        minScore: data.min_score,
        requiredCodes: data.required_codes ?? [],
        blockStore: data.block_store,
        blockFeeds: data.block_feeds,
      });
    },
  });

  const save = useMutation({
    mutationFn: async (patch: Partial<QualityGateConfig>) => {
      if (!workspaceId) throw new Error("Workspace indisponível");
      const next = normalizeGateConfig({ ...(query.data ?? DEFAULT_QUALITY_GATE_CONFIG), ...patch });
      const { error } = await supabase.from("ai_commerce_gate_config").upsert(
        {
          workspace_id: workspaceId,
          enabled: next.enabled,
          min_score: next.minScore,
          required_codes: next.requiredCodes,
          block_store: next.blockStore,
          block_feeds: next.blockFeeds,
          updated_at: new Date().toISOString(),
        } as never,
        { onConflict: "workspace_id" },
      );
      if (error) throw error;
      return next;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-commerce-gate-config", workspaceId] });
      toast.success("Regras do gate atualizadas. Reavalie para aplicar à loja.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { ...query, config: query.data ?? DEFAULT_QUALITY_GATE_CONFIG, save };
}

export function useQualityGate() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const qc = useQueryClient();
  const products = useAICommerceProducts();
  const { config, isLoading: configLoading, save } = useGateConfig();

  const rows = useMemo<GateRow[]>(
    () => (products.data || []).map((row) => ({ ...row, gate: evaluateQualityGate(row.readiness, config) })),
    [products.data, config],
  );

  const blockedRows = useMemo(() => rows.filter((r) => r.gate.status === "blocked"), [rows]);

  const stats = useMemo(() => {
    const published = rows.filter((r) => r.product.store_published === true);
    return {
      total: rows.length,
      blocked: blockedRows.length,
      passed: rows.length - blockedRows.length,
      blockedPublished: published.filter((r) => r.gate.status === "blocked").length,
      avgScore: rows.length ? Math.round(rows.reduce((s, r) => s + r.readiness.score, 0) / rows.length) : 0,
    };
  }, [rows, blockedRows]);

  const reasons = useMemo(
    () => groupBlockers(blockedRows.map((r) => ({ productId: r.product.id, blockers: r.gate.blockers }))),
    [blockedRows],
  );

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["ai-commerce-products", workspaceId] });
    qc.invalidateQueries({ queryKey: ["ai-commerce-gate-config", workspaceId] });
    qc.invalidateQueries({ queryKey: ["store-products"] });
  };

  const callGate = async (payload: Record<string, unknown>) => {
    if (!workspaceId) throw new Error("Workspace indisponível");
    const { data, error } = await supabase.functions.invoke("ai-commerce-gate", {
      body: { workspaceId, ...payload },
    });
    if (error) throw new Error(error.message);
    if (data && (data as { ok?: boolean }).ok === false) {
      throw new Error((data as { message?: string }).message || "Não foi possível concluir a operação.");
    }
    return data as Record<string, unknown>;
  };

  const recompute = useMutation({
    mutationFn: () => callGate({ action: "recompute" }),
    onSuccess: (data) => {
      invalidate();
      toast.success(`Gate reavaliado: ${data.passed ?? 0} aprovados, ${data.blocked ?? 0} bloqueados.`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const applyFixes = useMutation({
    mutationFn: (input: { fixes: GateFixCode[]; defaults?: GateFixDefaults; productIds?: string[] }) =>
      callGate({
        action: "fix",
        fixes: input.fixes,
        defaults: input.defaults ?? DEFAULT_GATE_FIX_DEFAULTS,
        productIds: input.productIds ?? null,
      }),
    onSuccess: (data) => {
      invalidate();
      toast.success(`${data.fixed ?? 0} produto(s) corrigido(s). Bloqueados: ${data.blocked ?? 0}.`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const unpublishBlocked = useMutation({
    mutationFn: () => callGate({ action: "unpublish_blocked" }),
    onSuccess: (data) => {
      invalidate();
      toast.success(`${data.unpublished ?? 0} produto(s) retirado(s) da loja.`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    config,
    saveConfig: save,
    rows,
    blockedRows,
    reasons,
    stats,
    isLoading: products.isLoading || configLoading,
    recompute,
    applyFixes,
    unpublishBlocked,
  };
}
