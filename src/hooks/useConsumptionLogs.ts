import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ConsumptionLog, CreateConsumptionLogInput } from "@/types/consumptionLog";

// Fetch consumption logs for an acquired product
export function useConsumptionLogs(acquiredProductId: string | undefined) {
  return useQuery({
    queryKey: ["consumption-logs", acquiredProductId],
    queryFn: async () => {
      if (!acquiredProductId) return [];
      
      const { data, error } = await supabase
        .from("consumption_logs")
        .select(`
          *,
          product:products(id, name, category),
          contact:contacts(id, name),
          company:companies(id, name)
        `)
        .eq("acquired_product_id", acquiredProductId)
        .order("consumption_date", { ascending: false });
      
      if (error) throw error;
      return data as unknown as ConsumptionLog[];
    },
    enabled: !!acquiredProductId,
  });
}

// Fetch consumption logs for a contact
export function useContactConsumptionLogs(contactId: string | undefined) {
  return useQuery({
    queryKey: ["consumption-logs", "contact", contactId],
    queryFn: async () => {
      if (!contactId) return [];
      
      const { data, error } = await supabase
        .from("consumption_logs")
        .select(`
          *,
          product:products(id, name, category)
        `)
        .eq("contact_id", contactId)
        .order("consumption_date", { ascending: false });
      
      if (error) throw error;
      return data as unknown as ConsumptionLog[];
    },
    enabled: !!contactId,
  });
}

// Fetch consumption logs for a company
export function useCompanyConsumptionLogs(companyId: string | undefined) {
  return useQuery({
    queryKey: ["consumption-logs", "company", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from("consumption_logs")
        .select(`
          *,
          product:products(id, name, category)
        `)
        .eq("company_id", companyId)
        .order("consumption_date", { ascending: false });
      
      if (error) throw error;
      return data as unknown as ConsumptionLog[];
    },
    enabled: !!companyId,
  });
}

// Create a new consumption log
export function useCreateConsumptionLog() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateConsumptionLogInput) => {
      if (!currentWorkspace?.id) throw new Error("Workspace não encontrado");

      const { data, error } = await supabase
        .from("consumption_logs")
        .insert({
          workspace_id: currentWorkspace.id,
          contact_id: input.contactId || null,
          company_id: input.companyId || null,
          product_id: input.productId,
          acquired_product_id: input.acquiredProductId,
          consumption_type: input.consumptionType || 'session',
          quantity: input.quantity || 1,
          consumption_date: input.consumptionDate || new Date().toISOString(),
          notes: input.notes || null,
          source: input.source || 'manual',
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["consumption-logs", variables.acquiredProductId] });
      if (variables.contactId) {
        queryClient.invalidateQueries({ queryKey: ["consumption-logs", "contact", variables.contactId] });
        queryClient.invalidateQueries({ queryKey: ["acquired-products", "contact", variables.contactId] });
        queryClient.invalidateQueries({ queryKey: ["contact-products", variables.contactId] });
      }
      if (variables.companyId) {
        queryClient.invalidateQueries({ queryKey: ["consumption-logs", "company", variables.companyId] });
        queryClient.invalidateQueries({ queryKey: ["acquired-products", "company", variables.companyId] });
      }
      toast.success("Consumo registado com sucesso");
    },
    onError: (error) => {
      console.error("Error creating consumption log:", error);
      toast.error("Erro ao registar consumo");
    },
  });
}

// Get consumption statistics for an acquired product
export function useConsumptionStats(acquiredProductId: string | undefined) {
  return useQuery({
    queryKey: ["consumption-stats", acquiredProductId],
    queryFn: async () => {
      if (!acquiredProductId) return null;
      
      const { data, error } = await supabase
        .from("consumption_logs")
        .select("quantity, consumption_date, consumption_type")
        .eq("acquired_product_id", acquiredProductId)
        .order("consumption_date", { ascending: true });
      
      if (error) throw error;
      
      const totalConsumed = data.reduce((sum, log) => sum + log.quantity, 0);
      const logCount = data.length;
      const lastConsumption = data.length > 0 ? data[data.length - 1].consumption_date : null;
      const firstConsumption = data.length > 0 ? data[0].consumption_date : null;
      
      // Calculate average frequency (days between consumptions)
      let avgFrequencyDays = null;
      if (data.length >= 2 && firstConsumption && lastConsumption) {
        const daysDiff = (new Date(lastConsumption).getTime() - new Date(firstConsumption).getTime()) / (1000 * 60 * 60 * 24);
        avgFrequencyDays = Math.round(daysDiff / (data.length - 1));
      }
      
      return {
        totalConsumed,
        logCount,
        lastConsumption,
        firstConsumption,
        avgFrequencyDays,
      };
    },
    enabled: !!acquiredProductId,
  });
}
