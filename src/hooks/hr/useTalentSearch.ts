import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface TalentResult {
  id: string;
  workspace_id: string;
  search_type: string;
  search_query: string;
  source_url: string | null;
  source_platform: string | null;
  title: string | null;
  description: string | null;
  location: string | null;
  skills: string[];
  raw_content: string | null;
  extracted_data: Record<string, any>;
  status: string;
  imported_as: string | null;
  imported_id: string | null;
  created_at: string;
}

export function useTalentResults(filters?: { search_type?: string; status?: string }) {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["hr-talent-results", wsId, filters],
    queryFn: async () => {
      let query = supabase
        .from("hr_talent_results" as any)
        .select("*")
        .eq("workspace_id", wsId!)
        .order("created_at", { ascending: false })
        .limit(100);

      if (filters?.search_type) {
        query = query.eq("search_type", filters.search_type);
      }
      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as TalentResult[];
    },
    enabled: !!wsId,
  });
}

export function useSearchTalent() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ search_type, query, location, rss_url }: {
      search_type: string;
      query?: string;
      location?: string;
      rss_url?: string;
    }) => {
      if (!wsId) throw new Error("Sem workspace");

      const { data, error } = await supabase.functions.invoke("hr-talent-search", {
        body: { search_type, query, location, workspace_id: wsId, rss_url },
      });

      if (error) throw error;
      if (data?.error) {
        if (data.code === "CREDITS_EXHAUSTED") {
          throw new Error("Créditos Firecrawl insuficientes. Recarregue a sua conta.");
        }
        throw new Error(data.error);
      }
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["hr-talent-results"] });
      toast.success(`${data.count || 0} resultados encontrados`);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erro na pesquisa");
    },
  });
}

export function useDismissTalentResult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("hr_talent_results" as any)
        .update({ status: "dismissed" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr-talent-results"] }),
  });
}

export function useImportTalentResult() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ result, importAs }: { result: TalentResult; importAs: "candidate" | "job_posting" }) => {
      if (!wsId) throw new Error("Sem workspace");
      const ed = result.extracted_data || {};

      if (importAs === "candidate") {
        const nameParts = (ed.name || result.title || "Desconhecido").split(" ");
        const firstName = nameParts[0] || "Desconhecido";
        const lastName = nameParts.slice(1).join(" ") || "";
        const email = ed.email && ed.email !== "---@---" ? ed.email : `imported-${Date.now()}@talent-search.local`;

        const { data: cand, error: candErr } = await supabase
          .from("hr_candidates" as any)
          .insert({
            workspace_id: wsId,
            first_name: firstName,
            last_name: lastName,
            email,
            phone: ed.phone || "",
            linkedin_url: ed.linkedin_url || result.source_url || "",
            source: `talent-search:${result.source_platform || "web"}`,
            stage: "new",
            location: result.location || ed.location || "",
          })
          .select("id")
          .single();

        if (candErr) throw candErr;
        const candData = cand as unknown as { id: string };

        await supabase
          .from("hr_talent_results" as any)
          .update({ status: "imported", imported_as: "candidate", imported_id: candData.id })
          .eq("id", result.id);

        return { importedId: candData.id, type: "candidate" };
      } else {
        const { data: job, error: jobErr } = await supabase
          .from("hr_job_postings" as any)
          .insert({
            workspace_id: wsId,
            title: ed.job_title || result.title || "Vaga importada",
            description: result.description || "",
            location: result.location || "",
            employment_type: ed.employment_type || "full_time",
            status: "draft",
          })
          .select("id")
          .single();

        if (jobErr) throw jobErr;
        const jobData = job as unknown as { id: string };

        await supabase
          .from("hr_talent_results" as any)
          .update({ status: "imported", imported_as: "job_posting", imported_id: jobData.id })
          .eq("id", result.id);

        return { importedId: jobData.id, type: "job_posting" };
      }
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["hr-talent-results"] });
      toast.success(data.type === "candidate" ? "Candidato importado com sucesso" : "Vaga importada com sucesso");
    },
    onError: () => toast.error("Erro ao importar"),
  });
}
