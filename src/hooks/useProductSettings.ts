import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface ProductTypeConfig {
  id: string;
  workspace_id: string;
  code: string;
  label: string;
  description: string | null;
  icon: string;
  color: string;
  is_active: boolean;
  is_system: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface BillingTypeConfig {
  id: string;
  workspace_id: string;
  code: string;
  label: string;
  description: string | null;
  is_recurring: boolean;
  frequency: string | null;
  icon: string;
  color: string;
  is_active: boolean;
  is_system: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface CreateProductTypeInput {
  code: string;
  label: string;
  description?: string;
  icon?: string;
  color?: string;
  is_active?: boolean;
  position?: number;
}

export interface CreateBillingTypeInput {
  code: string;
  label: string;
  description?: string;
  is_recurring?: boolean;
  frequency?: string;
  icon?: string;
  color?: string;
  is_active?: boolean;
  position?: number;
}

// Default system types to seed
const DEFAULT_PRODUCT_TYPES: Omit<CreateProductTypeInput, 'workspace_id'>[] = [
  { code: 'simple', label: 'Simples', description: 'Produto ou serviço de venda única', icon: 'Package', color: '#3B82F6' },
  { code: 'recurring', label: 'Recorrente', description: 'Serviço com cobrança periódica', icon: 'Repeat', color: '#8B5CF6' },
  { code: 'sessions', label: 'Sessões', description: 'Pacote de sessões consumíveis', icon: 'Clock', color: '#EC4899' },
  { code: 'composite', label: 'Bundle', description: 'Conjunto de produtos/serviços', icon: 'Layers', color: '#F59E0B' },
  { code: 'formacao', label: 'Formação', description: 'Curso ou workshop', icon: 'GraduationCap', color: '#10B981' },
  { code: 'programa', label: 'Programa / Pack', description: 'Programa completo multi-fase', icon: 'Boxes', color: '#6366F1' },
  { code: 'physical', label: 'Produto Físico', description: 'Produto tangível com stock', icon: 'Box', color: '#EF4444' },
];

const DEFAULT_BILLING_TYPES: Omit<CreateBillingTypeInput, 'workspace_id'>[] = [
  { code: 'one-off', label: 'Único', description: 'Pagamento único', is_recurring: false, icon: 'CreditCard', color: '#3B82F6' },
  { code: 'monthly', label: 'Mensal', description: 'Cobrança mensal', is_recurring: true, frequency: 'monthly', icon: 'Calendar', color: '#10B981' },
  { code: 'quarterly', label: 'Trimestral', description: 'Cobrança trimestral', is_recurring: true, frequency: 'quarterly', icon: 'Calendar', color: '#F59E0B' },
  { code: 'yearly', label: 'Anual', description: 'Cobrança anual', is_recurring: true, frequency: 'yearly', icon: 'Calendar', color: '#8B5CF6' },
  { code: 'per-session', label: 'Por Sessão', description: 'Pagamento por sessão', is_recurring: false, icon: 'Clock', color: '#EC4899' },
];

export function useProductTypes() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['product-types', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      
      const { data, error } = await supabase
        .from('product_types')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('position', { ascending: true });

      if (error) throw error;
      
      // If no types exist, seed with defaults
      if (!data || data.length === 0) {
        const seedData = DEFAULT_PRODUCT_TYPES.map((type, index) => ({
          ...type,
          workspace_id: currentWorkspace.id,
          is_system: true,
          position: index,
        }));

        const { data: seededData, error: seedError } = await supabase
          .from('product_types')
          .insert(seedData)
          .select();

        if (seedError) throw seedError;
        return seededData as ProductTypeConfig[];
      }

      return data as ProductTypeConfig[];
    },
    enabled: !!currentWorkspace?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateProductTypeInput) => {
      if (!currentWorkspace?.id) throw new Error('No workspace');
      
      const { data, error } = await supabase
        .from('product_types')
        .insert({
          ...input,
          workspace_id: currentWorkspace.id,
          is_system: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-types'] });
      toast.success('Tipo de produto criado');
    },
    onError: (error) => {
      toast.error('Erro ao criar tipo: ' + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...input }: Partial<CreateProductTypeInput> & { id: string }) => {
      const { data, error } = await supabase
        .from('product_types')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-types'] });
      toast.success('Tipo de produto atualizado');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar tipo: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('product_types')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-types'] });
      toast.success('Tipo de produto removido');
    },
    onError: (error) => {
      toast.error('Erro ao remover tipo: ' + error.message);
    },
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    create: createMutation,
    update: updateMutation,
    delete: deleteMutation,
  };
}

export function useBillingTypes() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['billing-types', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      
      const { data, error } = await supabase
        .from('billing_types')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('position', { ascending: true });

      if (error) throw error;
      
      // If no types exist, seed with defaults
      if (!data || data.length === 0) {
        const seedData = DEFAULT_BILLING_TYPES.map((type, index) => ({
          ...type,
          workspace_id: currentWorkspace.id,
          is_system: true,
          position: index,
        }));

        const { data: seededData, error: seedError } = await supabase
          .from('billing_types')
          .insert(seedData)
          .select();

        if (seedError) throw seedError;
        return seededData as BillingTypeConfig[];
      }

      return data as BillingTypeConfig[];
    },
    enabled: !!currentWorkspace?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateBillingTypeInput) => {
      if (!currentWorkspace?.id) throw new Error('No workspace');
      
      const { data, error } = await supabase
        .from('billing_types')
        .insert({
          ...input,
          workspace_id: currentWorkspace.id,
          is_system: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-types'] });
      toast.success('Tipo de cobrança criado');
    },
    onError: (error) => {
      toast.error('Erro ao criar tipo: ' + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...input }: Partial<CreateBillingTypeInput> & { id: string }) => {
      const { data, error } = await supabase
        .from('billing_types')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-types'] });
      toast.success('Tipo de cobrança atualizado');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar tipo: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('billing_types')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-types'] });
      toast.success('Tipo de cobrança removido');
    },
    onError: (error) => {
      toast.error('Erro ao remover tipo: ' + error.message);
    },
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    create: createMutation,
    update: updateMutation,
    delete: deleteMutation,
  };
}
