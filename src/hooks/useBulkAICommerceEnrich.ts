/**
 * Enriquecimento em massa com o motor AI Commerce.
 *
 * Processa produtos em série (com pausa entre pedidos para respeitar os limites
 * de cadência da IA), guarda o conteúdo estruturado em `products` e na camada
 * `product_ai_commerce`, e recalcula o estado de prontidão.
 *
 * Nunca escreve preços, stock, GTIN ou MPN — apenas conteúdo descritivo/semântico.
 */
import { useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { getPublicBaseUrl } from "@/utils/getPublicDomain";
import type { AICommerceSuggestion } from "@/components/products/AICommerceAssistantPanel";

export interface BulkEnrichTarget {
  id: string;
  name: string;
  sku?: string | null;
}

export type BulkEnrichItemStatus = "pending" | "running" | "done" | "skipped" | "error";

export interface BulkEnrichItem extends BulkEnrichTarget {
  status: BulkEnrichItemStatus;
  message?: string;
  fieldsFilled?: number;
}

export interface BulkEnrichOptions {
  /** true = reescreve campos já preenchidos; false = só preenche vazios. */
  overwrite: boolean;
  /** Ativa a camada AI Commerce nos produtos processados. */
  enableAICommerce: boolean;
}

const DELAY_MS = 1200;

const ERROR_MESSAGES: Record<string, string> = {
  rate_limited: "Limite de pedidos atingido",
  no_credits: "Sem créditos de IA",
  ai_not_configured: "IA não configurada",
  invalid_product: "Dados insuficientes",
  not_found: "Produto não encontrado",
  unauthorized: "Sem permissão",
};

const PRODUCT_TEXT_FIELDS = [
  "short_description",
  "commercial_description",
  "target_audience",
  "problem_solved",
  "seo_title",
  "seo_description",
  "category",
] as const;

const PRODUCT_LIST_FIELDS = ["main_benefits", "features", "use_cases"] as const;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

export function useBulkAICommerceEnrich() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const cancelRef = useRef(false);

  const [items, setItems] = useState<BulkEnrichItem[]>([]);
  const [running, setRunning] = useState(false);

  const patchItem = useCallback((id: string, patch: Partial<BulkEnrichItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }, []);

  const cancel = useCallback(() => {
    cancelRef.current = true;
  }, []);

  const reset = useCallback(() => {
    cancelRef.current = false;
    setItems([]);
    setRunning(false);
  }, []);

  const start = useCallback(
    async (targets: BulkEnrichTarget[], options: BulkEnrichOptions) => {
      if (!currentWorkspace?.id || targets.length === 0 || running) return;

      cancelRef.current = false;
      setRunning(true);
      setItems(targets.map((t) => ({ ...t, status: "pending" as BulkEnrichItemStatus })));

      const baseUrl = getPublicBaseUrl();

      for (let index = 0; index < targets.length; index += 1) {
        if (cancelRef.current) {
          setItems((prev) =>
            prev.map((it) =>
              it.status === "pending" ? { ...it, status: "skipped", message: "Cancelado" } : it,
            ),
          );
          break;
        }

        const target = targets[index];
        patchItem(target.id, { status: "running" });

        try {
          const { data, error: fnError } = await supabase.functions.invoke("ai-commerce-autofill", {
            body: { productId: target.id, baseUrl },
          });

          const code = (data as { error?: string } | null)?.error;
          const suggestion = (data as { suggestion?: AICommerceSuggestion } | null)?.suggestion;

          if (fnError || code || !suggestion) {
            patchItem(target.id, {
              status: "error",
              message: (code && ERROR_MESSAGES[code]) || fnError?.message || "Falha ao gerar conteúdo",
            });
            await sleep(DELAY_MS);
            continue;
          }

          // Estado atual do produto — necessário para respeitar campos manuais.
          const { data: current, error: readError } = await supabase
            .from("products")
            .select(
              "id, workspace_id, category, short_description, commercial_description, target_audience, problem_solved, seo_title, seo_description, main_benefits, features, use_cases, schema_type",
            )
            .eq("id", target.id)
            .maybeSingle();

          if (readError || !current) {
            patchItem(target.id, { status: "error", message: "Produto indisponível" });
            await sleep(DELAY_MS);
            continue;
          }

          const row = current as unknown as Record<string, unknown>;

          const proposed: Record<string, unknown> = {
            category: suggestion.ai_category,
            short_description: suggestion.ai_short_description,
            commercial_description: suggestion.ai_long_description,
            target_audience: suggestion.ai_target_audience,
            problem_solved: suggestion.ai_problem_solved,
            seo_title: suggestion.seo_title,
            seo_description: suggestion.seo_description,
            main_benefits: suggestion.main_benefits,
            features: suggestion.ai_key_features,
            use_cases: suggestion.ai_use_cases,
          };

          const update: Record<string, unknown> = {};
          for (const field of [...PRODUCT_TEXT_FIELDS, ...PRODUCT_LIST_FIELDS]) {
            const value = proposed[field];
            if (isEmpty(value)) continue;
            if (!options.overwrite && !isEmpty(row[field])) continue;
            update[field] = value;
          }
          if (suggestion.schema_type && (options.overwrite || isEmpty(row.schema_type))) {
            update.schema_type = suggestion.schema_type;
          }

          if (Object.keys(update).length > 0) {
            const { error: updateError } = await supabase
              .from("products")
              .update(update as never)
              .eq("id", target.id);
            if (updateError) {
              patchItem(target.id, { status: "error", message: updateError.message });
              await sleep(DELAY_MS);
              continue;
            }
          }

          const { error: aiError } = await supabase.from("product_ai_commerce").upsert(
            {
              workspace_id: (row.workspace_id as string) ?? currentWorkspace.id,
              product_id: target.id,
              ...(options.enableAICommerce ? { ai_commerce_enabled: true } : {}),
              ai_title: suggestion.ai_title || null,
              ai_category: suggestion.ai_category || null,
              ai_short_description: suggestion.ai_short_description || null,
              ai_long_description: suggestion.ai_long_description || null,
              ai_target_audience: suggestion.ai_target_audience || null,
              ai_problem_solved: suggestion.ai_problem_solved || null,
              ai_use_cases: suggestion.ai_use_cases,
              ai_key_features: suggestion.ai_key_features,
              ai_keywords: suggestion.ai_keywords,
              ai_recommendation_context: suggestion.ai_recommendation_context || null,
              ai_exclusions: suggestion.ai_exclusions || null,
              ai_faq: suggestion.ai_faq,
              ai_last_validation: new Date().toISOString(),
            } as never,
            { onConflict: "product_id" },
          );

          if (aiError) {
            patchItem(target.id, { status: "error", message: aiError.message });
            await sleep(DELAY_MS);
            continue;
          }

          patchItem(target.id, { status: "done", fieldsFilled: Object.keys(update).length });
        } catch (e) {
          patchItem(target.id, {
            status: "error",
            message: e instanceof Error ? e.message : "Erro inesperado",
          });
        }

        await sleep(DELAY_MS);
      }

      setRunning(false);
      qc.invalidateQueries({ queryKey: ["ai-commerce-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["store-admin-products"] });
    },
    [currentWorkspace?.id, patchItem, qc, running],
  );

  const total = items.length;
  const processed = items.filter((i) => i.status !== "pending" && i.status !== "running").length;
  const succeeded = items.filter((i) => i.status === "done").length;
  const failed = items.filter((i) => i.status === "error").length;

  return {
    items,
    running,
    total,
    processed,
    succeeded,
    failed,
    progress: total === 0 ? 0 : Math.round((processed / total) * 100),
    start,
    cancel,
    reset,
  };
}
