import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface SDRCampaign {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  status: "draft" | "active" | "paused" | "completed";
  sequence_id: string | null;
  ai_employee_id: string | null;
  target_filters: Record<string, unknown>;
  ab_testing_config: Record<string, unknown>;
  settings: Record<string, unknown>;
  total_enrolled: number;
  total_replied: number;
  total_meetings: number;
  total_converted: number;
  auto_enroll_enabled: boolean;
  auto_enroll_min_score: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SDREnrollment {
  id: string;
  campaign_id: string;
  workspace_id: string;
  prospect_id: string | null;
  lead_id: string | null;
  contact_id: string | null;
  prospect_name: string | null;
  prospect_email: string | null;
  prospect_phone: string | null;
  status: string;
  channel: string | null;
  sequence_enrollment_id: string | null;
  enrichment_data: Record<string, unknown>;
  message_variant: string | null;
  reply_detected_at: string | null;
  meeting_set_at: string | null;
  converted_at: string | null;
  opted_out_at: string | null;
  failure_reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export function useSDRCampaigns() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["sdr-campaigns", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("sdr_campaigns")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as SDRCampaign[];
    },
    enabled: !!workspaceId,
  });

  const createCampaign = useMutation({
    mutationFn: async (input: { name: string; description?: string; sequence_id?: string; auto_enroll_enabled?: boolean; auto_enroll_min_score?: number }) => {
      if (!workspaceId) throw new Error("No workspace");
      const { data, error } = await supabase
        .from("sdr_campaigns")
        .insert({
          workspace_id: workspaceId,
          name: input.name,
          description: input.description || null,
          sequence_id: input.sequence_id || null,
          auto_enroll_enabled: input.auto_enroll_enabled || false,
          auto_enroll_min_score: input.auto_enroll_min_score ?? 70,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sdr-campaigns"] });
      toast.success("Campanha SDR criada");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateCampaign = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; description?: string; status?: string; auto_enroll_enabled?: boolean; auto_enroll_min_score?: number; sequence_id?: string; ai_employee_id?: string }) => {
      const { data, error } = await supabase
        .from("sdr_campaigns")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sdr-campaigns"] });
      toast.success("Campanha atualizada");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sdr_campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sdr-campaigns"] });
      toast.success("Campanha eliminada");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return { campaigns, isLoading, createCampaign, updateCampaign, deleteCampaign };
}

export function useSDREnrollments(campaignId?: string) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  const { data: enrollments = [], isLoading } = useQuery({
    queryKey: ["sdr-enrollments", campaignId, workspaceId],
    queryFn: async () => {
      if (!workspaceId || !campaignId) return [];
      const { data, error } = await supabase
        .from("sdr_enrollments")
        .select("*")
        .eq("campaign_id", campaignId)
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as SDREnrollment[];
    },
    enabled: !!workspaceId && !!campaignId,
  });

  // Compute stats
  const stats = {
    enrolled: enrollments.filter((e) => e.status === "enrolled").length,
    enriching: enrollments.filter((e) => e.status === "enriching").length,
    sequenced: enrollments.filter((e) => e.status === "sequenced").length,
    replied: enrollments.filter((e) => e.status === "replied" || e.status === "positive_reply").length,
    positiveReply: enrollments.filter((e) => e.status === "positive_reply").length,
    meetingSet: enrollments.filter((e) => e.status === "meeting_set").length,
    converted: enrollments.filter((e) => e.status === "converted").length,
    optedOut: enrollments.filter((e) => e.status === "opted_out").length,
    failed: enrollments.filter((e) => e.status === "failed").length,
    total: enrollments.length,
    replyRate: enrollments.length > 0 ? ((enrollments.filter((e) => ["replied", "positive_reply", "meeting_set", "converted"].includes(e.status)).length / enrollments.length) * 100) : 0,
    meetingRate: enrollments.length > 0 ? ((enrollments.filter((e) => ["meeting_set", "converted"].includes(e.status)).length / enrollments.length) * 100) : 0,
    conversionRate: enrollments.length > 0 ? ((enrollments.filter((e) => e.status === "converted").length / enrollments.length) * 100) : 0,
  };

  return { enrollments, isLoading, stats };
}
