import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { addHours } from 'date-fns';
import type { CalendarEvent, Calendar } from './useCalendars';

const COMMUNITY_CALENDAR_ID = 'community-events';

export const CATEGORY_COLORS: Record<string, string> = {
  networking: '#3B82F6',
  jantar: '#EF4444',
  workshop: '#8B5CF6',
  webinar: '#06B6D4',
  conferencia: '#F59E0B',
  outro: '#6B7280',
};

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

      // Fetch RSVP counts for all events
      const eventIds = (data || []).map(e => e.id);
      let rsvpMap: Record<string, { confirmed: number; invited: number; total: number }> = {};
      if (eventIds.length > 0) {
        const { data: rsvps } = await supabase
          .from('event_rsvps')
          .select('event_id, status')
          .in('event_id', eventIds);

        if (rsvps) {
          for (const r of rsvps) {
            if (!rsvpMap[r.event_id]) rsvpMap[r.event_id] = { confirmed: 0, invited: 0, total: 0 };
            rsvpMap[r.event_id].total++;
            if (r.status === 'confirmed') rsvpMap[r.event_id].confirmed++;
            if (r.status === 'invited') rsvpMap[r.event_id].invited++;
          }
        }
      }

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
          metadata: {
            _communityEventId: evt.id,
            _categoryColor: CATEGORY_COLORS[evt.event_category] || CATEGORY_COLORS.outro,
            _location: evt.location || null,
            _price: evt.price || 0,
            _currency: evt.currency || 'EUR',
            _capacity: evt.capacity || null,
            _rsvpCounts: rsvpMap[evt.id] || { confirmed: 0, invited: 0, total: 0 },
          },
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
