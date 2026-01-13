import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { useAuth } from "@/contexts/AuthContext";
import { Lead } from "./useLeads";

export type OpportunityStatus = "open" | "won" | "lost";

export interface Opportunity {
  id: string;
  workspace_id: string;
  lead_id: string | null;
  title: string;
  value: number;
  stage_id: string;
  owner_id: string;
  status: OpportunityStatus;
  created_at: string;
  updated_at: string;
  lead?: Lead | null;
}

export interface CreateOpportunityInput {
  title: string;
  lead_id?: string;
  value?: number;
  stage_id: string;
  status?: OpportunityStatus;
}

export interface UpdateOpportunityInput extends Partial<Omit<CreateOpportunityInput, "stage_id">> {
  id: string;
  stage_id?: string;
}

export function useOpportunities() {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["opportunities", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];

      const { data, error } = await workspaceClient
        .from("opportunities")
        .select(`
          *,
          lead:leads(id, name, email)
        `)
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Opportunity[];
    },
    enabled: !!currentWorkspace,
  });
}

export function useOpportunity(id: string | undefined) {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["opportunity", id],
    queryFn: async () => {
      if (!id || !currentWorkspace) return null;

      const { data, error } = await workspaceClient
        .from("opportunities")
        .select(`
          *,
          lead:leads(id, name, email, phone)
        `)
        .eq("id", id)
        .eq("workspace_id", currentWorkspace.id)
        .maybeSingle();

      if (error) throw error;
      return data as Opportunity | null;
    },
    enabled: !!id && !!currentWorkspace,
  });
}

export function useCreateOpportunity() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateOpportunityInput) => {
      if (!currentWorkspace || !user) throw new Error("Not authenticated");

      const { data, error } = await workspaceClient
        .from("opportunities")
        .insert({
          workspace_id: currentWorkspace.id,
          owner_id: user.id,
          title: input.title,
          lead_id: input.lead_id || null,
          value: input.value || 0,
          stage_id: input.stage_id,
          status: input.status || "open",
        })
        .select()
        .single();

      if (error) throw error;
      return data as Opportunity;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities", currentWorkspace?.id] });
    },
  });
}

export function useUpdateOpportunity() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async (input: UpdateOpportunityInput) => {
      const { id, ...updates } = input;

      const { data, error } = await workspaceClient
        .from("opportunities")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Opportunity;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["opportunities", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["opportunity", data.id] });
    },
  });
}

export function useDeleteOpportunity() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await workspaceClient.from("opportunities").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities", currentWorkspace?.id] });
    },
  });
}

export function useMoveOpportunity() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async ({ id, stage_id }: { id: string; stage_id: string }) => {
      const { data, error } = await workspaceClient
        .from("opportunities")
        .update({ stage_id })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Opportunity;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities", currentWorkspace?.id] });
    },
  });
}
