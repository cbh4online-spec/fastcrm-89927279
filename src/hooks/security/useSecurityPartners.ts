import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as _supabase } from "@/integrations/supabase/client";
const supabase = _supabase as any;
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export function useSecurityPartners() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  const { data: partners = [], isLoading } = useQuery({
    queryKey: ["security-partners", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("security_partners")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId,
  });

  const createPartner = useMutation({
    mutationFn: async (values: { name: string; partner_code?: string; zone?: string; notes?: string }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("security_partners")
        .insert({ ...values, workspace_id: workspaceId!, created_by: user.user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["security-partners"] });
      toast.success("Parceiro criado");
    },
  });

  return { partners, isLoading, createPartner };
}
