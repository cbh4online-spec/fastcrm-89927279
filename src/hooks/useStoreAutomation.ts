/**
 * Hook for managing store-specific automation events and abandoned carts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';

// ============================================
// Types
// ============================================

export interface StoreAutomationEvent {
  id: string;
  workspace_id: string;
  event_type: string;
  order_id: string | null;
  contact_id: string | null;
  abandoned_cart_id: string | null;
  event_data: Record<string, unknown>;
  automation_rule_id: string | null;
  processed: boolean;
  processed_at: string | null;
  created_at: string;
}

export interface AbandonedCart {
  id: string;
  workspace_id: string;
  session_id: string;
  contact_id: string | null;
  customer_email: string | null;
  customer_name: string | null;
  items: Array<{ product_id: string; name: string; quantity: number; price: number }> | unknown;
  subtotal: number;
  currency: string;
  recovery_status: 'abandoned' | 'recovered' | 'expired' | 'contacted';
  recovery_attempts: number;
  last_recovery_at: string | null;
  recovered_order_id: string | null;
  abandoned_at: string;
  expires_at: string;
  created_at: string;
}

export const STORE_TRIGGER_LABELS: Record<string, { label: string; description: string; icon: string }> = {
  store_purchase_completed: {
    label: 'Compra efetuada',
    description: 'Quando um pagamento é confirmado na loja',
    icon: 'ShoppingBag',
  },
  store_cart_abandoned: {
    label: 'Abandono de carrinho',
    description: 'Quando um carrinho é abandonado sem checkout',
    icon: 'ShoppingCart',
  },
  store_repurchase: {
    label: 'Recompra',
    description: 'Quando um cliente faz uma compra repetida',
    icon: 'RefreshCw',
  },
  store_first_purchase: {
    label: 'Primeira compra',
    description: 'Quando um novo cliente faz a primeira compra',
    icon: 'Star',
  },
  store_order_status_changed: {
    label: 'Estado da encomenda alterado',
    description: 'Quando o estado de uma encomenda muda',
    icon: 'Package',
  },
};

export const STORE_ACTION_LABELS: Record<string, { label: string; description: string; icon: string }> = {
  send_followup_email: {
    label: 'Enviar follow-up',
    description: 'Envia e-mail de follow-up ao cliente',
    icon: 'Mail',
  },
  trigger_upsell_offer: {
    label: 'Oferta de upsell',
    description: 'Envia oferta de upsell/cross-sell personalizada',
    icon: 'TrendingUp',
  },
  start_onboarding_flow: {
    label: 'Iniciar onboarding',
    description: 'Inicia fluxo de onboarding para o cliente',
    icon: 'Rocket',
  },
  activate_ai_assistant: {
    label: 'Ativar assistente IA',
    description: 'Ativa assistente IA no canal do cliente',
    icon: 'Bot',
  },
  schedule_repurchase_reminder: {
    label: 'Lembrete de recompra',
    description: 'Agenda um lembrete para recompra futura',
    icon: 'Clock',
  },
};

// ============================================
// Hooks
// ============================================

export function useStoreAutomationEvents(limit = 50) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['store_automation_events', currentWorkspace?.id, limit],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from('store_automation_events')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as StoreAutomationEvent[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useAbandonedCarts(status?: string) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['store_abandoned_carts', currentWorkspace?.id, status],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      let query = supabase
        .from('store_abandoned_carts')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('abandoned_at', { ascending: false })
        .limit(100);

      if (status) {
        query = query.eq('recovery_status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as AbandonedCart[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useAbandonedCartStats() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['store_abandoned_cart_stats', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return null;

      const { data, error } = await supabase
        .from('store_abandoned_carts')
        .select('recovery_status, subtotal')
        .eq('workspace_id', currentWorkspace.id);

      if (error) throw error;

      const stats = {
        total: data.length,
        abandoned: 0,
        recovered: 0,
        contacted: 0,
        expired: 0,
        totalLostRevenue: 0,
        totalRecoveredRevenue: 0,
        recoveryRate: 0,
      };

      for (const cart of data) {
        switch (cart.recovery_status) {
          case 'abandoned': stats.abandoned++; stats.totalLostRevenue += Number(cart.subtotal) || 0; break;
          case 'recovered': stats.recovered++; stats.totalRecoveredRevenue += Number(cart.subtotal) || 0; break;
          case 'contacted': stats.contacted++; break;
          case 'expired': stats.expired++; break;
        }
      }

      if (stats.total > 0) {
        stats.recoveryRate = Math.round((stats.recovered / stats.total) * 100);
      }

      return stats;
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useTrackCartAbandonment() {
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (cart: {
      sessionId: string;
      contactId?: string;
      customerEmail?: string;
      customerName?: string;
      items: Array<{ product_id: string; name: string; quantity: number; price: number }>;
      subtotal: number;
    }) => {
      if (!currentWorkspace?.id) throw new Error('Workspace não encontrado');

      // Upsert based on session_id
      const { data, error } = await supabase
        .from('store_abandoned_carts')
        .upsert({
          workspace_id: currentWorkspace.id,
          session_id: cart.sessionId,
          contact_id: cart.contactId || null,
          customer_email: cart.customerEmail || null,
          customer_name: cart.customerName || null,
          items: cart.items,
          subtotal: cart.subtotal,
          recovery_status: 'abandoned',
          abandoned_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'session_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
  });
}

export function useSendCartRecovery() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (cartId: string) => {
      // Log event for automation engine
      const { error } = await supabase.from('store_automation_events').insert({
        workspace_id: currentWorkspace?.id,
        event_type: 'cart_abandoned',
        abandoned_cart_id: cartId,
        event_data: { recovery_attempt: true },
      });
      if (error) throw error;

      // Update cart recovery attempts
      await supabase
        .from('store_abandoned_carts')
        .update({
          recovery_attempts: supabase.rpc ? 1 : 1, // Will be incremented
          last_recovery_at: new Date().toISOString(),
          recovery_status: 'contacted',
          updated_at: new Date().toISOString(),
        })
        .eq('id', cartId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store_abandoned_carts'] });
      toast.success('Tentativa de recuperação iniciada');
    },
    onError: (err) => {
      toast.error(`Erro: ${err instanceof Error ? err.message : 'Desconhecido'}`);
    },
  });
}
