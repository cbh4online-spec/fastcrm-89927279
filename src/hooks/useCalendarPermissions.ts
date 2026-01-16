import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { CalendarPermission } from './useCalendars';

export function useCalendarPermissions(calendarId: string) {
  const [permissions, setPermissions] = useState<CalendarPermission[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPermissions = useCallback(async () => {
    if (!calendarId) return;
    
    setIsLoading(true);
    
    try {
      const { data, error: fetchError } = await supabase
        .from('calendar_permissions')
        .select('*')
        .eq('calendar_id', calendarId);

      if (fetchError) throw fetchError;
      
      setPermissions(data as CalendarPermission[] || []);
    } catch (err) {
      console.error('Error fetching permissions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [calendarId]);

  const addPermission = async (
    userId: string | null,
    teamId: string | null,
    permissionType: 'view' | 'edit' | 'book' | 'admin'
  ): Promise<boolean> => {
    try {
      const { error: insertError } = await supabase
        .from('calendar_permissions')
        .insert({
          calendar_id: calendarId,
          user_id: userId,
          team_id: teamId,
          permission_type: permissionType,
        });

      if (insertError) throw insertError;

      toast.success('Permissão adicionada');
      await fetchPermissions();
      return true;
    } catch (err) {
      console.error('Error adding permission:', err);
      toast.error('Erro ao adicionar permissão');
      return false;
    }
  };

  const removePermission = async (permissionId: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('calendar_permissions')
        .delete()
        .eq('id', permissionId);

      if (deleteError) throw deleteError;

      toast.success('Permissão removida');
      await fetchPermissions();
      return true;
    } catch (err) {
      console.error('Error removing permission:', err);
      toast.error('Erro ao remover permissão');
      return false;
    }
  };

  return {
    permissions,
    isLoading,
    fetchPermissions,
    addPermission,
    removePermission,
  };
}
