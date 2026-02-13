import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';

export interface BookingCalendar {
  id: string;
  workspace_id: string;
  bot_id: string;
  calendar_id: string;
  calendar_name: string;
  description: string | null;
  keywords: string[];
  is_fallback: boolean;
  allow_cancel: boolean;
  post_booking_actions: Record<string, unknown>;
  created_at: string;
}

export function useBookingCalendars(botId: string | null) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['ai-booking-calendars', currentWorkspace?.id, botId],
    queryFn: async () => {
      if (!currentWorkspace?.id || !botId) return [];
      const { data, error } = await supabase
        .from('ai_booking_calendars')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .eq('bot_id', botId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as BookingCalendar[];
    },
    enabled: !!currentWorkspace?.id && !!botId,
  });
}

export function useCreateBookingCalendar() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (data: Omit<BookingCalendar, 'id' | 'workspace_id' | 'created_at'>) => {
      const { error } = await supabase
        .from('ai_booking_calendars')
        .insert({ ...data, workspace_id: currentWorkspace!.id } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-booking-calendars'] });
      toast.success('Calendário adicionado');
    },
    onError: (e) => toast.error('Erro ao adicionar calendário', { description: (e as Error).message }),
  });
}

export function useDeleteBookingCalendar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ai_booking_calendars').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-booking-calendars'] });
      toast.success('Calendário removido');
    },
  });
}
