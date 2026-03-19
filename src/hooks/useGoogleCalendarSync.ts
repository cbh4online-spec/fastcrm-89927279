import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';

interface GoogleCalendar {
  id: string;
  summary: string;
  primary: boolean;
  backgroundColor: string;
}

interface SyncConfig {
  id: string;
  calendar_id: string;
  google_calendar_id: string;
  google_calendar_name: string | null;
  sync_direction: string;
  last_synced_at: string | null;
  is_active: boolean;
}

export function useGoogleCalendarSync(calendarId?: string) {
  const { currentWorkspace } = useWorkspace();
  const [syncConfig, setSyncConfig] = useState<SyncConfig | null>(null);
  const [googleCalendars, setGoogleCalendars] = useState<GoogleCalendar[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Fetch sync config for this calendar
  const fetchSyncConfig = useCallback(async () => {
    if (!currentWorkspace?.id || !calendarId) return;

    const { data } = await supabase
      .from('google_calendar_sync')
      .select('*')
      .eq('workspace_id', currentWorkspace.id)
      .eq('calendar_id', calendarId)
      .eq('is_active', true)
      .maybeSingle();

    setSyncConfig(data as SyncConfig | null);
    setIsConnected(!!data);
  }, [currentWorkspace?.id, calendarId]);

  useEffect(() => {
    fetchSyncConfig();
  }, [fetchSyncConfig]);

  // List available Google Calendars
  const listGoogleCalendars = useCallback(async () => {
    if (!currentWorkspace?.id) return;
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-sync', {
        body: {
          action: 'list_calendars',
          workspace_id: currentWorkspace.id,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setGoogleCalendars(data.calendars || []);
    } catch (err: any) {
      console.error('Error listing Google calendars:', err);
      toast.error(err.message || 'Erro ao listar calendários Google');
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace?.id]);

  // Connect to a Google Calendar
  const connect = useCallback(async (googleCalendarId: string) => {
    if (!currentWorkspace?.id || !calendarId) return false;
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-sync', {
        body: {
          action: 'connect',
          workspace_id: currentWorkspace.id,
          calendar_id: calendarId,
          google_calendar_id: googleCalendarId,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Calendário Google conectado');
      await fetchSyncConfig();
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Erro ao conectar');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace?.id, calendarId, fetchSyncConfig]);

  // Disconnect
  const disconnect = useCallback(async () => {
    if (!currentWorkspace?.id || !calendarId) return false;
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-sync', {
        body: {
          action: 'disconnect',
          workspace_id: currentWorkspace.id,
          calendar_id: calendarId,
        },
      });

      if (error) throw error;
      toast.success('Sincronização Google desligada');
      setSyncConfig(null);
      setIsConnected(false);
      return true;
    } catch (err: any) {
      toast.error('Erro ao desconectar');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace?.id, calendarId]);

  // Manual sync (pull)
  const syncNow = useCallback(async () => {
    if (!currentWorkspace?.id || !calendarId) return;
    setIsSyncing(true);

    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-sync', {
        body: {
          action: 'pull',
          workspace_id: currentWorkspace.id,
          calendar_id: calendarId,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const { created = 0, updated = 0, deleted = 0 } = data;
      toast.success(`Sincronizado: ${created} novos, ${updated} atualizados, ${deleted} removidos`);
      await fetchSyncConfig();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao sincronizar');
    } finally {
      setIsSyncing(false);
    }
  }, [currentWorkspace?.id, calendarId, fetchSyncConfig]);

  // Push a single event to Google
  const pushEvent = useCallback(async (eventId: string, eventCalendarId: string) => {
    if (!currentWorkspace?.id) return;

    try {
      await supabase.functions.invoke('google-calendar-sync', {
        body: {
          action: 'push',
          workspace_id: currentWorkspace.id,
          calendar_id: eventCalendarId,
          event_id: eventId,
        },
      });
    } catch (err) {
      console.warn('[GOOGLE_SYNC] Push failed:', err);
    }
  }, [currentWorkspace?.id]);

  // Delete event from Google
  const deleteRemoteEvent = useCallback(async (eventCalendarId: string, googleEventId: string) => {
    if (!currentWorkspace?.id) return;

    try {
      await supabase.functions.invoke('google-calendar-sync', {
        body: {
          action: 'delete_remote',
          workspace_id: currentWorkspace.id,
          calendar_id: eventCalendarId,
          event_data: { google_event_id: googleEventId },
        },
      });
    } catch (err) {
      console.warn('[GOOGLE_SYNC] Remote delete failed:', err);
    }
  }, [currentWorkspace?.id]);

  return {
    syncConfig,
    isConnected,
    googleCalendars,
    isLoading,
    isSyncing,
    listGoogleCalendars,
    connect,
    disconnect,
    syncNow,
    pushEvent,
    deleteRemoteEvent,
    refresh: fetchSyncConfig,
  };
}
