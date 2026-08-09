import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  buildOverrideMap,
  type MenuItemType,
  type MenuOverride,
  type MenuOverrideMap,
  type MenuVisibility,
} from "@/config/menuOverrides";
import { toast } from "sonner";

const KEY = "workspace-menu-overrides";

async function fetchOverrides(workspaceId: string): Promise<MenuOverride[]> {
  const { data, error } = await supabase
    .from("workspace_menu_overrides")
    .select("item_type, item_key, visibility")
    .eq("workspace_id", workspaceId);
  if (error) {
    console.warn("[useWorkspaceMenuOverrides]", error.message);
    return [];
  }
  return (data ?? []) as MenuOverride[];
}

/** Overrides da workspace activa — consumido pelas sidebars e pesquisa global. */
export function useMenuOverrideMap(): { map: MenuOverrideMap; isLoading: boolean } {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  const { data = [], isLoading } = useQuery({
    queryKey: [KEY, wsId],
    enabled: !!wsId,
    staleTime: 60_000,
    queryFn: () => fetchOverrides(wsId!),
  });

  const map = useMemo(() => buildOverrideMap(data), [data]);
  return { map, isLoading };
}

/** Leitura + escrita para o backoffice de Super Admin (workspace escolhida). */
export function useWorkspaceMenuOverridesAdmin(workspaceId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [KEY, workspaceId],
    enabled: !!workspaceId,
    staleTime: 10_000,
    queryFn: () => fetchOverrides(workspaceId!),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: [KEY, workspaceId] });

  const setVisibility = useMutation({
    mutationFn: async (input: {
      itemType: MenuItemType;
      itemKey: string;
      visibility: MenuVisibility;
    }) => {
      if (!workspaceId) throw new Error("Workspace não seleccionada");

      const { error } = await supabase
        .from("workspace_menu_overrides")
        .upsert(
          {
            workspace_id: workspaceId,
            item_type: input.itemType,
            item_key: input.itemKey,
            visibility: input.visibility,
          },
          { onConflict: "workspace_id,item_type,item_key" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Definição guardada");
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Erro ao guardar definição de menu"),
  });

  /** Remove a regra própria — o item volta a herdar do nível acima. */
  const clearOverride = useMutation({
    mutationFn: async (input: { itemType: MenuItemType; itemKey: string }) => {
      if (!workspaceId) throw new Error("Workspace não seleccionada");
      const { error } = await supabase
        .from("workspace_menu_overrides")
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("item_type", input.itemType)
        .eq("item_key", input.itemKey);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Regra removida (passa a herdar)");
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Erro ao remover regra"),
  });

  const setBulk = useMutation({
    mutationFn: async (
      items: Array<{ itemType: MenuItemType; itemKey: string; visibility: MenuVisibility }>,
    ) => {
      if (!workspaceId) throw new Error("Workspace não seleccionada");
      if (items.length === 0) return;

      const { error } = await supabase.from("workspace_menu_overrides").upsert(
        items.map((i) => ({
          workspace_id: workspaceId,
          item_type: i.itemType,
          item_key: i.itemKey,
          visibility: i.visibility,
        })),
        { onConflict: "workspace_id,item_type,item_key" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Menus actualizados");
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Erro ao guardar menus"),
  });

  const resetAll = useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error("Workspace não seleccionada");
      const { error } = await supabase
        .from("workspace_menu_overrides")
        .delete()
        .eq("workspace_id", workspaceId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Predefinições repostas");
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Erro ao repor predefinições"),
  });

  const map = useMemo(() => buildOverrideMap(query.data ?? []), [query.data]);

  return {
    overrides: query.data ?? [],
    map,
    isLoading: query.isLoading,
    error: query.error,
    setVisibility,
    setBulk,
    resetAll,
  };
}
