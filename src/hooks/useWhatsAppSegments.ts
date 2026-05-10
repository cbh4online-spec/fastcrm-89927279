import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface SegmentFilters {
  tags_any?: string[];
  tags_all?: string[];
  tags_none?: string[];
  temperature?: ("cold" | "warm" | "hot")[];
  client_status?: string[];
  score_min?: number | null;
  score_max?: number | null;
  has_email?: boolean | null;
  has_phone?: boolean | null;
  country?: string | null;
  city?: string | null;
  source?: string | null;
  last_contact_days?: number | null; // contactado nos últimos N dias
  inactive_days?: number | null;     // sem contacto há mais de N dias
  created_within_days?: number | null;
  search?: string | null; // procura no nome/email/empresa
}

export interface WhatsAppSegment {
  id: string;
  workspace_id: string;
  created_by: string;
  name: string;
  description: string | null;
  filters: SegmentFilters;
  cached_count: number;
  cached_at: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export function useWhatsAppSegments() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["whatsapp-segments", currentWorkspace?.id],
    enabled: !!currentWorkspace?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_segments" as never)
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .eq("is_archived", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as WhatsAppSegment[];
    },
  });
}

export function buildContactsQuery(workspaceId: string, filters: SegmentFilters) {
  let q = supabase
    .from("contacts")
    .select("id, name, phone, email, company, tags, ai_temperature, contact_score, last_contact_at, country, city, source, created_at, client_status", { count: "exact" })
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .not("phone", "is", null);

  if (filters.tags_any?.length) q = q.overlaps("tags", filters.tags_any);
  if (filters.tags_all?.length) q = q.contains("tags", filters.tags_all);
  if (filters.temperature?.length) q = q.in("ai_temperature", filters.temperature);
  if (filters.client_status?.length) q = q.in("client_status", filters.client_status);
  if (typeof filters.score_min === "number") q = q.gte("contact_score", filters.score_min);
  if (typeof filters.score_max === "number") q = q.lte("contact_score", filters.score_max);
  if (filters.has_email === true) q = q.not("email", "is", null);
  if (filters.has_email === false) q = q.is("email", null);
  if (filters.country) q = q.ilike("country", filters.country);
  if (filters.city) q = q.ilike("city", `%${filters.city}%`);
  if (filters.source) q = q.eq("source", filters.source);

  if (typeof filters.last_contact_days === "number") {
    const since = new Date(Date.now() - filters.last_contact_days * 86400000).toISOString();
    q = q.gte("last_contact_at", since);
  }
  if (typeof filters.inactive_days === "number") {
    const before = new Date(Date.now() - filters.inactive_days * 86400000).toISOString();
    q = q.or(`last_contact_at.lt.${before},last_contact_at.is.null`);
  }
  if (typeof filters.created_within_days === "number") {
    const since = new Date(Date.now() - filters.created_within_days * 86400000).toISOString();
    q = q.gte("created_at", since);
  }
  if (filters.search) {
    const s = filters.search.replace(/[%,]/g, "");
    q = q.or(`name.ilike.%${s}%,email.ilike.%${s}%,company.ilike.%${s}%`);
  }
  return q;
}

export function useSegmentPreview(filters: SegmentFilters | null) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["whatsapp-segment-preview", currentWorkspace?.id, filters],
    enabled: !!currentWorkspace?.id && !!filters,
    queryFn: async () => {
      const q = buildContactsQuery(currentWorkspace!.id, filters!).limit(50);
      const { data, count, error } = await q;
      if (error) throw error;
      // tags_none filter (post-fetch since arr-not-overlaps not available cleanly)
      let rows = (data ?? []) as unknown as Array<Record<string, unknown> & { tags?: string[] }>;
      if (filters!.tags_none?.length) {
        rows = rows.filter((r) => !(r.tags ?? []).some((t) => filters!.tags_none!.includes(t)));
      }
      if (filters!.has_phone === false) rows = rows.filter((r) => !r.phone);
      return { rows, total: count ?? 0 };
    },
  });
}

export function useAvailableTags() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["contact-tags-distinct", currentWorkspace?.id],
    enabled: !!currentWorkspace?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("tags")
        .eq("workspace_id", currentWorkspace!.id)
        .is("deleted_at", null)
        .not("tags", "is", null)
        .limit(2000);
      if (error) throw error;
      const set = new Set<string>();
      (data ?? []).forEach((r) => (r.tags ?? []).forEach((t: string) => t && set.add(t)));
      return Array.from(set).sort();
    },
  });
}

export function useSaveSegment() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: { id?: string; name: string; description?: string; filters: SegmentFilters; cached_count?: number }) => {
      if (!currentWorkspace || !user) throw new Error("Sem workspace ou utilizador");
      const payload = {
        workspace_id: currentWorkspace.id,
        created_by: user.id,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        filters: input.filters as never,
        cached_count: input.cached_count ?? 0,
        cached_at: new Date().toISOString(),
      };
      if (input.id) {
        const { error } = await supabase.from("whatsapp_segments" as never).update(payload).eq("id", input.id);
        if (error) throw error;
        return input.id;
      }
      const { data, error } = await supabase.from("whatsapp_segments" as never).insert(payload).select("id").single();
      if (error) throw error;
      return (data as { id: string }).id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp-segments"] });
      toast({ title: "Segmento guardado" });
    },
    onError: (e) => toast({ title: "Erro", description: e instanceof Error ? e.message : "Falhou", variant: "destructive" }),
  });
}

export function useDeleteSegment() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("whatsapp_segments" as never).update({ is_archived: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp-segments"] });
      toast({ title: "Segmento removido" });
    },
    onError: (e) => toast({ title: "Erro", description: e instanceof Error ? e.message : "Falhou", variant: "destructive" }),
  });
}
