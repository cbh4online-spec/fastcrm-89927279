import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface BioPage {
  id: string;
  workspace_id: string;
  slug: string;
  name: string;
  status: string;
  short_code: string;
  seo_title: string | null;
  seo_description: string | null;
  og_image: string | null;
  primary_color: string;
  background_style: Record<string, any> | null;
  custom_css: string | null;
  created_at: string;
  updated_at: string;
}

export function useBioPages() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["bio-pages", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from("bio_pages")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as BioPage[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useBioPage(id: string | null) {
  return useQuery({
    queryKey: ["bio-page", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("bio_pages")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as BioPage;
    },
    enabled: !!id,
  });
}

export function useCreateBioPage() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: { name: string; slug: string; primary_color?: string }) => {
      if (!currentWorkspace?.id) throw new Error("Sem workspace");
      const { data, error } = await supabase
        .from("bio_pages")
        .insert({ ...input, workspace_id: currentWorkspace.id })
        .select()
        .single();
      if (error) throw error;
      return data as BioPage;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bio-pages"] });
      toast.success("Página Bio criada");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

export function useUpdateBioPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<BioPage> & { id: string }) => {
      const { data, error } = await supabase
        .from("bio_pages")
        .update(input as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as BioPage;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["bio-pages"] });
      qc.invalidateQueries({ queryKey: ["bio-page", d.id] });
      toast.success("Página atualizada");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

export function useDeleteBioPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bio_pages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bio-pages"] });
      toast.success("Página eliminada");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

export function usePublishBioPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "draft" | "live" }) => {
      const { data, error } = await supabase
        .from("bio_pages")
        .update({ status })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as BioPage;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["bio-pages"] });
      qc.invalidateQueries({ queryKey: ["bio-page", d.id] });
      toast.success(d.status === "live" ? "Página publicada!" : "Página despublicada");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}
