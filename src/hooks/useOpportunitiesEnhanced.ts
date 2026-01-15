import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  Opportunity,
  CreateOpportunityInput,
  UpdateOpportunityInput,
  OpportunityKPIs,
  Pipeline,
  PipelineStage,
} from "@/types/opportunity";

// Pipelines hooks
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
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as Pipeline[];
    },
    enabled: !!currentWorkspace,
  });
}

export function useCreatePipeline() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async (input: { name: string; type?: string; description?: string; is_default?: boolean }) => {
      if (!currentWorkspace) throw new Error("No workspace");

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
    },
  });
}

// Enhanced opportunities hook with all relations
export function useOpportunitiesEnhanced(filters?: {
  status?: string;
  stageId?: string;
  pipelineId?: string;
}) {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["opportunities-enhanced", currentWorkspace?.id, filters],
    queryFn: async () => {
      if (!currentWorkspace) return [];

      let query = workspaceClient
        .from("opportunities")
        .select(`
          *,
          lead:leads(id, name, email, phone),
          contact:contacts(id, name, email, phone, company),
          company:companies(id, name, website),
          stage:pipeline_stages(id, name, color, probability, position)
        `)
        .eq("workspace_id", currentWorkspace.id);

      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      if (filters?.stageId) {
        query = query.eq("stage_id", filters.stageId);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;
      return data as Opportunity[];
    },
    enabled: !!currentWorkspace,
  });
}

export function useOpportunityDetail(id: string | undefined) {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["opportunity-detail", id],
    queryFn: async () => {
      if (!id || !currentWorkspace) return null;

      const { data, error } = await workspaceClient
        .from("opportunities")
        .select(`
          *,
          lead:leads(id, name, email, phone),
          contact:contacts(id, name, email, phone, company, job_title),
          company:companies(id, name, website, industry, size),
          stage:pipeline_stages(id, name, color, probability, position, description)
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

export function useCreateOpportunityEnhanced() {
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
          contact_id: input.contact_id || null,
          company_id: input.company_id || null,
          value: input.value || 0,
          currency: input.currency || "EUR",
          stage_id: input.stage_id,
          probability: input.probability || 50,
          source: input.source || null,
          status: input.status || "open",
          expected_close_date: input.expected_close_date || null,
          notes: input.notes || null,
        })
        .select(`
          *,
          lead:leads(id, name, email),
          contact:contacts(id, name, email),
          company:companies(id, name)
        `)
        .single();

      if (error) throw error;
      return data as Opportunity;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities-enhanced", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["opportunities", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["opportunity-kpis", currentWorkspace?.id] });
    },
  });
}

export function useUpdateOpportunityEnhanced() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async (input: UpdateOpportunityInput) => {
      const { id, ...updates } = input;

      // Add last_activity_at when updating
      const updateData = {
        ...updates,
        last_activity_at: new Date().toISOString(),
      };

      const { data, error } = await workspaceClient
        .from("opportunities")
        .update(updateData)
        .eq("id", id)
        .select(`
          *,
          lead:leads(id, name, email),
          contact:contacts(id, name, email),
          company:companies(id, name),
          stage:pipeline_stages(id, name, color, probability)
        `)
        .single();

      if (error) throw error;
      return data as Opportunity;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["opportunities-enhanced", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["opportunities", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["opportunity-detail", data.id] });
      queryClient.invalidateQueries({ queryKey: ["opportunity-kpis", currentWorkspace?.id] });
    },
  });
}

export function useMoveOpportunityEnhanced() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async ({ id, stage_id, probability }: { id: string; stage_id: string; probability?: number }) => {
      const updateData: Record<string, unknown> = {
        stage_id,
        last_activity_at: new Date().toISOString(),
      };

      if (probability !== undefined) {
        updateData.probability = probability;
      }

      const { data, error } = await workspaceClient
        .from("opportunities")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Opportunity;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities-enhanced", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["opportunities", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["opportunity-kpis", currentWorkspace?.id] });
    },
  });
}

export function useCloseOpportunity() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      lost_reason 
    }: { 
      id: string; 
      status: "won" | "lost"; 
      lost_reason?: string;
    }) => {
      const updateData: Record<string, unknown> = {
        status,
        last_activity_at: new Date().toISOString(),
      };

      if (status === "won") {
        updateData.probability = 100;
      } else if (status === "lost") {
        updateData.probability = 0;
        if (lost_reason) {
          updateData.lost_reason = lost_reason;
        }
      }

      const { data, error } = await workspaceClient
        .from("opportunities")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Opportunity;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities-enhanced", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["opportunities", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["opportunity-kpis", currentWorkspace?.id] });
    },
  });
}

export function useDeleteOpportunityEnhanced() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await workspaceClient.from("opportunities").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities-enhanced", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["opportunities", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["opportunity-kpis", currentWorkspace?.id] });
    },
  });
}

// KPIs hook
export function useOpportunityKPIs() {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["opportunity-kpis", currentWorkspace?.id],
    queryFn: async (): Promise<OpportunityKPIs> => {
      if (!currentWorkspace) {
        return {
          totalValue: 0,
          weightedValue: 0,
          totalOpen: 0,
          totalWon: 0,
          totalLost: 0,
          conversionRate: 0,
          avgDealSize: 0,
          avgCloseTime: 0,
        };
      }

      const { data: opportunities, error } = await workspaceClient
        .from("opportunities")
        .select("id, value, status, probability, created_at, updated_at")
        .eq("workspace_id", currentWorkspace.id);

      if (error) throw error;

      const openOpps = opportunities?.filter(o => o.status === "open") || [];
      const wonOpps = opportunities?.filter(o => o.status === "won") || [];
      const lostOpps = opportunities?.filter(o => o.status === "lost") || [];
      const closedOpps = [...wonOpps, ...lostOpps];

      const totalValue = openOpps.reduce((sum, o) => sum + Number(o.value || 0), 0);
      const weightedValue = openOpps.reduce(
        (sum, o) => sum + (Number(o.value || 0) * (o.probability || 50) / 100),
        0
      );
      const wonValue = wonOpps.reduce((sum, o) => sum + Number(o.value || 0), 0);
      const avgDealSize = wonOpps.length > 0 ? wonValue / wonOpps.length : 0;
      const conversionRate = closedOpps.length > 0 
        ? (wonOpps.length / closedOpps.length) * 100 
        : 0;

      // Calculate average close time for won opportunities
      let avgCloseTime = 0;
      if (wonOpps.length > 0) {
        const totalDays = wonOpps.reduce((sum, o) => {
          const created = new Date(o.created_at);
          const updated = new Date(o.updated_at);
          const days = Math.ceil((updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
          return sum + days;
        }, 0);
        avgCloseTime = totalDays / wonOpps.length;
      }

      return {
        totalValue,
        weightedValue,
        totalOpen: openOpps.length,
        totalWon: wonOpps.length,
        totalLost: lostOpps.length,
        conversionRate,
        avgDealSize,
        avgCloseTime,
      };
    },
    enabled: !!currentWorkspace,
  });
}

// Enhanced pipeline stages with probability
export function usePipelineStagesEnhanced(pipelineId?: string) {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useQuery({
    queryKey: ["pipeline-stages-enhanced", currentWorkspace?.id, pipelineId],
    queryFn: async () => {
      if (!currentWorkspace) return [];

      let query = workspaceClient
        .from("pipeline_stages")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("position", { ascending: true });

      if (pipelineId) {
        query = query.eq("pipeline_id", pipelineId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as PipelineStage[];
    },
    enabled: !!currentWorkspace,
  });
}

export function useCreatePipelineStageEnhanced() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async (input: {
      name: string;
      color: string;
      probability?: number;
      description?: string;
      pipeline_id?: string;
    }) => {
      if (!currentWorkspace) throw new Error("No workspace");

      // Get max position
      const { data: existing } = await workspaceClient
        .from("pipeline_stages")
        .select("position")
        .eq("workspace_id", currentWorkspace.id)
        .order("position", { ascending: false })
        .limit(1);

      const nextPosition = existing && existing.length > 0 ? existing[0].position + 1 : 0;

      const { data, error } = await workspaceClient
        .from("pipeline_stages")
        .insert({
          workspace_id: currentWorkspace.id,
          name: input.name,
          color: input.color,
          probability: input.probability ?? 50,
          description: input.description || null,
          pipeline_id: input.pipeline_id || null,
          position: nextPosition,
        })
        .select()
        .single();

      if (error) throw error;
      return data as PipelineStage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline-stages-enhanced", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["pipeline-stages", currentWorkspace?.id] });
    },
  });
}

export function useUpdatePipelineStageEnhanced() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      name?: string;
      color?: string;
      probability?: number;
      description?: string;
      position?: number;
    }) => {
      const { id, ...updates } = input;

      const { data, error } = await workspaceClient
        .from("pipeline_stages")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as PipelineStage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline-stages-enhanced", currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ["pipeline-stages", currentWorkspace?.id] });
    },
  });
}
