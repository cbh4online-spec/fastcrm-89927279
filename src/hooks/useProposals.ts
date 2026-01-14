import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type {
  Proposal,
  ProposalTemplate,
  ProposalVersion,
  ProposalActivityLog,
  CreateProposalInput,
  UpdateProposalInput,
  CreateProposalTemplateInput,
  ContentBlock,
} from "@/types/proposal";

// Generate unique slug
const generateSlug = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// ============ Proposal Templates ============

export function useProposalTemplates() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["proposal-templates", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];

      const { data, error } = await supabase
        .from("proposal_templates")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as ProposalTemplate[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useCreateProposalTemplate() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateProposalTemplateInput) => {
      if (!currentWorkspace?.id) throw new Error("No workspace selected");

      const insertData = {
        workspace_id: currentWorkspace.id,
        created_by: user?.id,
        name: input.name,
        description: input.description,
        content_blocks: input.content_blocks as unknown as Record<string, unknown>[],
        styles: input.styles || {},
        cta_text: input.cta_text || "Aceitar Proposta",
        cta_color: input.cta_color || "#3b82f6",
      };

      const { data, error } = await supabase
        .from("proposal_templates")
        .insert(insertData as never)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as ProposalTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposal-templates"] });
      toast.success("Modelo de proposta criado!");
    },
    onError: (error) => {
      toast.error(`Erro ao criar modelo: ${error.message}`);
    },
  });
}

export function useUpdateProposalTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<CreateProposalTemplateInput> & { id: string }) => {
      const updateData: Record<string, unknown> = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.content_blocks !== undefined) updateData.content_blocks = input.content_blocks;
      if (input.styles !== undefined) updateData.styles = input.styles;
      if (input.cta_text !== undefined) updateData.cta_text = input.cta_text;
      if (input.cta_color !== undefined) updateData.cta_color = input.cta_color;

      const { data, error } = await supabase
        .from("proposal_templates")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as ProposalTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposal-templates"] });
      toast.success("Modelo atualizado!");
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar modelo: ${error.message}`);
    },
  });
}

export function useDeleteProposalTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("proposal_templates")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposal-templates"] });
      toast.success("Modelo removido!");
    },
    onError: (error) => {
      toast.error(`Erro ao remover modelo: ${error.message}`);
    },
  });
}

// ============ Proposals ============

export function useProposals(opportunityId?: string) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["proposals", currentWorkspace?.id, opportunityId],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];

      let query = supabase
        .from("proposals")
        .select(`
          *,
          opportunity:opportunities(
            id,
            title,
            value,
            lead:leads(id, name, email)
          )
        `)
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false });

      if (opportunityId) {
        query = query.eq("opportunity_id", opportunityId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as unknown as Proposal[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useProposal(id: string | undefined) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["proposal", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("proposals")
        .select(`
          *,
          opportunity:opportunities(
            id,
            title,
            value,
            lead:leads(id, name, email)
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as unknown as Proposal;
    },
    enabled: !!id && !!currentWorkspace?.id,
  });
}

export function useCreateProposal() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateProposalInput) => {
      if (!currentWorkspace?.id) throw new Error("No workspace selected");

      const slug = generateSlug();

      const insertData = {
        workspace_id: currentWorkspace.id,
        opportunity_id: input.opportunity_id,
        template_id: input.template_id,
        slug,
        title: input.title,
        content_blocks: input.content_blocks as unknown as Record<string, unknown>[],
        variables: input.variables || {},
        styles: input.styles || {},
        cta_text: input.cta_text || "Aceitar Proposta",
        cta_color: input.cta_color || "#3b82f6",
        price: input.price,
        currency: input.currency || "BRL",
        expires_at: input.expires_at,
        created_by: user?.id,
      };

      const { data, error } = await supabase
        .from("proposals")
        .insert(insertData as never)
        .select(`
          *,
          opportunity:opportunities(
            id,
            title,
            value,
            lead:leads(id, name, email)
          )
        `)
        .single();

      if (error) throw error;

      // Create initial version
      const versionData = {
        proposal_id: data.id,
        version: 1,
        content_blocks: input.content_blocks as unknown as Record<string, unknown>[],
        variables: input.variables || {},
        change_summary: "Versão inicial",
        created_by: user?.id,
      };
      await supabase.from("proposal_versions").insert(versionData as never);

      return data as unknown as Proposal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      toast.success("Proposta criada!");
    },
    onError: (error) => {
      toast.error(`Erro ao criar proposta: ${error.message}`);
    },
  });
}

export function useUpdateProposal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, createVersion, ...input }: UpdateProposalInput & { id: string; createVersion?: boolean }) => {
      const updateData: Record<string, unknown> = {};
      if (input.title !== undefined) updateData.title = input.title;
      if (input.content_blocks !== undefined) updateData.content_blocks = input.content_blocks;
      if (input.variables !== undefined) updateData.variables = input.variables;
      if (input.styles !== undefined) updateData.styles = input.styles;
      if (input.cta_text !== undefined) updateData.cta_text = input.cta_text;
      if (input.cta_color !== undefined) updateData.cta_color = input.cta_color;
      if (input.price !== undefined) updateData.price = input.price;
      if (input.currency !== undefined) updateData.currency = input.currency;
      if (input.expires_at !== undefined) updateData.expires_at = input.expires_at;
      if (input.status !== undefined) updateData.status = input.status;

      const { data, error } = await supabase
        .from("proposals")
        .update(updateData)
        .eq("id", id)
        .select(`
          *,
          opportunity:opportunities(
            id,
            title,
            value,
            lead:leads(id, name, email)
          )
        `)
        .single();

      if (error) throw error;

      // Create new version if content changed
      if (createVersion && input.content_blocks) {
        const { data: versions } = await supabase
          .from("proposal_versions")
          .select("version")
          .eq("proposal_id", id)
          .order("version", { ascending: false })
          .limit(1);

        const nextVersion = (versions?.[0]?.version || 0) + 1;

        const versionData = {
          proposal_id: id,
          version: nextVersion,
          content_blocks: input.content_blocks as unknown as Record<string, unknown>[],
          variables: input.variables || {},
          change_summary: `Atualização v${nextVersion}`,
          created_by: user?.id,
        };
        await supabase.from("proposal_versions").insert(versionData as never);
      }

      return data as unknown as Proposal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      queryClient.invalidateQueries({ queryKey: ["proposal"] });
      toast.success("Proposta atualizada!");
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar proposta: ${error.message}`);
    },
  });
}

export function usePublishProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("proposals")
        .update({
          status: "published",
          published_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as Proposal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      queryClient.invalidateQueries({ queryKey: ["proposal"] });
      toast.success("Proposta publicada!");
    },
    onError: (error) => {
      toast.error(`Erro ao publicar proposta: ${error.message}`);
    },
  });
}

export function useDeleteProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("proposals")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      toast.success("Proposta removida!");
    },
    onError: (error) => {
      toast.error(`Erro ao remover proposta: ${error.message}`);
    },
  });
}

// ============ Proposal Versions ============

export function useProposalVersions(proposalId: string | undefined) {
  return useQuery({
    queryKey: ["proposal-versions", proposalId],
    queryFn: async () => {
      if (!proposalId) return [];

      const { data, error } = await supabase
        .from("proposal_versions")
        .select("*")
        .eq("proposal_id", proposalId)
        .order("version", { ascending: false });

      if (error) throw error;
      return data as unknown as ProposalVersion[];
    },
    enabled: !!proposalId,
  });
}

// ============ Proposal Activity ============

export function useProposalActivity(proposalId: string | undefined) {
  return useQuery({
    queryKey: ["proposal-activity", proposalId],
    queryFn: async () => {
      if (!proposalId) return [];

      const { data, error } = await supabase
        .from("proposal_activity_logs")
        .select("*")
        .eq("proposal_id", proposalId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as ProposalActivityLog[];
    },
    enabled: !!proposalId,
  });
}
