import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { CalendarEvent, CreateEventData } from './useCalendars';

export function useCalendarEvents(calendarIds: string[] = [], dateRange?: { start: Date; end: Date }) {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!currentWorkspace?.id || calendarIds.length === 0) {
      setEvents([]);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('calendar_events')
        .select(`
          *,
          calendar:calendars(id, name, color)
        `)
        .eq('workspace_id', currentWorkspace.id)
        .in('calendar_id', calendarIds)
        .order('start_time');

      if (dateRange) {
        query = query
          .gte('start_time', dateRange.start.toISOString())
          .lte('end_time', dateRange.end.toISOString());
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      
      setEvents(data as unknown as CalendarEvent[] || []);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Erro ao carregar eventos');
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace?.id, calendarIds, dateRange?.start?.toISOString(), dateRange?.end?.toISOString()]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const createEvent = async (data: CreateEventData): Promise<CalendarEvent | null> => {
    if (!currentWorkspace?.id || !user?.id) return null;

    try {
      const { data: event, error: createError } = await supabase
        .from('calendar_events')
        .insert({
          ...data,
          workspace_id: currentWorkspace.id,
          created_by: user.id,
        })
        .select(`*, calendar:calendars(id, name, color)`)
        .single();

      if (createError) throw createError;

      toast.success('Evento criado');
      await fetchEvents();
      return event as unknown as CalendarEvent;
    } catch (err) {
      console.error('Error creating event:', err);
      toast.error('Erro ao criar evento');
      return null;
    }
  };

  const updateEvent = async (id: string, data: Partial<CreateEventData>): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('calendar_events')
        .update(data)
        .eq('id', id);

      if (updateError) throw updateError;

      toast.success('Evento atualizado');
      await fetchEvents();
      return true;
    } catch (err) {
      console.error('Error updating event:', err);
      toast.error('Erro ao atualizar evento');
      return false;
    }
  };

  const deleteEvent = async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      toast.success('Evento eliminado');
      await fetchEvents();
      return true;
    } catch (err) {
      console.error('Error deleting event:', err);
      toast.error('Erro ao eliminar evento');
      return false;
    }
  };

  return {
    events,
    isLoading,
    error,
    createEvent,
    updateEvent,
    deleteEvent,
    refresh: fetchEvents,
  };
}
