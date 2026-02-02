import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

// ============================================
// INTERFACES
// ============================================

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

export interface PaymentConditionConfig {
  id: string;
  workspace_id: string;
  code: string;
  label: string;
  description: string | null;
  days: number;
  discount_pct: number | null;
  icon: string;
  color: string;
  is_active: boolean;
  is_system: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface PaymentMethodConfig {
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

export interface ConsumptionModelConfig {
  id: string;
  workspace_id: string;
  code: string;
  label: string;
  description: string | null;
  is_trackable: boolean;
  unit_name: string | null;
  icon: string;
  color: string;
  is_active: boolean;
  is_system: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface DeliveryModeConfig {
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

export interface BillingFrequencyConfig {
  id: string;
  workspace_id: string;
  code: string;
  label: string;
  description: string | null;
  interval_days: number;
  icon: string;
  color: string;
  is_active: boolean;
  is_system: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

// ============================================
// INPUT TYPES
// ============================================

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

export interface CreatePaymentConditionInput {
  code: string;
  label: string;
  description?: string;
  days?: number;
  discount_pct?: number;
  icon?: string;
  color?: string;
  is_active?: boolean;
  position?: number;
}

export interface CreatePaymentMethodInput {
  code: string;
  label: string;
  description?: string;
  icon?: string;
  color?: string;
  is_active?: boolean;
  position?: number;
}

export interface CreateConsumptionModelInput {
  code: string;
  label: string;
  description?: string;
  is_trackable?: boolean;
  unit_name?: string;
  icon?: string;
  color?: string;
  is_active?: boolean;
  position?: number;
}

export interface CreateDeliveryModeInput {
  code: string;
  label: string;
  description?: string;
  icon?: string;
  color?: string;
  is_active?: boolean;
  position?: number;
}

export interface CreateBillingFrequencyInput {
  code: string;
  label: string;
  description?: string;
  interval_days: number;
  icon?: string;
  color?: string;
  is_active?: boolean;
  position?: number;
}

// ============================================
// DEFAULT DATA
// ============================================

const DEFAULT_PRODUCT_TYPES: Omit<CreateProductTypeInput, 'workspace_id'>[] = [
  { code: 'simple', label: 'Simples', description: 'Produto ou serviço de venda única', icon: 'Package', color: '#3B82F6' },
  { code: 'recurring', label: 'Recorrente', description: 'Serviço com cobrança periódica', icon: 'Repeat', color: '#8B5CF6' },
  { code: 'sessions', label: 'Sessões', description: 'Pacote de sessões consumíveis', icon: 'Clock', color: '#EC4899' },
  { code: 'composite', label: 'Bundle', description: 'Conjunto de produtos/serviços', icon: 'Layers', color: '#F59E0B' },
  { code: 'formacao', label: 'Formação', description: 'Curso ou workshop', icon: 'GraduationCap', color: '#10B981' },
  { code: 'programa', label: 'Programa / Pack', description: 'Programa completo multi-fase', icon: 'Boxes', color: '#6366F1' },
  { code: 'physical', label: 'Produto Físico', description: 'Produto tangível com stock', icon: 'Box', color: '#EF4444' },
  { code: 'service', label: 'Serviço', description: 'Serviço profissional pontual', icon: 'Briefcase', color: '#0EA5E9' },
  { code: 'saas', label: 'SaaS', description: 'Software como serviço', icon: 'Cloud', color: '#14B8A6' },
  { code: 'digital', label: 'Digital', description: 'Produto digital (ebook, curso, etc.)', icon: 'FileText', color: '#A855F7' },
  { code: 'subscription', label: 'Subscrição', description: 'Acesso contínuo a serviço/produto', icon: 'RefreshCw', color: '#F97316' },
  { code: 'license', label: 'Licença', description: 'Licença de software', icon: 'Key', color: '#84CC16' },
  { code: 'consulting', label: 'Consultoria', description: 'Serviços de consultoria', icon: 'Users', color: '#06B6D4' },
  { code: 'maintenance', label: 'Manutenção', description: 'Contratos de manutenção', icon: 'Wrench', color: '#78716C' },
];

const DEFAULT_BILLING_TYPES: Omit<CreateBillingTypeInput, 'workspace_id'>[] = [
  { code: 'one-off', label: 'Único', description: 'Pagamento único', is_recurring: false, icon: 'CreditCard', color: '#3B82F6' },
  { code: 'monthly', label: 'Mensal', description: 'Cobrança mensal', is_recurring: true, frequency: 'monthly', icon: 'Calendar', color: '#10B981' },
  { code: 'quarterly', label: 'Trimestral', description: 'Cobrança trimestral', is_recurring: true, frequency: 'quarterly', icon: 'Calendar', color: '#F59E0B' },
  { code: 'yearly', label: 'Anual', description: 'Cobrança anual', is_recurring: true, frequency: 'yearly', icon: 'Calendar', color: '#8B5CF6' },
  { code: 'per-session', label: 'Por Sessão', description: 'Pagamento por sessão', is_recurring: false, icon: 'Clock', color: '#EC4899' },
];

const DEFAULT_PAYMENT_CONDITIONS: Omit<CreatePaymentConditionInput, 'workspace_id'>[] = [
  { code: 'pronto_pagamento', label: 'Pronto Pagamento', description: 'Pagamento imediato', days: 0, icon: 'Zap', color: '#10B981' },
  { code: '15_dias', label: '15 dias', description: 'Pagamento em 15 dias', days: 15, icon: 'Clock', color: '#3B82F6' },
  { code: '30_dias', label: '30 dias', description: 'Pagamento em 30 dias', days: 30, icon: 'Clock', color: '#3B82F6' },
  { code: '45_dias', label: '45 dias', description: 'Pagamento em 45 dias', days: 45, icon: 'Clock', color: '#F59E0B' },
  { code: '60_dias', label: '60 dias', description: 'Pagamento em 60 dias', days: 60, icon: 'Clock', color: '#F59E0B' },
  { code: '90_dias', label: '90 dias', description: 'Pagamento em 90 dias', days: 90, icon: 'Clock', color: '#EF4444' },
];

const DEFAULT_PAYMENT_METHODS: Omit<CreatePaymentMethodInput, 'workspace_id'>[] = [
  { code: 'bank_transfer', label: 'Transferência Bancária', description: 'Transferência bancária tradicional', icon: 'Building2', color: '#3B82F6' },
  { code: 'multibanco', label: 'Multibanco', description: 'Referência Multibanco', icon: 'Landmark', color: '#10B981' },
  { code: 'mbway', label: 'MB Way', description: 'Pagamento por MB Way', icon: 'Smartphone', color: '#EF4444' },
  { code: 'credit_card', label: 'Cartão de Crédito', description: 'Pagamento com cartão', icon: 'CreditCard', color: '#8B5CF6' },
  { code: 'direct_debit', label: 'Débito Direto', description: 'Débito direto autorizado', icon: 'ArrowRightLeft', color: '#F59E0B' },
  { code: 'check', label: 'Cheque', description: 'Pagamento por cheque', icon: 'FileText', color: '#6B7280' },
  { code: 'cash', label: 'Numerário', description: 'Pagamento em dinheiro', icon: 'Banknote', color: '#22C55E' },
];

const DEFAULT_CONSUMPTION_MODELS: Omit<CreateConsumptionModelInput, 'workspace_id'>[] = [
  { code: 'sessions', label: 'Sessões', description: 'Consumo por sessão', is_trackable: true, unit_name: 'sessão', icon: 'Calendar', color: '#3B82F6' },
  { code: 'units', label: 'Unidades', description: 'Consumo por unidade', is_trackable: true, unit_name: 'unidade', icon: 'Package', color: '#10B981' },
  { code: 'hours', label: 'Horas', description: 'Consumo por hora', is_trackable: true, unit_name: 'hora', icon: 'Clock', color: '#F59E0B' },
  { code: 'unlimited', label: 'Ilimitado', description: 'Acesso sem limites', is_trackable: false, icon: 'Infinity', color: '#8B5CF6' },
  { code: 'credits', label: 'Créditos', description: 'Consumo por créditos', is_trackable: true, unit_name: 'crédito', icon: 'Coins', color: '#EC4899' },
];

const DEFAULT_DELIVERY_MODES: Omit<CreateDeliveryModeInput, 'workspace_id'>[] = [
  { code: 'online', label: 'Online', description: 'Entrega ou execução online', icon: 'Globe', color: '#3B82F6' },
  { code: 'presencial', label: 'Presencial', description: 'Entrega ou execução presencial', icon: 'MapPin', color: '#10B981' },
  { code: 'hybrid', label: 'Híbrido', description: 'Combinação online e presencial', icon: 'Shuffle', color: '#8B5CF6' },
  { code: 'remote', label: 'Remoto', description: 'Trabalho remoto', icon: 'Laptop', color: '#F59E0B' },
  { code: 'on_demand', label: 'A Pedido', description: 'Sob demanda do cliente', icon: 'Bell', color: '#EC4899' },
];

const DEFAULT_BILLING_FREQUENCIES: Omit<CreateBillingFrequencyInput, 'workspace_id'>[] = [
  { code: 'weekly', label: 'Semanal', description: 'Cobrança a cada 7 dias', interval_days: 7, icon: 'Calendar', color: '#3B82F6' },
  { code: 'biweekly', label: 'Quinzenal', description: 'Cobrança a cada 14 dias', interval_days: 14, icon: 'Calendar', color: '#10B981' },
  { code: 'monthly', label: 'Mensal', description: 'Cobrança a cada 30 dias', interval_days: 30, icon: 'Calendar', color: '#8B5CF6' },
  { code: 'quarterly', label: 'Trimestral', description: 'Cobrança a cada 90 dias', interval_days: 90, icon: 'Calendar', color: '#F59E0B' },
  { code: 'semiannual', label: 'Semestral', description: 'Cobrança a cada 180 dias', interval_days: 180, icon: 'Calendar', color: '#EC4899' },
  { code: 'yearly', label: 'Anual', description: 'Cobrança a cada 365 dias', interval_days: 365, icon: 'Calendar', color: '#EF4444' },
];

// ============================================
// GENERIC HOOK FACTORY
// ============================================

function createSettingsHook<TConfig, TInput>(
  tableName: string,
  queryKey: string,
  defaults: Omit<TInput, 'workspace_id'>[],
  entityName: string
) {
  return function useSettings() {
    const { currentWorkspace } = useWorkspace();
    const queryClient = useQueryClient();

    const query = useQuery({
      queryKey: [queryKey, currentWorkspace?.id],
      queryFn: async () => {
        if (!currentWorkspace?.id) return [];
        
        const { data, error } = await supabase
          .from(tableName as any)
          .select('*')
          .eq('workspace_id', currentWorkspace.id)
          .order('position', { ascending: true });

        if (error) throw error;
        
        if (!data || data.length === 0) {
          const seedData = defaults.map((item, index) => ({
            ...item,
            workspace_id: currentWorkspace.id,
            is_system: true,
            position: index,
          }));

          const { data: seededData, error: seedError } = await supabase
            .from(tableName as any)
            .insert(seedData)
            .select();

          if (seedError) throw seedError;
          return seededData as TConfig[];
        }

        return data as TConfig[];
      },
      enabled: !!currentWorkspace?.id,
    });

    const createMutation = useMutation({
      mutationFn: async (input: TInput) => {
        if (!currentWorkspace?.id) throw new Error('No workspace');
        
        const { data, error } = await supabase
          .from(tableName as any)
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
        queryClient.invalidateQueries({ queryKey: [queryKey] });
        toast.success(`${entityName} criado`);
      },
      onError: (error) => {
        toast.error(`Erro ao criar: ${error.message}`);
      },
    });

    const updateMutation = useMutation({
      mutationFn: async ({ id, ...input }: Partial<TInput> & { id: string }) => {
        const { data, error } = await supabase
          .from(tableName as any)
          .update(input)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
        toast.success(`${entityName} atualizado`);
      },
      onError: (error) => {
        toast.error(`Erro ao atualizar: ${error.message}`);
      },
    });

    const deleteMutation = useMutation({
      mutationFn: async (id: string) => {
        const { error } = await supabase
          .from(tableName as any)
          .delete()
          .eq('id', id);

        if (error) throw error;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
        toast.success(`${entityName} removido`);
      },
      onError: (error) => {
        toast.error(`Erro ao remover: ${error.message}`);
      },
    });

    return {
      data: query.data,
      isLoading: query.isLoading,
      create: createMutation,
      update: updateMutation,
      delete: deleteMutation,
    };
  };
}

// ============================================
// HOOKS
// ============================================

export const useProductTypes = createSettingsHook<ProductTypeConfig, CreateProductTypeInput>(
  'product_types',
  'product-types',
  DEFAULT_PRODUCT_TYPES,
  'Tipo de produto'
);

export const useBillingTypes = createSettingsHook<BillingTypeConfig, CreateBillingTypeInput>(
  'billing_types',
  'billing-types',
  DEFAULT_BILLING_TYPES,
  'Tipo de cobrança'
);

export const usePaymentConditions = createSettingsHook<PaymentConditionConfig, CreatePaymentConditionInput>(
  'payment_conditions',
  'payment-conditions',
  DEFAULT_PAYMENT_CONDITIONS,
  'Condição de pagamento'
);

export const usePaymentMethods = createSettingsHook<PaymentMethodConfig, CreatePaymentMethodInput>(
  'payment_methods',
  'payment-methods',
  DEFAULT_PAYMENT_METHODS,
  'Método de pagamento'
);

export const useConsumptionModels = createSettingsHook<ConsumptionModelConfig, CreateConsumptionModelInput>(
  'consumption_models',
  'consumption-models',
  DEFAULT_CONSUMPTION_MODELS,
  'Modelo de consumo'
);

export const useDeliveryModes = createSettingsHook<DeliveryModeConfig, CreateDeliveryModeInput>(
  'delivery_modes',
  'delivery-modes',
  DEFAULT_DELIVERY_MODES,
  'Modo de entrega'
);

export const useBillingFrequencies = createSettingsHook<BillingFrequencyConfig, CreateBillingFrequencyInput>(
  'billing_frequencies',
  'billing-frequencies',
  DEFAULT_BILLING_FREQUENCIES,
  'Frequência de cobrança'
);
