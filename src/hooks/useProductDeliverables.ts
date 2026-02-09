import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface ProductDeliverable {
  id: string;
  product_id: string;
  workspace_id: string;
  deliverable_type: "file" | "portal_access" | "course_enrollment" | "license_key";
  label: string;
  config: Record<string, unknown>;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const DELIVERABLE_TYPE_CONFIG = {
  file: { label: "Ficheiro Digital", icon: "FileDown", description: "PDF, ZIP ou outro ficheiro para download" },
  portal_access: { label: "Acesso Portal", icon: "KeyRound", description: "Ativar permissões no portal do cliente" },
  course_enrollment: { label: "Inscrição Curso", icon: "GraduationCap", description: "Inscrever automaticamente no Student Journey" },
  license_key: { label: "Chave de Licença", icon: "Key", description: "Gerar chave de licença única" },
} as const;

export function useProductDeliverables(productId: string | undefined) {
  return useQuery({
    queryKey: ["product-deliverables", productId],
    queryFn: async () => {
      if (!productId) return [];
      const { data, error } = await supabase
        .from("product_deliverables")
        .select("*")
        .eq("product_id", productId)
        .order("sort_order");
      if (error) throw error;
      return (data || []) as unknown as ProductDeliverable[];
    },
    enabled: !!productId,
  });
}

export function useCreateDeliverable() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (data: {
      product_id: string;
      deliverable_type: string;
      label: string;
      config: Record<string, unknown>;
    }) => {
      const { error } = await supabase.from("product_deliverables").insert([{
        product_id: data.product_id,
        deliverable_type: data.deliverable_type,
        label: data.label,
        config: data.config as unknown as Json,
        workspace_id: currentWorkspace?.id!,
      }]);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["product-deliverables", vars.product_id] });
      toast.success("Entregável adicionado");
    },
    onError: (err) => toast.error("Erro: " + err.message),
  });
}

export function useDeleteDeliverable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, productId }: { id: string; productId: string }) => {
      const { error } = await supabase.from("product_deliverables").delete().eq("id", id);
      if (error) throw error;
      return productId;
    },
    onSuccess: (productId) => {
      queryClient.invalidateQueries({ queryKey: ["product-deliverables", productId] });
      toast.success("Entregável removido");
    },
    onError: (err) => toast.error("Erro: " + err.message),
  });
}

export function useToggleDeliverable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, productId, isActive }: { id: string; productId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("product_deliverables")
        .update({ is_active: isActive })
        .eq("id", id);
      if (error) throw error;
      return productId;
    },
    onSuccess: (productId) => {
      queryClient.invalidateQueries({ queryKey: ["product-deliverables", productId] });
    },
  });
}
