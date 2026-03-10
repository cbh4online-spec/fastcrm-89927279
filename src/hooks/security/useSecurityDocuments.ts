import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export function useSecurityDocuments(filters?: { status?: string; document_type?: string }) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const qc = useQueryClient();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["security-documents", workspaceId, filters],
    queryFn: async () => {
      if (!workspaceId) return [];
      let query = supabase
        .from("security_documents")
        .select("*, security_systems(system_type, security_installation_sites(site_name))")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      
      if (filters?.status) query = query.eq("status", filters.status);
      if (filters?.document_type) query = query.eq("document_type", filters.document_type);
      
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!workspaceId,
  });

  const createDocument = useMutation({
    mutationFn: async (values: Record<string, any>) => {
      const payload = { ...values, workspace_id: workspaceId, version_number: 1 } as any;
      const { data, error } = await supabase
        .from("security_documents")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["security-documents"] });
      toast.success("Documento criado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateDocument = useMutation({
    mutationFn: async ({ id, ...values }: Record<string, any>) => {
      const { data, error } = await supabase
        .from("security_documents")
        .update(values)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["security-documents"] });
      toast.success("Documento atualizado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const validateDocument = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("security_documents")
        .update({ status: "validated" })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["security-documents"] });
      toast.success("Documento validado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const emitDocument = useMutation({
    mutationFn: async (id: string) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("security_documents")
        .update({
          status: "emitted",
          emitted_at: new Date().toISOString(),
          emitted_by: user?.user?.id,
        })
        .eq("id", id)
        .eq("status", "validated") // Only validated docs can be emitted
        .select()
        .single();
      if (error) throw error;
      if (!data) throw new Error("Apenas documentos validados podem ser emitidos");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["security-documents"] });
      toast.success("Documento emitido com sucesso");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const createNewVersion = useMutation({
    mutationFn: async ({ originalId, source_data_json }: { originalId: string; source_data_json: any }) => {
      // Fetch original
      const { data: original, error: fetchErr } = await supabase
        .from("security_documents")
        .select("*")
        .eq("id", originalId)
        .single();
      if (fetchErr || !original) throw fetchErr || new Error("Documento não encontrado");

      // Archive original
      await supabase.from("security_documents").update({ status: "archived" }).eq("id", originalId);

      // Create new version
      const { id, created_at, updated_at, emitted_at, emitted_by, ...rest } = original as any;
      const payload = {
        ...rest,
        version_number: (original.version_number || 1) + 1,
        status: "draft",
        source_data_json: source_data_json || original.source_data_json,
        validation_notes: null,
      } as any;
      const { data, error } = await supabase
        .from("security_documents")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["security-documents"] });
      toast.success("Nova versão criada");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { documents, isLoading, createDocument, updateDocument, validateDocument, emitDocument, createNewVersion };
}

export function useSecurityDocument(id: string | undefined) {
  return useQuery({
    queryKey: ["security-document", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("security_documents")
        .select("*, security_systems(*, security_installation_sites(*), security_installed_devices(*, security_equipment_catalog(brand, model, reference), security_system_zones(zone_name)), security_system_zones(*)), security_contracts(*)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useDocumentVersionHistory(systemId: string | undefined, documentType: string | undefined) {
  return useQuery({
    queryKey: ["security-document-versions", systemId, documentType],
    queryFn: async () => {
      if (!systemId || !documentType) return [];
      const { data, error } = await supabase
        .from("security_documents")
        .select("id, version_number, status, created_at, emitted_at, emitted_by")
        .eq("system_id", systemId)
        .eq("document_type", documentType)
        .order("version_number", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!systemId && !!documentType,
  });
}
