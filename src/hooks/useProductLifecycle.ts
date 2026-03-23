import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ProductChangelogEntry {
  id: string;
  workspace_id: string;
  product_id: string;
  action: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  notes: string | null;
  created_at: string;
}

export function useProductChangelog(productId: string | undefined) {
  return useQuery({
    queryKey: ["product-changelog", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_changelog")
        .select("*")
        .eq("product_id", productId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as ProductChangelogEntry[];
    },
    enabled: !!productId,
  });
}

interface TransitionInput {
  productId: string;
  workspaceId: string;
  newStatus: string;
  notes?: string;
  reviewedBy?: string;
  discontinuedReason?: string;
}

export function useProductStatusTransition() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: TransitionInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get current product status
      const { data: product } = await supabase
        .from("products")
        .select("status, name")
        .eq("id", input.productId)
        .single();

      if (!product) throw new Error("Produto não encontrado");

      const oldStatus = product.status;
      const updates: Record<string, any> = {
        status: input.newStatus,
        updated_at: new Date().toISOString(),
      };

      // Set lifecycle timestamps
      if (input.newStatus === "active" && oldStatus !== "active") {
        updates.published_at = new Date().toISOString();
      }
      if (input.newStatus === "review") {
        // nothing extra
      }
      if (input.newStatus === "active" && oldStatus === "review") {
        updates.reviewed_by = user?.id;
        updates.reviewed_at = new Date().toISOString();
      }
      if (input.newStatus === "discontinued") {
        updates.discontinued_at = new Date().toISOString();
        updates.discontinued_reason = input.discontinuedReason || null;
      }

      const { error: updateErr } = await supabase
        .from("products")
        .update(updates)
        .eq("id", input.productId)
        .eq("workspace_id", input.workspaceId);

      if (updateErr) throw updateErr;

      // Log changelog
      const { error: logErr } = await supabase
        .from("product_changelog")
        .insert({
          workspace_id: input.workspaceId,
          product_id: input.productId,
          action: "status_change",
          field_name: "status",
          old_value: oldStatus,
          new_value: input.newStatus,
          changed_by: user?.id,
          notes: input.notes || null,
        });

      if (logErr) console.warn("Changelog error:", logErr);

      // Create notification for review requests
      if (input.newStatus === "review") {
        await supabase.from("admin_notifications").insert({
          workspace_id: input.workspaceId,
          type: "product_review",
          title: "Produto aguarda aprovação",
          message: `O produto "${product.name}" foi submetido para revisão.`,
          metadata: { product_id: input.productId },
        });
      }

      return { oldStatus, newStatus: input.newStatus };
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["product"] });
      qc.invalidateQueries({ queryKey: ["product-changelog"] });
      
      const labels: Record<string, string> = {
        draft: "Rascunho",
        review: "Em Revisão",
        active: "Ativo",
        discontinued: "Descontinuado",
        archived: "Arquivado",
      };
      toast.success(`Estado alterado para "${labels[result.newStatus] ?? result.newStatus}"`);
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useLogProductChange() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      workspaceId: string;
      productId: string;
      action: string;
      fieldName?: string;
      oldValue?: string;
      newValue?: string;
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("product_changelog").insert({
        workspace_id: input.workspaceId,
        product_id: input.productId,
        action: input.action,
        field_name: input.fieldName || null,
        old_value: input.oldValue || null,
        new_value: input.newValue || null,
        changed_by: user?.id,
        notes: input.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-changelog"] });
    },
  });
}

// Valid transitions
export function getValidTransitions(currentStatus: string): string[] {
  const transitions: Record<string, string[]> = {
    draft: ["review", "active", "archived"],
    review: ["active", "draft"],
    active: ["discontinued", "archived"],
    discontinued: ["active", "archived"],
    archived: ["draft"],
  };
  return transitions[currentStatus] ?? [];
}
