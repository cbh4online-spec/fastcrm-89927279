import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';

export interface BookingCustomField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select';
  required: boolean;
  placeholder?: string;
  options?: string[]; // for select type
}

export interface BookingPage {
  id: string;
  workspace_id: string;
  calendar_id: string;
  slug: string;
  title: string;
  description: string;
  duration_minutes: number;
  buffer_minutes: number;
  max_advance_days: number;
  is_active: boolean;
  brand_color: string;
  working_days: number[];
  start_hour: string;
  end_hour: string;
  availability_id: string | null;
  require_phone: boolean;
  custom_message_label: string | null;
  custom_fields: BookingCustomField[];
  share_image_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
}

export type CreateBookingPageData = Omit<BookingPage, 'id' | 'workspace_id' | 'created_at' | 'updated_at'>;

export function useBookingPages() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['booking-pages', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from('booking_pages' as any)
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as BookingPage[];
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useCreateBookingPage() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (data: CreateBookingPageData) => {
      const { data: result, error } = await supabase
        .from('booking_pages' as any)
        .insert({ ...data, workspace_id: currentWorkspace!.id } as any)
        .select()
        .single();
      if (error) throw error;
      return result as unknown as BookingPage;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['booking-pages'] });
      toast.success('Link de agendamento criado');
    },
    onError: (e) => {
      toast.error('Erro ao criar link', { description: (e as Error).message });
    },
  });
}

export function useUpdateBookingPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<BookingPage> & { id: string }) => {
      const { error } = await supabase
        .from('booking_pages' as any)
        .update({ ...data, updated_at: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['booking-pages'] });
      toast.success('Link atualizado');
    },
    onError: (e) => {
      toast.error('Erro ao atualizar', { description: (e as Error).message });
    },
  });
}

export function useDeleteBookingPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('booking_pages' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['booking-pages'] });
      toast.success('Link removido');
    },
    onError: (e) => {
      toast.error('Erro ao remover', { description: (e as Error).message });
    },
  });
}
