import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface SaftImport {
  id: string;
  workspace_id: string;
  uploaded_by: string;
  file_name: string;
  file_hash: string;
  file_size: number;
  storage_path: string;
  saft_type: "billing" | "accounting" | "self_billing" | null;
  saft_version: string | null;
  software_company: string | null;
  tax_registration_number: string | null;
  fiscal_year: number | null;
  period_start: string | null;
  period_end: string | null;
  status:
    | "uploaded"
    | "analyzing"
    | "preview_ready"
    | "importing"
    | "completed"
    | "failed"
    | "cancelled";
  stats: Record<string, any>;
  options: Record<string, any>;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

async function sha256(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function useSaftImports() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;
  return useQuery({
    queryKey: ["saft-imports", wid],
    enabled: !!wid,
    queryFn: async (): Promise<SaftImport[]> => {
      const { data, error } = await (supabase as any)
        .from("saft_imports")
        .select("*")
        .eq("workspace_id", wid)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: (q) => {
      const list = (q.state.data as SaftImport[] | undefined) ?? [];
      return list.some((r) => ["analyzing", "importing", "uploaded"].includes(r.status)) ? 3000 : false;
    },
  });
}

export function useSaftImport(id: string | undefined) {
  return useQuery({
    queryKey: ["saft-import", id],
    enabled: !!id,
    queryFn: async (): Promise<SaftImport | null> => {
      const { data, error } = await (supabase as any)
        .from("saft_imports")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    refetchInterval: (q) => {
      const r = q.state.data as SaftImport | null | undefined;
      return r && ["analyzing", "importing", "uploaded"].includes(r.status) ? 2000 : false;
    },
  });
}

export function useSaftImportItems(importId: string | undefined, isLive = false) {
  return useQuery({
    queryKey: ["saft-import-items", importId],
    enabled: !!importId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("saft_import_items")
        .select("*")
        .eq("import_id", importId)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: isLive ? 2000 : false,
  });
}

export function useUploadSaft() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File): Promise<string> => {
      if (!currentWorkspace?.id) throw new Error("Workspace não selecionado");
      if (file.size > 50 * 1024 * 1024) throw new Error("Ficheiro maior que 50 MB");

      const hash = await sha256(file);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      // Detectar duplicado por hash
      const { data: existing } = await (supabase as any)
        .from("saft_imports")
        .select("id, status")
        .eq("workspace_id", currentWorkspace.id)
        .eq("file_hash", hash)
        .maybeSingle();
      if (existing) {
        toast.info("Este ficheiro SAF-T já foi importado anteriormente.");
        return existing.id;
      }

      // Reservar id e fazer upload
      const importId = crypto.randomUUID();
      const path = `${currentWorkspace.id}/${importId}/${file.name}`;

      const { error: upErr } = await supabase.storage
        .from("saft-imports")
        .upload(path, file, { contentType: "application/xml", upsert: false });
      if (upErr) throw upErr;

      const { error: insErr } = await (supabase as any).from("saft_imports").insert({
        id: importId,
        workspace_id: currentWorkspace.id,
        uploaded_by: user.id,
        file_name: file.name,
        file_hash: hash,
        file_size: file.size,
        storage_path: path,
        status: "uploaded",
      });
      if (insErr) throw insErr;

      // Disparar análise
      const { error: fnErr } = await supabase.functions.invoke("saft-analyze", {
        body: { import_id: importId },
      });
      if (fnErr) console.warn("saft-analyze invoke error", fnErr);

      return importId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saft-imports"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRunSaftImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { importId: string; options?: { create_customers?: boolean; create_products?: boolean; import_payments?: boolean } }) => {
      const { data, error } = await supabase.functions.invoke("saft-import", {
        body: { import_id: input.importId, options: input.options ?? {} },
      });
      if (error) throw error;
      if (data?.ok === false) throw new Error(data.error || "Falha na importação");
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["saft-imports"] });
      qc.invalidateQueries({ queryKey: ["saft-import", vars.importId] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Importação SAF-T concluída.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
