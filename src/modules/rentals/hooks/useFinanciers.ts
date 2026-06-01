import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Financier {
  id: string;
  name: string;
  tax_id: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinancierInput {
  name: string;
  tax_id?: string | null;
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  notes?: string | null;
}

const SELECT_COLS =
  "id,name,tax_id,address,postal_code,city,email,phone,website,notes,created_at,updated_at";

export function useFinanciers(search?: string) {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;

  return useQuery({
    queryKey: ["financiers", wid, search],
    queryFn: async () => {
      if (!wid) return [] as Financier[];
      let q = supabase
        .from("companies")
        .select(SELECT_COLS)
        .eq("workspace_id", wid)
        .eq("is_financier", true)
        .order("name", { ascending: true })
        .limit(500);
      if (search) q = q.or(`name.ilike.%${search}%,tax_id.ilike.%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Financier[];
    },
    enabled: !!wid,
  });
}

export function useCreateFinancier() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: FinancierInput) => {
      if (!currentWorkspace?.id || !user?.id) throw new Error("Sem workspace");
      const { data, error } = await supabase
        .from("companies")
        .insert({
          workspace_id: currentWorkspace.id,
          created_by: user.id,
          is_financier: true,
          entity_type: "financier",
          ...input,
        })
        .select(SELECT_COLS)
        .single();
      if (error) throw error;
      return data as Financier;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["financiers"] });
      toast.success("Financiadora criada");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro a criar financiadora"),
  });
}

export function useUpdateFinancier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: FinancierInput & { id: string }) => {
      const { data, error } = await supabase
        .from("companies")
        .update(patch)
        .eq("id", id)
        .select(SELECT_COLS)
        .single();
      if (error) throw error;
      return data as Financier;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["financiers"] });
      toast.success("Financiadora atualizada");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro a atualizar"),
  });
}

export function useRemoveFinancier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Soft remove: apenas remove o flag de financiadora, preserva empresa
      const { error } = await supabase
        .from("companies")
        .update({ is_financier: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["financiers"] });
      toast.success("Removida da lista de financiadoras");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro a remover"),
  });
}
