import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface ImportProfile {
  id: string;
  workspace_id: string;
  supplier_id: string;
  name: string;
  is_default: boolean;
  is_active: boolean;
  file_type_hint: string | null;
  delimiter_hint: string | null;
  encoding_hint: string | null;
  mapping_json: Record<string, string>;
  pricing_mode: string;
  global_discount_percent: number | null;
  margin_percent: number | null;
  base_price_field: string | null;
  price_is_per_pack: boolean;
  category_discounts_json: Record<string, number> | null;
  matching_strategy_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export function useSupplierImportProfiles(supplierId: string | undefined) {
  const { currentWorkspace } = useWorkspace();
  const [profiles, setProfiles] = useState<ImportProfile[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchProfiles = useCallback(async () => {
    if (!currentWorkspace?.id || !supplierId) { setProfiles([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("supplier_import_profiles" as any)
      .select("*")
      .eq("workspace_id", currentWorkspace.id)
      .eq("supplier_id", supplierId)
      .eq("is_active", true)
      .order("is_default", { ascending: false })
      .order("updated_at", { ascending: false });
    if (!error && data) setProfiles(data as any);
    setLoading(false);
  }, [currentWorkspace?.id, supplierId]);

  useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

  const createProfile = useCallback(async (profile: Partial<ImportProfile> & { name: string }) => {
    if (!currentWorkspace?.id || !supplierId) return null;
    const user = (await supabase.auth.getUser()).data.user;
    const { data, error } = await supabase
      .from("supplier_import_profiles" as any)
      .insert({
        workspace_id: currentWorkspace.id,
        supplier_id: supplierId,
        created_by: user?.id,
        ...profile,
      } as any)
      .select()
      .single();
    if (error) { toast.error("Erro ao criar perfil: " + error.message); return null; }
    await fetchProfiles();
    toast.success("Perfil de importação criado");
    return data as unknown as ImportProfile;
  }, [currentWorkspace?.id, supplierId, fetchProfiles]);

  const updateProfile = useCallback(async (id: string, updates: Partial<ImportProfile>) => {
    const { error } = await supabase
      .from("supplier_import_profiles" as any)
      .update(updates as any)
      .eq("id", id);
    if (error) { toast.error("Erro ao atualizar perfil"); return; }
    await fetchProfiles();
    toast.success("Perfil atualizado");
  }, [fetchProfiles]);

  const setDefault = useCallback(async (id: string) => {
    if (!currentWorkspace?.id || !supplierId) return;
    // Remove default from all
    await supabase
      .from("supplier_import_profiles" as any)
      .update({ is_default: false } as any)
      .eq("workspace_id", currentWorkspace.id)
      .eq("supplier_id", supplierId);
    // Set new default
    await supabase
      .from("supplier_import_profiles" as any)
      .update({ is_default: true } as any)
      .eq("id", id);
    await fetchProfiles();
  }, [currentWorkspace?.id, supplierId, fetchProfiles]);

  return { profiles, loading, fetchProfiles, createProfile, updateProfile, setDefault };
}
