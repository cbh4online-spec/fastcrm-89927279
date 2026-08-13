import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { normalizeSlug } from "@/schemas/checkout/funnelSchema";

const sb = supabase as any;

/** Verifica se o slug já existe no workspace (opcionalmente ignorando um funil). */
export async function isSlugTaken(workspaceId: string, slug: string, ignoreId?: string) {
  let q = sb.from("checkout_funnels").select("id").eq("workspace_id", workspaceId).eq("slug", slug);
  if (ignoreId) q = q.neq("id", ignoreId);
  const { data, error } = await q.limit(1);
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

export function useCheckoutFunnels() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  const wid = currentWorkspace?.id;

  const funnels = useQuery({
    queryKey: ["checkout-funnels", wid],
    queryFn: async () => {
      const { data, error } = await sb
        .from("checkout_funnels")
        .select("*, steps:checkout_funnel_steps(id), bumps:checkout_order_bumps(id)")
        .eq("workspace_id", wid)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((f: any) => ({
        ...f,
        steps_count: f.steps?.length ?? 0,
        bumps_count: f.bumps?.length ?? 0,
      }));
    },
    enabled: !!wid,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["checkout-funnels", wid] });

  const createFunnel = useMutation({
    mutationFn: async (payload: { name: string; slug: string; description?: string }) => {
      const slug = normalizeSlug(payload.slug);
      if (await isSlugTaken(wid!, slug)) throw new Error("Já existe um funil com este slug neste workspace");
      const { data, error } = await sb
        .from("checkout_funnels")
        .insert({ ...payload, slug, workspace_id: wid })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { invalidate(); toast.success("Funil criado"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateFunnel = useMutation({
    mutationFn: async ({ id, silent, ...payload }: { id: string; silent?: boolean; name?: string; slug?: string; description?: string; is_active?: boolean; settings?: any }) => {
      if (payload.slug) {
        const slug = normalizeSlug(payload.slug);
        if (await isSlugTaken(wid!, slug, id)) throw new Error("Já existe um funil com este slug neste workspace");
        payload.slug = slug;
      }
      const { data, error } = await sb.from("checkout_funnels").update(payload).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars: any) => {
      invalidate();
      qc.invalidateQueries({ queryKey: ["checkout-funnel", vars.id] });
      if (!vars?.silent) toast.success("Funil atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const duplicateFunnel = useMutation({
    mutationFn: async (funnel: any) => {
      let slug = normalizeSlug(`${funnel.slug}-copia`);
      let i = 2;
      while (await isSlugTaken(wid!, slug)) {
        slug = normalizeSlug(`${funnel.slug}-copia-${i++}`);
      }
      const { data: created, error } = await sb
        .from("checkout_funnels")
        .insert({
          workspace_id: wid,
          name: `${funnel.name} (cópia)`,
          slug,
          description: funnel.description,
          is_active: false,
          settings: funnel.settings ?? {},
        })
        .select()
        .single();
      if (error) throw error;

      const { data: steps } = await sb.from("checkout_funnel_steps").select("*").eq("funnel_id", funnel.id);
      if (steps?.length) {
        await sb.from("checkout_funnel_steps").insert(
          steps.map((s: any) => ({
            workspace_id: wid,
            funnel_id: created.id,
            step_type: s.step_type,
            step_order: s.step_order,
            offer_id: s.offer_id,
            config: s.config ?? {},
          })),
        );
      }

      const { data: bumps } = await sb.from("checkout_order_bumps").select("*").eq("funnel_id", funnel.id);
      if (bumps?.length) {
        await sb.from("checkout_order_bumps").insert(
          bumps.map((b: any) => ({
            workspace_id: wid,
            funnel_id: created.id,
            offer_id: b.offer_id,
            position: b.position,
            display_order: b.display_order,
            conditions: b.conditions ?? {},
            is_active: b.is_active,
          })),
        );
      }
      return created;
    },
    onSuccess: () => { invalidate(); toast.success("Funil duplicado (inativo)"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteFunnel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("checkout_funnels").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Funil eliminado"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return { funnels, createFunnel, updateFunnel, duplicateFunnel, deleteFunnel };
}

export function useCheckoutFunnel(funnelId?: string) {
  return useQuery({
    queryKey: ["checkout-funnel", funnelId],
    queryFn: async () => {
      const { data, error } = await sb.from("checkout_funnels").select("*").eq("id", funnelId).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!funnelId,
  });
}

export function useCheckoutFunnelSteps(funnelId?: string) {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  const wid = currentWorkspace?.id;
  const key = ["checkout-funnel-steps", funnelId];

  const steps = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await sb
        .from("checkout_funnel_steps")
        .select("*, offer:checkout_offers(*)")
        .eq("funnel_id", funnelId)
        .order("step_order");
      if (!error) return data ?? [];

      // Fallback sem embed (ex.: relação em falta na cache do esquema)
      const { data: rows, error: rowsError } = await sb
        .from("checkout_funnel_steps")
        .select("*")
        .eq("funnel_id", funnelId)
        .order("step_order");
      if (rowsError) throw rowsError;

      const offerIds = [...new Set((rows ?? []).map((r: any) => r.offer_id).filter(Boolean))];
      let offersById: Record<string, any> = {};
      if (offerIds.length) {
        const { data: offers } = await sb.from("checkout_offers").select("*").in("id", offerIds);
        offersById = Object.fromEntries((offers ?? []).map((o: any) => [o.id, o]));
      }
      return (rows ?? []).map((r: any) => ({ ...r, offer: r.offer_id ? offersById[r.offer_id] ?? null : null }));
    },
    enabled: !!funnelId,
  });


  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const upsertStep = useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await sb
        .from("checkout_funnel_steps")
        .upsert({ ...payload, workspace_id: wid, funnel_id: funnelId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });

  const removeStep = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("checkout_funnel_steps").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Passo removido"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return { steps, upsertStep, removeStep };
}
