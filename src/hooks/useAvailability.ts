import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface AvailabilitySlot {
  id: string;
  availability_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export interface AvailabilityException {
  id: string;
  availability_id: string;
  exception_date: string;
  exception_type: 'unavailable' | 'custom';
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
}

export interface CalendarAssignment {
  id: string;
  availability_id: string;
  calendar_id: string;
  calendar?: {
    id: string;
    name: string;
    color: string;
  };
}

export interface UserAvailability {
  id: string;
  workspace_id: string;
  user_id: string;
  name: string;
  timezone: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  slots?: AvailabilitySlot[];
  exceptions?: AvailabilityException[];
  calendar_assignments?: CalendarAssignment[];
}

export interface CreateAvailabilityData {
  name: string;
  timezone: string;
  is_default?: boolean;
  is_active?: boolean;
}

export interface CreateSlotData {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export interface CreateExceptionData {
  exception_date: string;
  exception_type: 'unavailable' | 'custom';
  start_time?: string;
  end_time?: string;
  reason?: string;
}

const TIMEZONES = [
  { value: 'Europe/Lisbon', label: 'Lisboa (WET/WEST)' },
  { value: 'Europe/London', label: 'Londres (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Europe/Madrid', label: 'Madrid (CET/CEST)' },
  { value: 'America/New_York', label: 'Nova Iorque (EST/EDT)' },
  { value: 'America/Sao_Paulo', label: 'São Paulo (BRT)' },
  { value: 'UTC', label: 'UTC' },
];

const DAY_NAMES = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

export function useAvailability() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const [availabilities, setAvailabilities] = useState<UserAvailability[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAvailabilities = useCallback(async () => {
    if (!currentWorkspace?.id || !user?.id) {
      setAvailabilities([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('user_availability')
        .select(`
          *,
          slots:availability_slots(*),
          exceptions:availability_exceptions(*),
          calendar_assignments:availability_calendar_assignments(
            *,
            calendar:calendars(id, name, color)
          )
        `)
        .eq('workspace_id', currentWorkspace.id)
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setAvailabilities(data as UserAvailability[] || []);
    } catch (err) {
      console.error('Error fetching availabilities:', err);
      setError('Erro ao carregar disponibilidades');
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace?.id, user?.id]);

  useEffect(() => {
    fetchAvailabilities();
  }, [fetchAvailabilities]);

  const createAvailability = async (data: CreateAvailabilityData): Promise<UserAvailability | null> => {
    if (!currentWorkspace?.id || !user?.id) return null;

    try {
      // If setting as default, unset other defaults first
      if (data.is_default) {
        await supabase
          .from('user_availability')
          .update({ is_default: false })
          .eq('workspace_id', currentWorkspace.id)
          .eq('user_id', user.id);
      }

      const { data: availability, error: createError } = await supabase
        .from('user_availability')
        .insert({
          ...data,
          workspace_id: currentWorkspace.id,
          user_id: user.id,
        })
        .select()
        .single();

      if (createError) throw createError;

      toast.success('Disponibilidade criada');
      await fetchAvailabilities();
      return availability as UserAvailability;
    } catch (err) {
      console.error('Error creating availability:', err);
      toast.error('Erro ao criar disponibilidade');
      return null;
    }
  };

  const updateAvailability = async (id: string, data: Partial<CreateAvailabilityData>): Promise<boolean> => {
    if (!currentWorkspace?.id || !user?.id) return false;

    try {
      // If setting as default, unset other defaults first
      if (data.is_default) {
        await supabase
          .from('user_availability')
          .update({ is_default: false })
          .eq('workspace_id', currentWorkspace.id)
          .eq('user_id', user.id)
          .neq('id', id);
      }

      const { error: updateError } = await supabase
        .from('user_availability')
        .update(data)
        .eq('id', id);

      if (updateError) throw updateError;

      toast.success('Disponibilidade atualizada');
      await fetchAvailabilities();
      return true;
    } catch (err) {
      console.error('Error updating availability:', err);
      toast.error('Erro ao atualizar disponibilidade');
      return false;
    }
  };

  const deleteAvailability = async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('user_availability')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      toast.success('Disponibilidade eliminada');
      await fetchAvailabilities();
      return true;
    } catch (err) {
      console.error('Error deleting availability:', err);
      toast.error('Erro ao eliminar disponibilidade');
      return false;
    }
  };

  // Slot management
  const addSlot = async (availabilityId: string, data: CreateSlotData): Promise<boolean> => {
    try {
      const { error: insertError } = await supabase
        .from('availability_slots')
        .insert({
          availability_id: availabilityId,
          ...data,
        });

      if (insertError) throw insertError;

      toast.success('Horário adicionado');
      await fetchAvailabilities();
      return true;
    } catch (err) {
      console.error('Error adding slot:', err);
      toast.error('Erro ao adicionar horário');
      return false;
    }
  };

  const removeSlot = async (slotId: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('availability_slots')
        .delete()
        .eq('id', slotId);

      if (deleteError) throw deleteError;

      toast.success('Horário removido');
      await fetchAvailabilities();
      return true;
    } catch (err) {
      console.error('Error removing slot:', err);
      toast.error('Erro ao remover horário');
      return false;
    }
  };

  const updateSlots = async (availabilityId: string, slots: CreateSlotData[]): Promise<boolean> => {
    try {
      // Delete existing slots
      await supabase
        .from('availability_slots')
        .delete()
        .eq('availability_id', availabilityId);

      // Insert new slots
      if (slots.length > 0) {
        const { error: insertError } = await supabase
          .from('availability_slots')
          .insert(
            slots.map(slot => ({
              availability_id: availabilityId,
              ...slot,
            }))
          );

        if (insertError) throw insertError;
      }

      toast.success('Horários atualizados');
      await fetchAvailabilities();
      return true;
    } catch (err) {
      console.error('Error updating slots:', err);
      toast.error('Erro ao atualizar horários');
      return false;
    }
  };

  // Exception management
  const addException = async (availabilityId: string, data: CreateExceptionData): Promise<boolean> => {
    try {
      const { error: insertError } = await supabase
        .from('availability_exceptions')
        .insert({
          availability_id: availabilityId,
          ...data,
        });

      if (insertError) throw insertError;

      toast.success('Exceção adicionada');
      await fetchAvailabilities();
      return true;
    } catch (err) {
      console.error('Error adding exception:', err);
      toast.error('Erro ao adicionar exceção');
      return false;
    }
  };

  const removeException = async (exceptionId: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('availability_exceptions')
        .delete()
        .eq('id', exceptionId);

      if (deleteError) throw deleteError;

      toast.success('Exceção removida');
      await fetchAvailabilities();
      return true;
    } catch (err) {
      console.error('Error removing exception:', err);
      toast.error('Erro ao remover exceção');
      return false;
    }
  };

  // Calendar assignment management
  const assignToCalendar = async (availabilityId: string, calendarId: string): Promise<boolean> => {
    try {
      const { error: insertError } = await supabase
        .from('availability_calendar_assignments')
        .insert({
          availability_id: availabilityId,
          calendar_id: calendarId,
        });

      if (insertError) throw insertError;

      toast.success('Calendário associado');
      await fetchAvailabilities();
      return true;
    } catch (err) {
      console.error('Error assigning calendar:', err);
      toast.error('Erro ao associar calendário');
      return false;
    }
  };

  const removeCalendarAssignment = async (assignmentId: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('availability_calendar_assignments')
        .delete()
        .eq('id', assignmentId);

      if (deleteError) throw deleteError;

      toast.success('Associação removida');
      await fetchAvailabilities();
      return true;
    } catch (err) {
      console.error('Error removing assignment:', err);
      toast.error('Erro ao remover associação');
      return false;
    }
  };

  return {
    availabilities,
    isLoading,
    error,
    createAvailability,
    updateAvailability,
    deleteAvailability,
    addSlot,
    removeSlot,
    updateSlots,
    addException,
    removeException,
    assignToCalendar,
    removeCalendarAssignment,
    refresh: fetchAvailabilities,
    TIMEZONES,
    DAY_NAMES,
  };
}
