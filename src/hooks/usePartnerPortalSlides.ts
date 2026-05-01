import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type PartnerSlideKind = "campaign" | "training" | "launch" | "education";

export interface PartnerPortalSlide {
  id: string;
  workspace_id: string;
  kind: PartnerSlideKind;
  eyebrow: string | null;
  title: string;
  subtitle: string | null;
  description: string | null;
  image_url: string | null;
  cta_label: string | null;
  cta_url: string | null;
  starts_at: string | null;
  ends_at: string | null;
  display_order: number;
  is_active: boolean;
  theme: string;
  created_at: string;
  updated_at: string;
}

const sb = supabase as any;

/**
 * Slides ativos visíveis no hero do portal (filtra janela de exibição).
 */
export function useActivePartnerSlides(workspaceId?: string | null) {
  return useQuery({
    queryKey: ["partner-portal-slides", "active", workspaceId],
    enabled: !!workspaceId,
    staleTime: 60_000,
    queryFn: async (): Promise<PartnerPortalSlide[]> => {
      const { data, error } = await sb
        .from("partner_portal_slides")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) {
        console.warn("[partner-slides] fetch failed", error.message);
        return [];
      }
      const now = Date.now();
      return (data as PartnerPortalSlide[]).filter((s) => {
        const startsOk = !s.starts_at || new Date(s.starts_at).getTime() <= now;
        const endsOk = !s.ends_at || new Date(s.ends_at).getTime() >= now;
        return startsOk && endsOk;
      });
    },
  });
}

/**
 * Todos os slides (incluindo inativos) — para a UI de gestão.
 */
export function useAllPartnerSlides(workspaceId?: string | null) {
  return useQuery({
    queryKey: ["partner-portal-slides", "all", workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<PartnerPortalSlide[]> => {
      const { data, error } = await sb
        .from("partner_portal_slides")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PartnerPortalSlide[];
    },
  });
}

export function useUpsertPartnerSlide(workspaceId?: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (slide: Partial<PartnerPortalSlide> & { workspace_id: string }) => {
      const payload = { ...slide };
      const { data, error } = await sb
        .from("partner_portal_slides")
        .upsert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as PartnerPortalSlide;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partner-portal-slides"] });
      toast.success("Slide guardado");
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao guardar slide"),
  });
}

export function useDeletePartnerSlide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("partner_portal_slides").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partner-portal-slides"] });
      toast.success("Slide removido");
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao remover slide"),
  });
}

export const PARTNER_SLIDE_KIND_LABEL: Record<PartnerSlideKind, string> = {
  campaign: "Campanha",
  training: "Formação",
  launch: "Lançamento",
  education: "Conteúdo educativo",
};

export const PARTNER_SLIDE_KIND_ACCENT: Record<PartnerSlideKind, string> = {
  campaign: "Campanha em destaque",
  training: "Formação · Webinar",
  launch: "Novo lançamento",
  education: "Protocolo · Educação",
};
