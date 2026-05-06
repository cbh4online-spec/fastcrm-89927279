import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type FollowupStatus =
  | "open"
  | "pending"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "overdue"
  | "snoozed"
  | "sent"
  | "dismissed";

export type FollowupSource =
  | "manual"
  | "inbox_intelligence"
  | "post_appointment"
  | "no_response"
  | "product_share"
  | "proposal_sent"
  | "ai_policy";

export interface WhatsAppFollowup {
  id: string;
  workspace_id: string;
  conversation_id: string | null;
  contact_id: string | null;
  lead_id: string | null;
  deal_id: string | null;
  appointment_id: string | null;
  assigned_to: string | null;
  title: string | null;
  description: string | null;
  due_at: string | null;
  priority: string | null;
  status: FollowupStatus | string;
  source: FollowupSource | string;
  suggested_by_ai: boolean | null;
  prepared_message: string | null;
  template_id: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const FIELDS =
  "id, workspace_id, conversation_id, contact_id, lead_id, deal_id, appointment_id, assigned_to, title, description, due_at, priority, status, source, suggested_by_ai, prepared_message, template_id, completed_at, created_by, created_at, updated_at";

export interface FollowupFilters {
  status?: FollowupStatus[] | null;
  assigned_to?: string | null;
  conversation_id?: string | null;
  contact_id?: string | null;
  source?: FollowupSource | null;
  overdueOnly?: boolean;
  limit?: number;
}

export function useWhatsAppFollowups(filters: FollowupFilters = {}) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["whatsapp-followups", currentWorkspace?.id, filters],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [] as WhatsAppFollowup[];
      let query = supabase
        .from("conversation_followups" as never)
        .select(FIELDS)
        .eq("workspace_id", currentWorkspace.id)
        .order("due_at", { ascending: true, nullsFirst: false })
        .limit(filters.limit ?? 200);

      if (filters.status && filters.status.length > 0) {
        query = query.in("status", filters.status as string[]);
      }
      if (filters.assigned_to) query = query.eq("assigned_to", filters.assigned_to);
      if (filters.conversation_id) query = query.eq("conversation_id", filters.conversation_id);
      if (filters.contact_id) query = query.eq("contact_id", filters.contact_id);
      if (filters.source) query = query.eq("source", filters.source);
      if (filters.overdueOnly) {
        query = query
          .lte("due_at", new Date().toISOString())
          .in("status", ["open", "pending", "in_progress"]);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as WhatsAppFollowup[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export interface CreateFollowupInput {
  title: string;
  description?: string | null;
  due_at?: string | null;
  priority?: "low" | "medium" | "high" | "urgent";
  source?: FollowupSource;
  conversation_id?: string | null;
  contact_id?: string | null;
  lead_id?: string | null;
  deal_id?: string | null;
  appointment_id?: string | null;
  assigned_to?: string | null;
  suggested_by_ai?: boolean;
  prepared_message?: string | null;
}

export function useCreateFollowup() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: CreateFollowupInput) => {
      if (!currentWorkspace?.id) throw new Error("Sem workspace ativo");
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id ?? null;

      const payload: Record<string, unknown> = {
        workspace_id: currentWorkspace.id,
        title: input.title,
        description: input.description ?? null,
        due_at: input.due_at ?? null,
        priority: input.priority ?? "medium",
        source: input.source ?? "manual",
        status: "open",
        conversation_id: input.conversation_id ?? null,
        contact_id: input.contact_id ?? null,
        lead_id: input.lead_id ?? null,
        deal_id: input.deal_id ?? null,
        appointment_id: input.appointment_id ?? null,
        assigned_to: input.assigned_to ?? userId,
        suggested_by_ai: input.suggested_by_ai ?? false,
        prepared_message: input.prepared_message ?? null,
        created_by: userId,
        // Manter compat com schema antigo (NOT NULL removido na migration mas existem registos antigos)
        hours_since_last_reply: 0,
      };

      const { data, error } = await supabase
        .from("conversation_followups" as never)
        .insert(payload as never)
        .select(FIELDS)
        .single();
      if (error) throw error;
      return data as unknown as WhatsAppFollowup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-followups"] });
      toast.success("Follow-up criado");
    },
    onError: (e: Error) => {
      toast.error("Erro ao criar follow-up", { description: e.message });
    },
  });
}

export function useUpdateFollowupStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status: FollowupStatus }) => {
      const patch: Record<string, unknown> = { status: input.status };
      if (input.status === "completed") patch.completed_at = new Date().toISOString();
      const { data, error } = await supabase
        .from("conversation_followups" as never)
        .update(patch as never)
        .eq("id", input.id)
        .select(FIELDS)
        .single();
      if (error) throw error;
      return data as unknown as WhatsAppFollowup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-followups"] });
    },
    onError: (e: Error) => {
      toast.error("Erro ao atualizar follow-up", { description: e.message });
    },
  });
}
