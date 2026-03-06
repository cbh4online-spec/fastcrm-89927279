import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { emitKernelEvent } from '@/lib/kernelEmitter';
import type { CalendarEvent, CreateEventData } from './useCalendars';

export function useCalendarEvents(calendarIds: string[] = [], dateRange?: { start: Date; end: Date }) {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stabilize calendarIds to avoid infinite loops
  const calendarIdsKey = calendarIds.join(',');
  const stableCalendarIds = useMemo(() => calendarIds, [calendarIdsKey]);

  const startIso = dateRange?.start?.toISOString();
  const endIso = dateRange?.end?.toISOString();

  const fetchEvents = useCallback(async () => {
    if (!currentWorkspace?.id || stableCalendarIds.length === 0) {
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
          calendar:calendars(id, name, color),
          contact:contacts(id, name),
          company:companies(id, name)
        `)
        .eq('workspace_id', currentWorkspace.id)
        .in('calendar_id', stableCalendarIds)
        .order('start_time');

      if (startIso && endIso) {
        query = query
          .gte('start_time', startIso)
          .lte('end_time', endIso);
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
  }, [currentWorkspace?.id, stableCalendarIds, startIso, endIso]);

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
        .select(`*, calendar:calendars(id, name, color), contact:contacts(id, name), company:companies(id, name)`)
        .single();

      if (createError) throw createError;

      console.log(`[CALENDAR] Event created: ${event.id}`);
      emitKernelEvent({
        workspace_id: currentWorkspace.id,
        type: 'CALENDAR_EVENT.CREATED',
        entity_kind: 'calendar_event',
        entity_id: event.id,
        source_module: 'core-calendar',
        payload: { title: data.title, calendar_id: data.calendar_id },
      });

      toast.success('Evento criado');
      await fetchEvents();
      return event as unknown as CalendarEvent;
    } catch (err) {
      console.warn('[CALENDAR] EVENT_CREATE_FAILED', err);
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

      console.log(`[CALENDAR] Event updated: ${id}`);
      emitKernelEvent({
        workspace_id: currentWorkspace!.id,
        type: 'CALENDAR_EVENT.UPDATED',
        entity_kind: 'calendar_event',
        entity_id: id,
        source_module: 'core-calendar',
      });

      toast.success('Evento atualizado');
      await fetchEvents();
      return true;
    } catch (err) {
      console.warn('[CALENDAR] EVENT_UPDATE_FAILED', err);
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

      console.log(`[CALENDAR] Event deleted: ${id}`);
      emitKernelEvent({
        workspace_id: currentWorkspace!.id,
        type: 'CALENDAR_EVENT.DELETED',
        entity_kind: 'calendar_event',
        entity_id: id,
        source_module: 'core-calendar',
      });

      toast.success('Evento eliminado');
      await fetchEvents();
      return true;
    } catch (err) {
      console.warn('[CALENDAR] EVENT_DELETE_FAILED', err);
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
