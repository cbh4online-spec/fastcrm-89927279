import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Calendar {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  calendar_type: 'client' | 'internal' | 'event';
  status: 'active' | 'inactive';
  group_id: string | null;
  color: string;
  timezone: string;
  default_duration: number;
  buffer_before: number;
  buffer_after: number;
  is_public: boolean;
  settings: Record<string, unknown>;
  created_by: string;
  created_at: string;
  updated_at: string;
  group?: CalendarGroup;
}

export interface CalendarGroup {
  id: string;
  workspace_id: string;
  name: string;
  color: string;
  icon: string;
  created_at: string;
  updated_at: string;
}

export interface CalendarPermission {
  id: string;
  calendar_id: string;
  user_id: string | null;
  team_id: string | null;
  permission_type: 'view' | 'edit' | 'book' | 'admin';
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  calendar_id: string;
  workspace_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  all_day: boolean;
  location: string | null;
  meeting_url: string | null;
  status: 'tentative' | 'confirmed' | 'cancelled';
  recurrence_rule: string | null;
  recurrence_id: string | null;
  contact_id: string | null;
  company_id: string | null;
  lead_id: string | null;
  opportunity_id: string | null;
  attendees: Array<{ id: string; name: string; email: string; status: string }>;
  reminders: Array<{ type: string; minutes: number }>;
  metadata: Record<string, unknown>;
  created_by: string;
  created_at: string;
  updated_at: string;
  calendar?: Calendar;
}

export interface CreateCalendarData {
  name: string;
  description?: string;
  calendar_type: 'client' | 'internal' | 'event';
  group_id?: string;
  color?: string;
  timezone?: string;
  default_duration?: number;
  buffer_before?: number;
  buffer_after?: number;
  is_public?: boolean;
}

export interface CreateEventData {
  calendar_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  all_day?: boolean;
  location?: string;
  meeting_url?: string;
  status?: 'tentative' | 'confirmed' | 'cancelled';
  contact_id?: string;
  company_id?: string;
  lead_id?: string;
  opportunity_id?: string;
  attendees?: Array<{ id: string; name: string; email: string; status: string }>;
  reminders?: Array<{ type: string; minutes: number }>;
}

export function useCalendars() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [groups, setGroups] = useState<CalendarGroup[]>([]);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCalendars = useCallback(async () => {
    if (!currentWorkspace?.id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from('calendars')
        .select(`
          *,
          group:calendar_groups(*)
        `)
        .eq('workspace_id', currentWorkspace.id)
        .order('name');

      if (fetchError) throw fetchError;
      
      const calendarsData = (data || []) as unknown as Calendar[];
      setCalendars(calendarsData);
      // Auto-select all active calendars
      setSelectedCalendarIds(
        calendarsData
          .filter(c => c.status === 'active')
          .map(c => c.id)
      );
    } catch (err) {
      console.error('Error fetching calendars:', err);
      setError('Erro ao carregar calendários');
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace?.id]);

  const fetchGroups = useCallback(async () => {
    if (!currentWorkspace?.id) return;
    
    try {
      const { data, error: fetchError } = await supabase
        .from('calendar_groups')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('name');

      if (fetchError) throw fetchError;
      setGroups(data as CalendarGroup[] || []);
    } catch (err) {
      console.error('Error fetching calendar groups:', err);
    }
  }, [currentWorkspace?.id]);

  useEffect(() => {
    fetchCalendars();
    fetchGroups();
  }, [fetchCalendars, fetchGroups]);

  const createCalendar = async (data: CreateCalendarData): Promise<Calendar | null> => {
    if (!currentWorkspace?.id || !user?.id) return null;

    try {
      const { data: calendar, error: createError } = await supabase
        .from('calendars')
        .insert({
          ...data,
          workspace_id: currentWorkspace.id,
          created_by: user.id,
        })
        .select(`*, group:calendar_groups(*)`)
        .single();

      if (createError) throw createError;

      // Add user as owner
      await supabase
        .from('calendar_user_assignments')
        .insert({
          calendar_id: calendar.id,
          user_id: user.id,
          is_owner: true,
        });

      toast.success('Calendário criado com sucesso');
      await fetchCalendars();
      return calendar as unknown as Calendar;
    } catch (err) {
      console.error('Error creating calendar:', err);
      toast.error('Erro ao criar calendário');
      return null;
    }
  };

  const updateCalendar = async (id: string, data: Partial<CreateCalendarData>): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('calendars')
        .update(data)
        .eq('id', id);

      if (updateError) throw updateError;

      toast.success('Calendário atualizado');
      await fetchCalendars();
      return true;
    } catch (err) {
      console.error('Error updating calendar:', err);
      toast.error('Erro ao atualizar calendário');
      return false;
    }
  };

  const deleteCalendar = async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('calendars')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      toast.success('Calendário eliminado');
      await fetchCalendars();
      return true;
    } catch (err) {
      console.error('Error deleting calendar:', err);
      toast.error('Erro ao eliminar calendário');
      return false;
    }
  };

  const createGroup = async (name: string, color: string = '#3B82F6'): Promise<CalendarGroup | null> => {
    if (!currentWorkspace?.id) return null;

    try {
      const { data, error: createError } = await supabase
        .from('calendar_groups')
        .insert({
          name,
          color,
          workspace_id: currentWorkspace.id,
        })
        .select()
        .single();

      if (createError) throw createError;

      toast.success('Grupo criado');
      await fetchGroups();
      return data as CalendarGroup;
    } catch (err) {
      console.error('Error creating group:', err);
      toast.error('Erro ao criar grupo');
      return null;
    }
  };

  const toggleCalendarSelection = (calendarId: string) => {
    setSelectedCalendarIds(prev => 
      prev.includes(calendarId)
        ? prev.filter(id => id !== calendarId)
        : [...prev, calendarId]
    );
  };

  const selectAllCalendars = () => {
    setSelectedCalendarIds(calendars.filter(c => c.status === 'active').map(c => c.id));
  };

  const deselectAllCalendars = () => {
    setSelectedCalendarIds([]);
  };

  return {
    calendars,
    groups,
    selectedCalendarIds,
    isLoading,
    error,
    createCalendar,
    updateCalendar,
    deleteCalendar,
    createGroup,
    toggleCalendarSelection,
    selectAllCalendars,
    deselectAllCalendars,
    refresh: fetchCalendars,
  };
}
