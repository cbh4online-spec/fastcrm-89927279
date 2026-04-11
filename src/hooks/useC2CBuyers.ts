import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as _supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

const supabase = _supabase as any;

export interface C2CBuyer {
  id: string;
  user_id: string;
  workspace_id: string;
  display_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  shipping_address: Record<string, any>;
  total_purchases: number;
  total_spent: number;
  loyalty_points: number;
  is_verified: boolean;
  status: "active" | "suspended";
  created_at: string;
  updated_at: string;
}

export function useC2CBuyers() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useQuery<C2CBuyer[]>({
    queryKey: ["c2c-buyers", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("c2c_buyers")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useMyBuyerProfile() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useQuery<C2CBuyer | null>({
    queryKey: ["c2c-my-buyer-profile", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data: { user } } = await _supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("c2c_buyers")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateBuyerProfile() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (updates: Partial<Pick<C2CBuyer, "display_name" | "avatar_url" | "phone" | "shipping_address">>) => {
      const { data: { user } } = await _supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { data, error } = await supabase
        .from("c2c_buyers")
        .update(updates)
        .eq("user_id", user.id)
        .eq("workspace_id", currentWorkspace?.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["c2c-my-buyer-profile"] });
      toast.success("Perfil atualizado");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erro ao atualizar perfil");
    },
  });
}

export function useUpdateBuyerStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ buyerId, status }: { buyerId: string; status: "active" | "suspended" }) => {
      const { error } = await supabase
        .from("c2c_buyers")
        .update({ status })
        .eq("id", buyerId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["c2c-buyers"] });
      toast.success("Estado do comprador atualizado");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erro ao atualizar estado");
    },
  });
}
