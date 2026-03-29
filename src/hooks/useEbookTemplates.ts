import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import type { EbookTemplate, StyleTokens, LayoutKey } from "@/types/ebook-templates";

function mapTemplate(row: any): EbookTemplate {
  return {
    ...row,
    use_cases: Array.isArray(row.use_cases) ? row.use_cases : [],
    preview_images: Array.isArray(row.preview_images) ? row.preview_images : [],
    style_tokens: row.style_tokens || {},
    page_layouts: Array.isArray(row.page_layouts) ? row.page_layouts : [],
    content_slots: row.content_slots || {},
    default_content: row.default_content || {},
  };
}

export function useEbookTemplates(filters?: { category?: string }) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["ebook-templates", currentWorkspace?.id, filters],
    queryFn: async () => {
      let query = (supabase as any)
        .from("ebook_templates")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (filters?.category) {
        query = query.eq("category", filters.category);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(mapTemplate) as EbookTemplate[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useEbookTemplate(id: string | undefined) {
  return useQuery({
    queryKey: ["ebook-template", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await (supabase as any)
        .from("ebook_templates")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data ? mapTemplate(data) : null;
    },
    enabled: !!id,
  });
}

export function useCreateEbookTemplate() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      description?: string;
      category?: string;
      style_family?: string;
      style_tokens?: Partial<StyleTokens>;
      page_layouts?: LayoutKey[];
      default_content?: Record<string, string>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const baseSlug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);
      const slug = `${baseSlug}-${Date.now().toString(36).slice(-5)}`;
      const { data, error } = await (supabase as any).from("ebook_templates").insert({
        workspace_id: currentWorkspace!.id,
        name: input.name,
        slug,
        description: input.description || null,
        category: input.category || "minimal",
        style_family: input.style_family || "minimal",
        style_tokens: input.style_tokens || {},
        page_layouts: input.page_layouts || [],
        default_content: input.default_content || {},
        created_by: user?.id,
      }).select().single();
      if (error) throw error;
      return mapTemplate(data);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ebook-templates"] }); toast.success("Template criado!"); },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}

export function useDuplicateEbookTemplate() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (templateId: string) => {
      const { data: original, error: fetchErr } = await (supabase as any)
        .from("ebook_templates")
        .select("*")
        .eq("id", templateId)
        .single();
      if (fetchErr) throw fetchErr;
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await (supabase as any).from("ebook_templates").insert({
        workspace_id: currentWorkspace!.id,
        name: `${original.name} (cópia)`,
        slug: `${original.slug}-copy-${Date.now()}`,
        description: original.description,
        category: original.category,
        style_family: original.style_family,
        use_cases: original.use_cases,
        style_tokens: original.style_tokens,
        page_layouts: original.page_layouts,
        content_slots: original.content_slots,
        default_content: original.default_content,
        is_system_template: false,
        created_by: user?.id,
      }).select().single();
      if (error) throw error;
      return mapTemplate(data);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ebook-templates"] }); toast.success("Template duplicado!"); },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}

export function useUpdateEbookTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Pick<EbookTemplate, "name" | "description" | "category" | "style_tokens" | "page_layouts" | "default_content" | "is_active">>) => {
      const { data, error } = await (supabase as any).from("ebook_templates")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id).select().single();
      if (error) throw error;
      return mapTemplate(data);
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["ebook-templates"] });
      qc.invalidateQueries({ queryKey: ["ebook-template", data.id] });
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
}
