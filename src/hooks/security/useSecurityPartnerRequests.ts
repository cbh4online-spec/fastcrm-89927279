import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export function useSecurityPartnerRequests() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["security-partner-requests", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("security_partner_requests")
        .select("*, security_partners(name)")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId,
  });

  const createRequest = useMutation({
    mutationFn: async (values: {
      partner_id?: string;
      source_channel: string;
      raw_text: string;
      notes?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("security_partner_requests")
        .insert({
          ...values,
          workspace_id: workspaceId!,
          created_by: user.user?.id,
          extraction_status: "pending",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["security-partner-requests"] });
      toast.success("Pedido criado");
    },
  });

  const updateRequest = useMutation({
    mutationFn: async ({ id, ...values }: { id: string; [key: string]: any }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("security_partner_requests")
        .update({ ...values, updated_by: user.user?.id, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["security-partner-requests"] });
    },
  });

  const extractData = useMutation({
    mutationFn: async (requestId: string) => {
      const request = requests.find((r) => r.id === requestId);
      if (!request) throw new Error("Request not found");

      // Update status to processing
      await supabase
        .from("security_partner_requests")
        .update({ extraction_status: "processing" })
        .eq("id", requestId);

      // Call edge function for AI extraction
      const { data, error } = await supabase.functions.invoke("security-extract-request", {
        body: { request_id: requestId, raw_text: request.raw_text, workspace_id: workspaceId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["security-partner-requests"] });
      toast.success("Dados extraídos com sucesso");
    },
    onError: (err) => {
      toast.error("Erro na extração: " + (err as Error).message);
    },
  });

  return { requests, isLoading, createRequest, updateRequest, extractData };
}
