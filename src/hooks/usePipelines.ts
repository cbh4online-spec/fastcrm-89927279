import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useCallback } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { toast } from "sonner";

export interface Pipeline {
  id: string;
  workspace_id: string;
  name: string;
  type: string | null;
  description: string | null;
  is_default: boolean;
  code: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePipelineInput {
  name: string;
  type?: string;
  description?: string;
  is_default?: boolean;
}

export interface UpdatePipelineInput extends Partial<CreatePipelineInput> {
  id: string;
}

const STORAGE_KEY = "active_pipeline_id";

/** Lista pipelines do workspace ativo. */
export function usePipelines() {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["pipelines", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];
      const { data, error } = await workspaceClient
        .from("pipelines")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Pipeline[];
    },
    enabled: !!currentWorkspace,
  });
}

/** Retorna o pipeline atualmente selecionado (persistido em localStorage). */
export function useActivePipeline() {
  const { currentWorkspace } = useWorkspace();
  const { data: pipelines } = usePipelines();
  const wsKey = currentWorkspace?.id ? `${STORAGE_KEY}:${currentWorkspace.id}` : STORAGE_KEY;

  const [activeId, setActiveIdState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(wsKey);
  });

  // Quando muda o workspace, recarrega
  useEffect(() => {
    if (typeof window !== "undefined") {
      setActiveIdState(localStorage.getItem(wsKey));
    }
  }, [wsKey]);

  // Se nada selecionado, usa o default
  useEffect(() => {
    if (!pipelines?.length) return;
    const valid = activeId && pipelines.some((p) => p.id === activeId);
    if (!valid) {
      const def = pipelines.find((p) => p.is_default) || pipelines[0];
      if (def) {
        setActiveIdState(def.id);
        try { localStorage.setItem(wsKey, def.id); } catch {}
      }
    }
  }, [pipelines, activeId, wsKey]);

  const setActiveId = useCallback((id: string | null) => {
    setActiveIdState(id);
    try {
      if (id) localStorage.setItem(wsKey, id);
      else localStorage.removeItem(wsKey);
    } catch {}
  }, [wsKey]);

  const activePipeline = pipelines?.find((p) => p.id === activeId) || null;

  return { activeId, activePipeline, setActiveId, pipelines: pipelines || [] };
}

export function useCreatePipeline() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async (input: CreatePipelineInput) => {
      if (!currentWorkspace) throw new Error("Sem workspace");
      const { data, error } = await workspaceClient
        .from("pipelines")
        .insert({
          workspace_id: currentWorkspace.id,
          name: input.name,
          type: input.type || "sales",
          description: input.description || null,
          is_default: input.is_default || false,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Pipeline;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipelines", currentWorkspace?.id] });
      toast.success("Pipeline criado");
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao criar pipeline"),
  });
}

export function useUpdatePipeline() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async (input: UpdatePipelineInput) => {
      const { id, ...updates } = input;
      const { data, error } = await workspaceClient
        .from("pipelines")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Pipeline;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipelines", currentWorkspace?.id] });
      toast.success("Pipeline atualizado");
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao atualizar pipeline"),
  });
}

export function useDeletePipeline() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await workspaceClient.from("pipelines").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipelines", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["pipeline_stages"] });
      toast.success("Pipeline removido");
    },
    onError: (e: Error) => {
      if (e.message?.includes("foreign key")) {
        toast.error("Não é possível remover: existem oportunidades associadas");
      } else {
        toast.error(e.message || "Erro ao remover pipeline");
      }
    },
  });
}
