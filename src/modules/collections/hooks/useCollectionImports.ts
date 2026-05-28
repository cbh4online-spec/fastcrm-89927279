import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { extractPdfText, hashFile } from "../lib/pdfText";
import { parseArtsoftStatement, type ArtsoftClient } from "../lib/artsoftParser";

export interface CollectionImportRow {
  id: string;
  workspace_id: string;
  source: string;
  file_name: string;
  file_hash: string | null;
  storage_path: string | null;
  status: string;
  reference_date: string | null;
  stats: any;
  error_message: string | null;
  created_at: string;
}

export function useCollectionImports() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["collection-imports", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];
      const { data, error } = await supabase
        .from("collection_imports" as any)
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as unknown as CollectionImportRow[];
    },
    enabled: !!currentWorkspace,
  });
}

export function useCollectionImportItems(importId: string | null) {
  return useQuery({
    queryKey: ["collection-import-items", importId],
    queryFn: async () => {
      if (!importId) return [];
      const { data, error } = await supabase
        .from("collection_import_items" as any)
        .select("*")
        .eq("import_id", importId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!importId,
  });
}

async function autoMatchClient(
  workspaceId: string,
  client: ArtsoftClient,
): Promise<{ matched_company_id: string | null; matched_contact_id: string | null }> {
  // 1. Saved manual mapping
  const { data: mapping } = await supabase
    .from("collection_client_mappings" as any)
    .select("company_id, contact_id")
    .eq("workspace_id", workspaceId)
    .eq("source", "artsoft")
    .eq("client_number", client.client_number)
    .maybeSingle();
  if (mapping) {
    return {
      matched_company_id: (mapping as any).company_id ?? null,
      matched_contact_id: (mapping as any).contact_id ?? null,
    };
  }
  // 2. external_id on companies
  const { data: co } = await supabase
    .from("companies")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("external_provider", "artsoft")
    .eq("external_id", client.client_number)
    .maybeSingle();
  if (co) return { matched_company_id: co.id, matched_contact_id: null };
  // 3. external_id on contacts
  const { data: ct } = await supabase
    .from("contacts")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("external_provider", "artsoft")
    .eq("external_id", client.client_number)
    .maybeSingle();
  if (ct) return { matched_company_id: null, matched_contact_id: ct.id };
  return { matched_company_id: null, matched_contact_id: null };
}

export function useUploadAndAnalyze() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!currentWorkspace) throw new Error("Sem workspace activo");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      // 1. Hash + parse client-side
      const file_hash = await hashFile(file);

      // 1a. Already imported?
      const { data: existing } = await supabase
        .from("collection_imports" as any)
        .select("id, status")
        .eq("workspace_id", currentWorkspace.id)
        .eq("file_hash", file_hash)
        .maybeSingle();
      if (existing) {
        toast.warning("Este ficheiro já foi importado anteriormente.");
        return (existing as any).id as string;
      }

      const text = await extractPdfText(file);
      const parsed = parseArtsoftStatement(text);
      if (parsed.total_docs === 0) throw new Error("Não foram detectadas linhas de documento neste PDF.");

      // 2. Upload PDF
      const importId = crypto.randomUUID();
      const path = `${currentWorkspace.id}/${importId}.pdf`;
      const { error: upErr } = await supabase.storage
        .from("collections-imports")
        .upload(path, file, { contentType: "application/pdf", upsert: false });
      if (upErr) console.warn("Storage upload falhou (continuando):", upErr.message);

      // 3. Create import header
      const { error: insErr } = await supabase.from("collection_imports" as any).insert({
        id: importId,
        workspace_id: currentWorkspace.id,
        source: "artsoft",
        file_name: file.name,
        file_hash,
        storage_path: upErr ? null : path,
        status: "analyzing",
        reference_date: parsed.reference_date,
        uploaded_by: user.id,
        stats: {
          total_clients: parsed.total_clients,
          total_docs: parsed.total_docs,
          total_due: parsed.total_due,
          warnings: parsed.warnings.length,
        },
      });
      if (insErr) throw insErr;

      // 4. Auto-match clients & insert items in batches
      const items: any[] = [];
      let matched_clients = 0;
      let unmatched_clients = 0;
      for (const c of parsed.clients) {
        const m = await autoMatchClient(currentWorkspace.id, c);
        const hasMatch = !!(m.matched_company_id || m.matched_contact_id);
        if (hasMatch) matched_clients++;
        else unmatched_clients++;
        for (const d of c.docs) {
          items.push({
            import_id: importId,
            workspace_id: currentWorkspace.id,
            entity_type: "invoice",
            source_key: `artsoft:${d.doc_no}`,
            client_number: c.client_number,
            client_name: c.name,
            client_address: c.address,
            client_email: c.email,
            doc_type: d.doc_type,
            doc_no: d.doc_no,
            doc_third_no: d.doc_third_no,
            doc_date: d.doc_date,
            due_date: d.due_date,
            total: d.total,
            balance: d.balance,
            matched_company_id: m.matched_company_id,
            matched_contact_id: m.matched_contact_id,
            action: hasMatch ? "pending" : "needs_mapping",
            raw: { is_inactive: c.is_inactive, overdue_days: d.overdue_days },
          });
        }
      }

      // 5. Insert in chunks of 500
      for (let i = 0; i < items.length; i += 500) {
        const chunk = items.slice(i, i + 500);
        const { error: itemsErr } = await supabase
          .from("collection_import_items" as any)
          .insert(chunk);
        if (itemsErr) throw itemsErr;
      }

      // 6. Update header status + final stats
      await supabase
        .from("collection_imports" as any)
        .update({
          status: "review",
          stats: {
            total_clients: parsed.total_clients,
            matched_clients,
            unmatched_clients,
            total_docs: parsed.total_docs,
            total_due: parsed.total_due,
            warnings: parsed.warnings.slice(0, 20),
          },
        })
        .eq("id", importId);

      return importId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["collection-imports"] });
      toast.success("Extrato analisado com sucesso");
    },
    onError: (e: Error) => toast.error(`Erro a analisar: ${e.message}`),
  });
}

export function useApplyImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (importId: string) => {
      const { data, error } = await supabase.functions.invoke("collections-import-apply", {
        body: { import_id: importId },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["collection-imports"] });
      qc.invalidateQueries({ queryKey: ["collection-import-items"] });
      qc.invalidateQueries({ queryKey: ["collection-cases"] });
      toast.success("Importação aplicada");
    },
    onError: (e: Error) => toast.error(`Erro a aplicar: ${e.message}`),
  });
}

export function useDeleteImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("collection_imports" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["collection-imports"] }),
  });
}
