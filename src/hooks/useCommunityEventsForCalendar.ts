import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { addHours } from 'date-fns';
import type { CalendarEvent, Calendar } from './useCalendars';

const COMMUNITY_CALENDAR_ID = 'community-events';

export const COMMUNITY_CALENDAR: Calendar = {
  id: COMMUNITY_CALENDAR_ID,
  workspace_id: '',
  name: 'Eventos & Convites',
  description: 'Eventos da comunidade e convites',
  calendar_type: 'event',
  status: 'active',
  group_id: null,
  color: '#F59E0B',
  timezone: 'Europe/Lisbon',
  default_duration: 60,
  buffer_before: 0,
  buffer_after: 0,
  is_public: false,
  settings: {},
  created_by: '',
  created_at: '',
  updated_at: '',
};

export function useCommunityEventsForCalendar(dateRange?: { start: Date; end: Date }) {
  const { currentWorkspace } = useWorkspace();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchEvents = useCallback(async () => {
    if (!currentWorkspace?.id) {
      setEvents([]);
      return;
    }

    setIsLoading(true);
    try {
      let query = supabase
        .from('community_events')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('starts_at');

      if (dateRange) {
        query = query
          .gte('starts_at', dateRange.start.toISOString())
          .lte('starts_at', dateRange.end.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      const mapped: CalendarEvent[] = (data || []).map((evt) => {
        const startTime = evt.starts_at;
        const endTime = evt.ends_at || addHours(new Date(evt.starts_at), 1).toISOString();

        const statusMap: Record<string, 'tentative' | 'confirmed' | 'cancelled'> = {
          published: 'confirmed',
          draft: 'tentative',
          cancelled: 'cancelled',
        };

        return {
          id: `community-${evt.id}`,
          calendar_id: COMMUNITY_CALENDAR_ID,
          workspace_id: evt.workspace_id,
          title: evt.title,
          description: evt.description,
          start_time: startTime,
          end_time: endTime,
          all_day: false,
          location: null,
          meeting_url: evt.link,
          status: statusMap[evt.event_type] || 'confirmed',
          recurrence_rule: null,
          recurrence_id: null,
          contact_id: null,
          company_id: null,
          lead_id: null,
          opportunity_id: null,
          attendees: [],
          reminders: [],
          metadata: { _communityEventId: evt.id },
          created_by: evt.created_by || '',
          created_at: evt.created_at,
          updated_at: evt.created_at,
          calendar: COMMUNITY_CALENDAR,
        };
      });

      setEvents(mapped);
    } catch (err) {
      console.error('Error fetching community events for calendar:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace?.id, dateRange?.start?.toISOString(), dateRange?.end?.toISOString()]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return { events, isLoading };
}
