import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface EbookChapter {
  id: string;
  title: string;
  description?: string;
  content: string;
  sections?: string[];
  cover_image?: string;
}

export interface EbookContactPage {
  email?: string;
  phone?: string;
  website?: string;
  slogan?: string;
  logo_url?: string;
  social_links?: { label: string; url: string }[];
}

export interface Ebook {
  id: string;
  workspace_id: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  author_name?: string | null;
  cover_url?: string | null;
  chapters: EbookChapter[];
  metadata?: Record<string, unknown>;
  pdf_storage_path?: string | null;
  slug?: string | null;
  status: "draft" | "published" | "archived";
  header_text?: string | null;
  footer_text?: string | null;
  contact_page?: EbookContactPage | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export function useEbooks() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["ebooks", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await (supabase as any)
        .from("ebooks")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((e: any) => ({
        ...e,
        chapters: Array.isArray(e.chapters) ? e.chapters : [],
      })) as Ebook[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useEbook(id: string | undefined) {
  return useQuery({
    queryKey: ["ebook", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await (supabase as any)
        .from("ebooks")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return { ...data, chapters: Array.isArray(data.chapters) ? data.chapters : [] } as Ebook;
    },
    enabled: !!id,
  });
}

export function useCreateEbook() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: { title: string; subtitle?: string; description?: string; author_name?: string; chapters?: EbookChapter[] }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const slug = input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
      const { data, error } = await (supabase as any).from("ebooks").insert({
        workspace_id: currentWorkspace!.id,
        title: input.title,
        subtitle: input.subtitle || null,
        description: input.description || null,
        author_name: input.author_name || null,
        chapters: input.chapters || [],
        slug,
        created_by: user?.id,
      }).select().single();
      if (error) throw error;
      return data as Ebook;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ebooks"] }); toast.success("eBook criado!"); },
    onError: (e: Error) => toast.error("Erro ao criar eBook: " + e.message),
  });
}

export function useUpdateEbook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Pick<Ebook, "title" | "subtitle" | "description" | "author_name" | "cover_url" | "chapters" | "status" | "slug" | "pdf_storage_path" | "header_text" | "footer_text" | "contact_page">>) => {
      const { data, error } = await (supabase as any).from("ebooks").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id).select().single();
      if (error) throw error;
      return data as Ebook;
    },
    onSuccess: (data) => { qc.invalidateQueries({ queryKey: ["ebooks"] }); qc.invalidateQueries({ queryKey: ["ebook", data.id] }); },
    onError: (e: Error) => toast.error("Erro ao guardar: " + e.message),
  });
}

export function useDeleteEbook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("ebooks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ebooks"] }); toast.success("eBook eliminado"); },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}
