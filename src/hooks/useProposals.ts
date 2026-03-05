import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { trackProposalAccepted } from "@/modules/growth-seo/lib/gtmEvents";
import { emitKernelEvent } from "@/lib/kernelEmitter";
import type {
  Proposal,
  ProposalTemplate,
  ProposalVersion,
  ProposalActivityLog,
  CreateProposalInput,
  UpdateProposalInput,
  CreateProposalTemplateInput,
  ContentBlock,
  ProposalStatus,
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
      console.log('[PROPOSALS] Template created');
    },
    onError: (error) => {
      console.warn('[PROPOSALS] TEMPLATE_CREATE_FAILED', error.message);
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
      console.log('[PROPOSALS] Template updated');
    },
    onError: (error) => {
      console.warn('[PROPOSALS] TEMPLATE_UPDATE_FAILED', error.message);
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
      console.log('[PROPOSALS] Template deleted');
    },
    onError: (error) => {
      console.warn('[PROPOSALS] TEMPLATE_DELETE_FAILED', error.message);
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
          ),
          contact:contacts(id, name, email, tax_id, address),
          company:companies(id, name, email, tax_id, address),
          assigned_to_profile:profiles!proposals_assigned_to_fkey(
            id, full_name, email, avatar_url
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
          ),
          contact:contacts(id, name, email, tax_id, address),
          company:companies(id, name, email, tax_id, address),
          assigned_to_profile:profiles!proposals_assigned_to_fkey(
            id, full_name, email, avatar_url
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
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      toast.success("Proposta criada!");

      if (currentWorkspace?.id) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'PROPOSAL.CREATED',
          entity_kind: 'proposal',
          entity_id: data.id,
          source_module: 'sales-proposals',
          payload: {
            has_template: !!variables.template_id,
            has_price: (data.price ?? 0) > 0,
            currency: data.currency,
            items_count: 0,
          },
        });
      }
    },
    onError: (error) => {
      console.warn('[PROPOSALS] CREATE_FAILED', error.message);
      toast.error(`Erro ao criar proposta: ${error.message}`);
    },
  });
}

export function useUpdateProposal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, createVersion, ...input }: UpdateProposalInput & { id: string; createVersion?: boolean }) => {
      // Get current status before update to detect status change
      const { data: currentProposal } = await supabase
        .from("proposals")
        .select("status")
        .eq("id", id)
        .single();

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
      // Client fields
      if (input.contact_id !== undefined) updateData.contact_id = input.contact_id;
      if (input.company_id !== undefined) updateData.company_id = input.company_id;
      // Conditions fields
      if (input.payment_conditions !== undefined) updateData.payment_conditions = input.payment_conditions;
      if (input.validity_days !== undefined) updateData.validity_days = input.validity_days;
      if (input.notes !== undefined) updateData.notes = input.notes;
      if (input.billing_address !== undefined) updateData.billing_address = input.billing_address;
      if (input.billing_nif !== undefined) updateData.billing_nif = input.billing_nif;
      // Account manager
      if (input.assigned_to !== undefined) updateData.assigned_to = input.assigned_to;

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
          ),
          contact:contacts(id, name, email, tax_id),
          company:companies(id, name, email, tax_id, address)
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

      return { 
        ...(data as unknown as Proposal), 
        _previousStatus: currentProposal?.status 
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      queryClient.invalidateQueries({ queryKey: ["proposal"] });
      toast.success("Proposta atualizada!");
      console.log(`[PROPOSALS] Updated: ${data.id}`);
      
      // Track proposal accepted in GTM when status changes to 'accepted'
      if (data.status === 'accepted' && data._previousStatus !== 'accepted') {
        trackProposalAccepted({
          proposal_id: data.id,
          proposal_title: data.title,
          value: data.price || 0,
          currency: data.currency || 'EUR',
          opportunity_id: data.opportunity_id || undefined,
          workspace_id: data.workspace_id,
        });

        emitKernelEvent({
          workspace_id: data.workspace_id,
          type: 'PROPOSAL.SIGNED',
          entity_kind: 'proposal',
          entity_id: data.id,
          source_module: 'sales-proposals',
          payload: {
            proposal_id: data.id,
            price: data.price,
            currency: data.currency,
          },
        });
      }
    },
    onError: (error) => {
      console.warn('[PROPOSALS] UPDATE_FAILED', error.message);
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      queryClient.invalidateQueries({ queryKey: ["proposal"] });
      toast.success("Proposta publicada!");

      emitKernelEvent({
        workspace_id: data.workspace_id,
        type: 'PROPOSAL.SENT',
        entity_kind: 'proposal',
        entity_id: data.id,
        source_module: 'sales-proposals',
        payload: {
          proposal_id: data.id,
          slug: data.slug,
        },
      });
    },
    onError: (error) => {
      console.warn('[PROPOSALS] PUBLISH_FAILED', error.message);
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
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      toast.success("Proposta removida!");
      console.log(`[PROPOSALS] Deleted: ${id}`);
    },
    onError: (error) => {
      console.warn('[PROPOSALS] DELETE_FAILED', error.message);
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

// ============ Proposal Items ============

export interface ProposalItem {
  id: string;
  proposal_id: string;
  workspace_id: string;
  product_id: string | null;
  name: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  total_price: number | null;
  position: number;
  is_enabled: boolean;
  cost_snapshot: number | null;
  operational_cost_snapshot: number | null;
  commission_pct_snapshot: number | null;
  created_at: string;
  updated_at: string;
  product?: {
    id: string;
    name: string;
    base_price: number | null;
    direct_cost: number | null;
    operational_cost: number | null;
    images: string[] | null;
    primary_image_index: number | null;
    status?: string | null;
  } | null;
}

export function useProposalItems(proposalId: string | undefined) {
  return useQuery({
    queryKey: ["proposal-items", proposalId],
    queryFn: async () => {
      if (!proposalId) return [];

      const { data, error } = await supabase
        .from("proposal_items")
        .select(`
          *,
          product:products(id, name, base_price, direct_cost, operational_cost, images, primary_image_index, status)
        `)
        .eq("proposal_id", proposalId)
        .order("position", { ascending: true });

      if (error) throw error;
      return data as unknown as ProposalItem[];
    },
    enabled: !!proposalId,
  });
}

export function useUpdateProposalItems() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async ({ 
      proposalId, 
      items 
    }: { 
      proposalId: string; 
      items: Array<{
        id?: string;
        product_id?: string | null;
        name: string;
        description?: string | null;
        quantity: number;
        unit_price: number;
        position: number;
        is_enabled?: boolean;
        cost_snapshot?: number | null;
        operational_cost_snapshot?: number | null;
      }>;
    }) => {
      if (!currentWorkspace?.id) throw new Error("No workspace selected");

      // Delete existing items
      const { error: deleteError } = await supabase
        .from("proposal_items")
        .delete()
        .eq("proposal_id", proposalId);

      if (deleteError) throw deleteError;

      // Insert new items (total_price is a generated column, don't include it)
      if (items.length > 0) {
        const insertData = items.map((item, idx) => ({
          proposal_id: proposalId,
          workspace_id: currentWorkspace.id,
          product_id: item.product_id,
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          position: item.position ?? idx,
          is_enabled: item.is_enabled ?? true,
          cost_snapshot: item.cost_snapshot ?? null,
          operational_cost_snapshot: item.operational_cost_snapshot ?? null,
        }));

        const { error: insertError } = await supabase
          .from("proposal_items")
          .insert(insertData as never[]);

        if (insertError) throw insertError;
      }

      // Update proposal price based on enabled items total only
      const totalPrice = items
        .filter(item => item.is_enabled !== false)
        .reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      
      const { error: updateError } = await supabase
        .from("proposals")
        .update({ price: totalPrice })
        .eq("id", proposalId);

      if (updateError) throw updateError;

      return { proposalId, itemsCount: items.length, totalPrice };
    },
    onSuccess: async (data) => {
      // Forçar invalidação e esperar refetch para sincronização completa
      await queryClient.invalidateQueries({ 
        queryKey: ["proposal-items", data.proposalId],
        refetchType: 'active'
      });
      await queryClient.invalidateQueries({ 
        queryKey: ["proposal", data.proposalId],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      toast.success("Itens da proposta atualizados!");
      console.log(`[PROPOSALS] Items updated: ${data.itemsCount} items, total=${data.totalPrice}`);
    },
    onError: (error) => {
      console.warn('[PROPOSALS] ITEMS_UPDATE_FAILED', error.message);
      toast.error(`Erro ao atualizar itens: ${error.message}`);
    },
  });
}

// Toggle individual proposal item
export function useToggleProposalItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      itemId, 
      isEnabled,
      proposalId,
    }: { 
      itemId: string; 
      isEnabled: boolean;
      proposalId: string;
    }) => {
      const { error } = await supabase
        .from("proposal_items")
        .update({ is_enabled: isEnabled })
        .eq("id", itemId);

      if (error) throw error;

      // Recalculate proposal price based on enabled items
      const { data: items } = await supabase
        .from("proposal_items")
        .select("quantity, unit_price, is_enabled")
        .eq("proposal_id", proposalId);

      if (items) {
        const totalPrice = items
          .filter(item => item.is_enabled !== false)
          .reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

        await supabase
          .from("proposals")
          .update({ price: totalPrice })
          .eq("id", proposalId);
      }

      return { itemId, isEnabled, proposalId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["proposal-items", data.proposalId] });
      queryClient.invalidateQueries({ queryKey: ["proposal", data.proposalId] });
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar item: ${error.message}`);
    },
  });
}

// ============ Duplicate Proposal ============

export function useDuplicateProposal() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (proposalId: string) => {
      if (!currentWorkspace?.id) throw new Error("No workspace selected");

      // 1. Fetch original proposal with items
      const { data: original, error: fetchError } = await supabase
        .from("proposals")
        .select("*")
        .eq("id", proposalId)
        .single();

      if (fetchError) throw fetchError;
      if (!original) throw new Error("Proposal not found");

      // 2. Fetch proposal items separately
      const { data: originalItems, error: itemsError } = await supabase
        .from("proposal_items")
        .select("*")
        .eq("proposal_id", proposalId)
        .order("position", { ascending: true });

      if (itemsError) throw itemsError;

      // 3. Generate new slug
      const slug = generateSlug();

      // 4. Create new proposal as draft
      const { data: newProposal, error: insertError } = await supabase
        .from("proposals")
        .insert({
          workspace_id: currentWorkspace.id,
          opportunity_id: original.opportunity_id,
          template_id: original.template_id,
          slug,
          title: `${original.title} (cópia)`,
          content_blocks: original.content_blocks,
          variables: original.variables,
          styles: original.styles,
          cta_text: original.cta_text,
          cta_color: original.cta_color,
          price: original.price,
          currency: original.currency,
          status: "draft",
          contact_id: original.contact_id,
          company_id: original.company_id,
          payment_conditions: original.payment_conditions,
          validity_days: original.validity_days,
          notes: original.notes,
          billing_address: original.billing_address,
          billing_nif: original.billing_nif,
          scope_data: original.scope_data,
          timeline_data: original.timeline_data,
          references_data: original.references_data,
          assigned_to: user?.id,
          created_by: user?.id,
        } as never)
        .select()
        .single();

      if (insertError) throw insertError;
      if (!newProposal) throw new Error("Failed to create proposal");

      // 5. Copy items
      if (originalItems && originalItems.length > 0) {
        const itemsToInsert = originalItems.map((item, idx) => ({
          proposal_id: (newProposal as any).id,
          workspace_id: currentWorkspace.id,
          product_id: item.product_id,
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          position: idx,
          is_enabled: item.is_enabled,
          cost_snapshot: item.cost_snapshot,
          operational_cost_snapshot: item.operational_cost_snapshot,
        }));

        const { error: itemsInsertError } = await supabase
          .from("proposal_items")
          .insert(itemsToInsert as never[]);

        if (itemsInsertError) throw itemsInsertError;
      }

      return newProposal as unknown as Proposal;
    },
    onSuccess: (data, sourceId) => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      toast.success("Proposta duplicada com sucesso!");
      console.log(`[PROPOSALS] Duplicated: ${sourceId} → ${data.id}`);
    },
    onError: (error) => {
      console.warn('[PROPOSALS] DUPLICATE_FAILED', error.message);
      toast.error(`Erro ao duplicar proposta: ${error.message}`);
    },
  });
}

// ============ Quick Status Change ============

export function useQuickStatusChange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ProposalStatus }) => {
      const updateData: Record<string, unknown> = {
        status,
      };
      
      // Set accepted_at when marking as accepted
      if (status === "accepted") {
        updateData.accepted_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from("proposals")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { proposal: data as unknown as Proposal, newStatus: status };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      queryClient.invalidateQueries({ queryKey: ["proposal", data.proposal.id] });
      
      const statusLabels: Record<string, string> = {
        accepted: "aceita",
        rejected: "rejeitada",
        draft: "rascunho",
        published: "publicada",
      };
      toast.success(`Proposta marcada como ${statusLabels[data.newStatus] || data.newStatus}!`);
      
      // Track accepted in GTM + Kernel
      if (data.newStatus === "accepted") {
        trackProposalAccepted({
          proposal_id: data.proposal.id,
          proposal_title: data.proposal.title,
          value: data.proposal.price || 0,
          currency: data.proposal.currency || "EUR",
          opportunity_id: data.proposal.opportunity_id || undefined,
          workspace_id: data.proposal.workspace_id,
        });

        emitKernelEvent({
          workspace_id: data.proposal.workspace_id,
          type: 'PROPOSAL.SIGNED',
          entity_kind: 'proposal',
          entity_id: data.proposal.id,
          source_module: 'sales-proposals',
          payload: {
            proposal_id: data.proposal.id,
            price: data.proposal.price,
            currency: data.proposal.currency,
          },
        });
      }

      if (data.newStatus === "rejected") {
        emitKernelEvent({
          workspace_id: data.proposal.workspace_id,
          type: 'PROPOSAL.REJECTED',
          entity_kind: 'proposal',
          entity_id: data.proposal.id,
          source_module: 'sales-proposals',
          payload: {
            proposal_id: data.proposal.id,
          },
        });
      }
    },
    onError: (error) => {
      console.warn('[PROPOSALS] STATUS_CHANGE_FAILED', error.message);
      toast.error(`Erro ao alterar estado: ${error.message}`);
    },
  });
}

// ============ Refresh Cost Snapshots ============

export function useRefreshCostSnapshots() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (proposalId: string) => {
      // 1. Get proposal items with product_id
      const { data: items, error: itemsError } = await supabase
        .from("proposal_items")
        .select("id, product_id")
        .eq("proposal_id", proposalId)
        .not("product_id", "is", null);

      if (itemsError) throw itemsError;
      if (!items || items.length === 0) return;

      // 2. Get current product costs
      const productIds = items.map(i => i.product_id!);
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id, direct_cost, operational_cost")
        .in("id", productIds);

      if (productsError) throw productsError;

      const costMap = new Map(products?.map(p => [p.id, p]) || []);

      // 3. Update each item's snapshots
      for (const item of items) {
        const product = costMap.get(item.product_id!);
        if (!product) continue;

        const { error } = await supabase
          .from("proposal_items")
          .update({
            cost_snapshot: product.direct_cost ?? 0,
            operational_cost_snapshot: product.operational_cost ?? 0,
          })
          .eq("id", item.id);

        if (error) throw error;
      }
    },
    onSuccess: (_data, proposalId) => {
      queryClient.invalidateQueries({ queryKey: ["proposal-items", proposalId] });
      toast.success("Custos atualizados com sucesso");
      console.log('[PROPOSALS] Cost snapshots refreshed');
    },
    onError: (error) => {
      console.warn('[PROPOSALS] COST_REFRESH_FAILED', error.message);
      toast.error(`Erro ao atualizar custos: ${error.message}`);
    },
  });
}
