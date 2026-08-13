import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

const db = supabase as any;

export type StockCountStatus = "draft" | "counting" | "review" | "closed" | "cancelled";
export type StockCountScope = "all" | "category" | "location" | "products";

export interface StockCount {
  id: string;
  workspace_id: string;
  name: string;
  scope_type: StockCountScope;
  scope_category: string | null;
  scope_product_ids: string[] | null;
  location_id: string | null;
  status: StockCountStatus;
  blind_count: boolean;
  notes: string | null;
  started_at: string | null;
  closed_at: string | null;
  created_by: string | null;
  closed_by: string | null;
  total_items: number;
  counted_items: number;
  variance_items: number;
  variance_value: number;
  created_at: string;
  updated_at: string;
}

export interface StockCountItem {
  id: string;
  count_id: string;
  workspace_id: string;
  product_id: string;
  variant_id: string | null;
  sku: string | null;
  product_name: string;
  category: string | null;
  expected_qty: number;
  counted_qty: number | null;
  unit_cost: number;
  notes: string | null;
  counted_by: string | null;
  counted_at: string | null;
}

export const STATUS_LABELS: Record<StockCountStatus, string> = {
  draft: "Rascunho",
  counting: "Em contagem",
  review: "Em revisão",
  closed: "Fechada",
  cancelled: "Cancelada",
};

export const SCOPE_LABELS: Record<StockCountScope, string> = {
  all: "Inventário total",
  category: "Por categoria",
  location: "Por localização",
  products: "Produtos selecionados",
};

/* ───────────────────────── Listagem ───────────────────────── */

export function useStockCounts() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["stock-counts", wsId],
    enabled: !!wsId,
    queryFn: async (): Promise<StockCount[]> => {
      const { data, error } = await db
        .from("stock_counts")
        .select("*")
        .eq("workspace_id", wsId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as StockCount[];
    },
  });
}

export function useStockCount(countId?: string) {
  return useQuery({
    queryKey: ["stock-count", countId],
    enabled: !!countId,
    queryFn: async (): Promise<StockCount | null> => {
      const { data, error } = await db.from("stock_counts").select("*").eq("id", countId).maybeSingle();
      if (error) throw error;
      return (data as StockCount) ?? null;
    },
  });
}

export function useStockCountItems(countId?: string) {
  return useQuery({
    queryKey: ["stock-count-items", countId],
    enabled: !!countId,
    queryFn: async (): Promise<StockCountItem[]> => {
      const { data, error } = await db
        .from("stock_count_items")
        .select("*")
        .eq("count_id", countId)
        .order("product_name", { ascending: true });
      if (error) throw error;
      return (data || []) as StockCountItem[];
    },
  });
}

/* ───────────────────────── Mutations ───────────────────────── */

export interface CreateStockCountInput {
  name: string;
  scope_type: StockCountScope;
  scope_category?: string | null;
  scope_product_ids?: string[] | null;
  location_id?: string | null;
  blind_count: boolean;
  notes?: string | null;
}

export function useCreateStockCount() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateStockCountInput): Promise<StockCount> => {
      if (!currentWorkspace?.id) throw new Error("Workspace não definido");
      const { data: userRes } = await supabase.auth.getUser();
      const { data, error } = await db
        .from("stock_counts")
        .insert({
          workspace_id: currentWorkspace.id,
          name: input.name.trim(),
          scope_type: input.scope_type,
          scope_category: input.scope_type === "category" ? input.scope_category : null,
          scope_product_ids: input.scope_type === "products" ? input.scope_product_ids ?? [] : null,
          location_id: input.location_id || null,
          blind_count: input.blind_count,
          notes: input.notes || null,
          created_by: userRes?.user?.id ?? null,
        })
        .select("*")
        .single();
      if (error) throw error;

      const { error: genError } = await db.rpc("generate_stock_count_items", { _count_id: data.id });
      if (genError) throw genError;

      return data as StockCount;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-counts"] });
    },
  });
}

export function useRegenerateStockCountItems(countId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await db.rpc("generate_stock_count_items", { _count_id: countId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-count-items", countId] });
      qc.invalidateQueries({ queryKey: ["stock-count", countId] });
    },
  });
}

export function useCloseStockCount(countId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await db.rpc("close_stock_count", { _count_id: countId });
      if (error) throw error;
      return data as { adjustments: number; variance_value: number };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-count", countId] });
      qc.invalidateQueries({ queryKey: ["stock-count-items", countId] });
      qc.invalidateQueries({ queryKey: ["stock-counts"] });
      qc.invalidateQueries({ queryKey: ["inventory-valuation"] });
      qc.invalidateQueries({ queryKey: ["inventory-summary"] });
    },
  });
}

export function useUpdateStockCount(countId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Pick<StockCount, "name" | "notes" | "status" | "blind_count">>) => {
      const { error } = await db.from("stock_counts").update(patch).eq("id", countId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-count", countId] });
      qc.invalidateQueries({ queryKey: ["stock-counts"] });
    },
  });
}

/* ─────────────── Submissão com fila offline ─────────────── */

interface QueuedCount {
  productId: string;
  qty: number;
  notes?: string | null;
}

const queueKey = (countId: string) => `stock-count:queue:${countId}`;

function readQueue(countId: string): QueuedCount[] {
  try {
    const raw = window.localStorage.getItem(queueKey(countId));
    return raw ? (JSON.parse(raw) as QueuedCount[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(countId: string, items: QueuedCount[]) {
  try {
    window.localStorage.setItem(queueKey(countId), JSON.stringify(items));
  } catch {
    /* quota — ignorar */
  }
}

/**
 * Regista contagens de itens com atualização otimista e fila local:
 * se a rede falhar, a contagem fica guardada e é reenviada automaticamente.
 */
export function useSubmitStockCountItem(countId?: string) {
  const qc = useQueryClient();
  const [pending, setPending] = useState<number>(() => (countId ? readQueue(countId).length : 0));
  const flushing = useRef(false);

  const send = useCallback(
    async (entry: QueuedCount) => {
      const { error } = await db.rpc("submit_stock_count_item", {
        _count_id: countId,
        _product_id: entry.productId,
        _qty: entry.qty,
        _notes: entry.notes ?? null,
      });
      if (error) throw error;
    },
    [countId],
  );

  const flush = useCallback(async () => {
    if (!countId || flushing.current) return;
    const queue = readQueue(countId);
    if (!queue.length) return;
    flushing.current = true;
    const remaining: QueuedCount[] = [];
    for (const entry of queue) {
      try {
        await send(entry);
      } catch {
        remaining.push(entry);
      }
    }
    writeQueue(countId, remaining);
    setPending(remaining.length);
    flushing.current = false;
    if (remaining.length === 0) {
      qc.invalidateQueries({ queryKey: ["stock-count-items", countId] });
      qc.invalidateQueries({ queryKey: ["stock-count", countId] });
    }
  }, [countId, qc, send]);

  useEffect(() => {
    if (!countId) return;
    setPending(readQueue(countId).length);
    void flush();
    const onOnline = () => void flush();
    window.addEventListener("online", onOnline);
    const timer = window.setInterval(() => void flush(), 20000);
    return () => {
      window.removeEventListener("online", onOnline);
      window.clearInterval(timer);
    };
  }, [countId, flush]);

  const submit = useCallback(
    async (entry: QueuedCount) => {
      if (!countId) return;

      // Atualização otimista da cache local
      qc.setQueryData<StockCountItem[]>(["stock-count-items", countId], (old) =>
        (old || []).map((it) =>
          it.product_id === entry.productId
            ? { ...it, counted_qty: entry.qty, notes: entry.notes ?? it.notes, counted_at: new Date().toISOString() }
            : it,
        ),
      );

      try {
        await send(entry);
        qc.invalidateQueries({ queryKey: ["stock-count", countId] });
      } catch (err: any) {
        const queue = readQueue(countId).filter((q) => q.productId !== entry.productId);
        queue.push(entry);
        writeQueue(countId, queue);
        setPending(queue.length);
        toast.warning("Sem ligação — contagem guardada e será sincronizada.");
      }
    },
    [countId, qc, send],
  );

  return { submit, pendingCount: pending, flush };
}

/* ───────────────────────── Localizações ───────────────────────── */

export function useStockLocations() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  return useQuery({
    queryKey: ["stock-locations", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await db
        .from("product_stock_locations")
        .select("id, name, code, is_default")
        .eq("workspace_id", wsId)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data || []) as { id: string; name: string; code: string | null; is_default: boolean }[];
    },
  });
}

/* ───────────────────────── Derivados ───────────────────────── */

export function useStockCountProgress(items: StockCountItem[]) {
  return useMemo(() => {
    const counted = items.filter((i) => i.counted_qty !== null);
    const variances = counted.filter((i) => i.counted_qty !== i.expected_qty);
    const varianceValue = variances.reduce(
      (acc, i) => acc + ((i.counted_qty ?? 0) - i.expected_qty) * (Number(i.unit_cost) || 0),
      0,
    );
    return {
      total: items.length,
      counted: counted.length,
      pending: items.length - counted.length,
      variances: variances.length,
      varianceValue,
      progress: items.length ? Math.round((counted.length / items.length) * 100) : 0,
    };
  }, [items]);
}
