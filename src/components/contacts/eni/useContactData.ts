import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { ContactDocument, ContactProduct } from "./ENIContactTypes";

// Documents Hook
export function useContactDocuments(contactId: string | undefined) {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  const documentsQuery = useQuery({
    queryKey: ["contact-documents", contactId],
    queryFn: async () => {
      if (!contactId) return [];
      const { data, error } = await supabase
        .from("contact_documents")
        .select("*")
        .eq("contact_id", contactId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ContactDocument[];
    },
    enabled: !!contactId,
  });

  const uploadDocument = useMutation({
    mutationFn: async ({ 
      file, 
      documentType, 
      notes 
    }: { 
      file: File; 
      documentType: string; 
      notes?: string;
    }) => {
      if (!contactId || !currentWorkspace?.id) throw new Error("Missing data");

      // Upload to storage
      const filePath = `${currentWorkspace.id}/${contactId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("contact-documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("contact-documents")
        .getPublicUrl(filePath);

      // Save to database
      const { data, error } = await supabase
        .from("contact_documents")
        .insert({
          contact_id: contactId,
          workspace_id: currentWorkspace.id,
          document_type: documentType,
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_size: file.size,
          notes,
          uploaded_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-documents", contactId] });
      toast.success("Documento carregado com sucesso");
    },
    onError: () => {
      toast.error("Erro ao carregar documento");
    },
  });

  const deleteDocument = useMutation({
    mutationFn: async (documentId: string) => {
      const doc = documentsQuery.data?.find(d => d.id === documentId);
      if (doc?.file_url) {
        const path = doc.file_url.split("/contact-documents/")[1];
        if (path) {
          await supabase.storage.from("contact-documents").remove([path]);
        }
      }

      const { error } = await supabase
        .from("contact_documents")
        .delete()
        .eq("id", documentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-documents", contactId] });
      toast.success("Documento eliminado");
    },
    onError: () => {
      toast.error("Erro ao eliminar documento");
    },
  });

  return {
    documents: documentsQuery.data || [],
    isLoading: documentsQuery.isLoading,
    uploadDocument,
    deleteDocument,
  };
}

// Products Hook
export function useContactProducts(contactId: string | undefined) {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  const productsQuery = useQuery({
    queryKey: ["contact-products", contactId],
    queryFn: async () => {
      if (!contactId) return [];
      const { data, error } = await supabase
        .from("contact_products")
        .select(`
          *,
          product:products(id, name, price, category)
        `)
        .eq("contact_id", contactId)
        .order("acquisition_date", { ascending: false });
      if (error) throw error;
      return data as unknown as ContactProduct[];
    },
    enabled: !!contactId,
  });

  const addProduct = useMutation({
    mutationFn: async (data: {
      productId: string;
      quantity?: number;
      unitPrice?: number;
      acquisitionDate?: string;
      expiryDate?: string;
      notes?: string;
    }) => {
      if (!contactId || !currentWorkspace?.id) throw new Error("Missing data");

      const totalValue = data.quantity && data.unitPrice 
        ? data.quantity * data.unitPrice 
        : null;

      const { error } = await supabase
        .from("contact_products")
        .upsert({
          contact_id: contactId,
          product_id: data.productId,
          workspace_id: currentWorkspace.id,
          quantity: data.quantity || 1,
          unit_price: data.unitPrice,
          total_value: totalValue,
          acquisition_date: data.acquisitionDate,
          expiry_date: data.expiryDate,
          notes: data.notes,
          status: "ativo",
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-products", contactId] });
      toast.success("Produto adicionado");
    },
    onError: () => {
      toast.error("Erro ao adicionar produto");
    },
  });

  const updateProductStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("contact_products")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-products", contactId] });
      toast.success("Estado atualizado");
    },
  });

  const removeProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("contact_products")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-products", contactId] });
      toast.success("Produto removido");
    },
  });

  return {
    products: productsQuery.data || [],
    isLoading: productsQuery.isLoading,
    addProduct,
    updateProductStatus,
    removeProduct,
  };
}
