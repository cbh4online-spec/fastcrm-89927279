import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { 
  AcquiredProduct, 
  AcquiredProductStatus,
  CreateAcquiredProductInput, 
  UpdateAcquiredProductInput 
} from "@/types/acquiredProduct";

// Fetch acquired products for a contact
export function useContactAcquiredProducts(contactId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["acquired-products", "contact", contactId],
    queryFn: async () => {
      if (!contactId) return [];
      const { data, error } = await supabase
        .from("contact_products")
        .select(`
          *,
          product:products(
            id, name, price, category, product_type, 
            consumption_model, included_quantity, 
            recommended_frequency, typical_duration_days, is_trackable
          )
        `)
        .eq("contact_id", contactId)
        .order("acquisition_date", { ascending: false });
      if (error) throw error;
      return data as unknown as AcquiredProduct[];
    },
    enabled: !!contactId,
  });

  return {
    products: query.data || [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

// Fetch acquired products for a company
export function useCompanyAcquiredProducts(companyId: string | undefined) {
  const query = useQuery({
    queryKey: ["acquired-products", "company", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("contact_products")
        .select(`
          *,
          product:products(
            id, name, price, category, product_type, 
            consumption_model, included_quantity, 
            recommended_frequency, typical_duration_days, is_trackable
          )
        `)
        .eq("company_id", companyId)
        .order("acquisition_date", { ascending: false });
      if (error) throw error;
      return data as unknown as AcquiredProduct[];
    },
    enabled: !!companyId,
  });

  return {
    products: query.data || [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

// Mutation hooks
export function useCreateAcquiredProduct() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAcquiredProductInput) => {
      if (!currentWorkspace?.id) throw new Error("Workspace não encontrado");

      const { data, error } = await supabase
        .from("contact_products")
        .insert({
          contact_id: input.contactId || null,
          company_id: input.companyId || null,
          product_id: input.productId,
          workspace_id: currentWorkspace.id,
          purchased_quantity: input.purchasedQuantity || 1,
          quantity: input.purchasedQuantity || 1,
          unit_price: input.unitPrice,
          total_value: input.unitPrice && input.purchasedQuantity 
            ? input.unitPrice * input.purchasedQuantity 
            : input.unitPrice,
          acquisition_date: input.acquisitionDate || new Date().toISOString().split('T')[0],
          expiry_date: input.expiryDate,
          notes: input.notes,
          consumed_quantity: 0,
          status: 'ativo',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      if (variables.contactId) {
        queryClient.invalidateQueries({ queryKey: ["acquired-products", "contact", variables.contactId] });
        queryClient.invalidateQueries({ queryKey: ["contact-products", variables.contactId] });
      }
      if (variables.companyId) {
        queryClient.invalidateQueries({ queryKey: ["acquired-products", "company", variables.companyId] });
      }
      toast.success("Produto adicionado com sucesso");
    },
    onError: (error) => {
      console.error("Error creating acquired product:", error);
      toast.error("Erro ao adicionar produto");
    },
  });
}

export function useUpdateAcquiredProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateAcquiredProductInput) => {
      const updateData: Record<string, unknown> = {};
      
      if (input.consumedQuantity !== undefined) {
        updateData.consumed_quantity = input.consumedQuantity;
      }
      if (input.status !== undefined) {
        updateData.status = input.status;
      }
      if (input.notes !== undefined) {
        updateData.notes = input.notes;
      }
      if (input.expiryDate !== undefined) {
        updateData.expiry_date = input.expiryDate;
      }

      const { data, error } = await supabase
        .from("contact_products")
        .update(updateData)
        .eq("id", input.id)
        .select(`
          *,
          product:products(id, name)
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      if (data.contact_id) {
        queryClient.invalidateQueries({ queryKey: ["acquired-products", "contact", data.contact_id] });
        queryClient.invalidateQueries({ queryKey: ["contact-products", data.contact_id] });
      }
      if (data.company_id) {
        queryClient.invalidateQueries({ queryKey: ["acquired-products", "company", data.company_id] });
      }
      toast.success("Produto atualizado");
    },
    onError: (error) => {
      console.error("Error updating acquired product:", error);
      toast.error("Erro ao atualizar produto");
    },
  });
}

export function useRegisterConsumption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      productId, 
      quantity = 1 
    }: { 
      productId: string; 
      quantity?: number;
    }) => {
      // First get current consumed quantity
      const { data: current, error: fetchError } = await supabase
        .from("contact_products")
        .select("consumed_quantity, contact_id, company_id")
        .eq("id", productId)
        .single();

      if (fetchError) throw fetchError;

      const newConsumed = (current.consumed_quantity || 0) + quantity;

      const { data, error } = await supabase
        .from("contact_products")
        .update({ consumed_quantity: newConsumed })
        .eq("id", productId)
        .select()
        .single();

      if (error) throw error;
      return { ...data, previousContactId: current.contact_id, previousCompanyId: current.company_id };
    },
    onSuccess: (data) => {
      if (data.previousContactId || data.contact_id) {
        queryClient.invalidateQueries({ 
          queryKey: ["acquired-products", "contact", data.previousContactId || data.contact_id] 
        });
        queryClient.invalidateQueries({ 
          queryKey: ["contact-products", data.previousContactId || data.contact_id] 
        });
      }
      if (data.previousCompanyId || data.company_id) {
        queryClient.invalidateQueries({ 
          queryKey: ["acquired-products", "company", data.previousCompanyId || data.company_id] 
        });
      }
      toast.success("Consumo registado");
    },
    onError: (error) => {
      console.error("Error registering consumption:", error);
      toast.error("Erro ao registar consumo");
    },
  });
}

export function useDeleteAcquiredProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // First get the product to know which queries to invalidate
      const { data: product, error: fetchError } = await supabase
        .from("contact_products")
        .select("contact_id, company_id")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from("contact_products")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return product;
    },
    onSuccess: (data) => {
      if (data?.contact_id) {
        queryClient.invalidateQueries({ queryKey: ["acquired-products", "contact", data.contact_id] });
        queryClient.invalidateQueries({ queryKey: ["contact-products", data.contact_id] });
      }
      if (data?.company_id) {
        queryClient.invalidateQueries({ queryKey: ["acquired-products", "company", data.company_id] });
      }
      toast.success("Produto removido");
    },
    onError: (error) => {
      console.error("Error deleting acquired product:", error);
      toast.error("Erro ao remover produto");
    },
  });
}
