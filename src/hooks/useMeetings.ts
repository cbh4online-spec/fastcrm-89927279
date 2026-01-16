import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type MeetingCategory = 'client' | 'internal' | 'hybrid';
export type MeetingMode = 'online' | 'in_person' | 'phone' | 'whatsapp';
export type MeetingStatus = 'pending' | 'confirmed' | 'cancelled' | 'no_show' | 'completed';
export type MeetingProvider = 'zoom' | 'google_meet' | 'custom' | 'none';
export type MeetingOutcome = 'successful' | 'needs_followup' | 'no_show' | 'cancelled' | 'rescheduled';

export interface MeetingNote {
  id: string;
  meeting_id: string;
  workspace_id: string;
  content: string;
  note_type: 'general' | 'action_item' | 'decision' | 'question';
  created_by: string;
  created_at: string;
}

export interface MeetingType {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  category: MeetingCategory;
  mode: MeetingMode;
  default_duration: number;
  buffer_before: number;
  buffer_after: number;
  color: string;
  meeting_provider: MeetingProvider | null;
  custom_meeting_link: string | null;
  min_notice_hours: number;
  max_advance_days: number;
  daily_limit: number | null;
  weekly_limit: number | null;
  availability_windows: Array<{ day: number; start_time: string; end_time: string }>;
  require_contact: boolean;
  require_company: boolean;
  require_opportunity: boolean;
  is_active: boolean;
  is_public: boolean;
  public_slug: string | null;
  created_at: string;
}

export interface Meeting {
  id: string;
  workspace_id: string;
  calendar_id: string | null;
  meeting_type_id: string | null;
  title: string;
  description: string | null;
  category: MeetingCategory;
  mode: MeetingMode;
  start_time: string;
  end_time: string;
  timezone: string;
  buffer_before: number;
  buffer_after: number;
  location: string | null;
  meeting_url: string | null;
  meeting_provider: MeetingProvider | null;
  phone_number: string | null;
  status: MeetingStatus;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  confirmed_at: string | null;
  completed_at: string | null;
  contact_id: string | null;
  company_id: string | null;
  lead_id: string | null;
  opportunity_id: string | null;
  internal_notes: string | null;
  client_notes: string | null;
  outcome: MeetingOutcome | null;
  outcome_notes: string | null;
  next_steps: string | null;
  follow_up_required: boolean;
  follow_up_date: string | null;
  follow_up_task_id: string | null;
  crm_activity_id: string | null;
  // Joined data for notes
  notes?: MeetingNote[];
  source: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined data
  meeting_type?: MeetingType;
  contact?: { id: string; name: string; email: string | null };
  company?: { id: string; name: string };
  attendees?: MeetingAttendee[];
}

export interface MeetingAttendee {
  id: string;
  meeting_id: string;
  user_id: string | null;
  contact_id: string | null;
  external_name: string | null;
  external_email: string | null;
  external_phone: string | null;
  role: 'organizer' | 'host' | 'attendee' | 'optional';
  response_status: 'pending' | 'accepted' | 'declined' | 'tentative';
  attended: boolean | null;
  created_at: string;
}

export interface CreateMeetingData {
  calendar_id?: string;
  meeting_type_id?: string;
  title: string;
  description?: string;
  category: MeetingCategory;
  mode: MeetingMode;
  start_time: string;
  end_time: string;
  location?: string;
  meeting_url?: string;
  meeting_provider?: MeetingProvider;
  phone_number?: string;
  contact_id?: string;
  company_id?: string;
  lead_id?: string;
  opportunity_id?: string;
  internal_notes?: string;
  attendees?: Array<{
    user_id?: string;
    contact_id?: string;
    external_name?: string;
    external_email?: string;
    role?: 'organizer' | 'host' | 'attendee' | 'optional';
  }>;
}

export function useMeetings(dateRange?: { start: Date; end: Date }) {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [meetingTypes, setMeetingTypes] = useState<MeetingType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMeetings = useCallback(async () => {
    if (!currentWorkspace?.id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('meetings')
        .select(`
          *,
          meeting_type:meeting_types(*),
          contact:contacts(id, name, email),
          company:companies(id, name)
        `)
        .eq('workspace_id', currentWorkspace.id)
        .order('start_time', { ascending: true });

      if (dateRange) {
        query = query
          .gte('start_time', dateRange.start.toISOString())
          .lte('end_time', dateRange.end.toISOString());
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      
      setMeetings(data as unknown as Meeting[] || []);
    } catch (err) {
      console.error('Error fetching meetings:', err);
      setError('Erro ao carregar reuniões');
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace?.id, dateRange?.start?.toISOString(), dateRange?.end?.toISOString()]);

  const fetchMeetingTypes = useCallback(async () => {
    if (!currentWorkspace?.id) return;
    
    try {
      const { data, error: fetchError } = await supabase
        .from('meeting_types')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .eq('is_active', true)
        .order('name');

      if (fetchError) throw fetchError;
      setMeetingTypes(data as unknown as MeetingType[] || []);
    } catch (err) {
      console.error('Error fetching meeting types:', err);
    }
  }, [currentWorkspace?.id]);

  useEffect(() => {
    fetchMeetings();
    fetchMeetingTypes();
  }, [fetchMeetings, fetchMeetingTypes]);

  const createMeeting = async (data: CreateMeetingData): Promise<Meeting | null> => {
    if (!currentWorkspace?.id || !user?.id) return null;

    try {
      const { attendees, ...meetingData } = data;
      
      const { data: meeting, error: createError } = await supabase
        .from('meetings')
        .insert({
          ...meetingData,
          workspace_id: currentWorkspace.id,
          created_by: user.id,
          booked_by: user.id,
        })
        .select(`
          *,
          meeting_type:meeting_types(*),
          contact:contacts(id, name, email),
          company:companies(id, name)
        `)
        .single();

      if (createError) throw createError;

      // Add organizer as attendee
      await supabase
        .from('meeting_attendees')
        .insert({
          meeting_id: meeting.id,
          user_id: user.id,
          role: 'organizer',
          response_status: 'accepted',
        });

      // Add other attendees
      if (attendees && attendees.length > 0) {
        const attendeeInserts = attendees.map(a => ({
          meeting_id: meeting.id,
          user_id: a.user_id,
          contact_id: a.contact_id,
          external_name: a.external_name,
          external_email: a.external_email,
          role: a.role || 'attendee',
          response_status: 'pending' as const,
        }));

        await supabase
          .from('meeting_attendees')
          .insert(attendeeInserts);
      }

      toast.success('Reunião criada com sucesso');
      await fetchMeetings();
      return meeting as unknown as Meeting;
    } catch (err) {
      console.error('Error creating meeting:', err);
      toast.error('Erro ao criar reunião');
      return null;
    }
  };

  const updateMeeting = async (id: string, data: Partial<CreateMeetingData>): Promise<boolean> => {
    try {
      const { attendees, ...meetingData } = data;
      
      const { error: updateError } = await supabase
        .from('meetings')
        .update(meetingData)
        .eq('id', id);

      if (updateError) throw updateError;

      toast.success('Reunião atualizada');
      await fetchMeetings();
      return true;
    } catch (err) {
      console.error('Error updating meeting:', err);
      toast.error('Erro ao atualizar reunião');
      return false;
    }
  };

  const updateMeetingStatus = async (
    id: string, 
    status: MeetingStatus, 
    reason?: string
  ): Promise<boolean> => {
    try {
      const updateData: Record<string, unknown> = { status };
      
      if (status === 'cancelled') {
        updateData.cancelled_at = new Date().toISOString();
        updateData.cancelled_by = user?.id;
        if (reason) updateData.cancellation_reason = reason;
      } else if (status === 'confirmed') {
        updateData.confirmed_at = new Date().toISOString();
        updateData.confirmed_by = user?.id;
      } else if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from('meetings')
        .update(updateData)
        .eq('id', id);

      if (updateError) throw updateError;

      const statusLabels: Record<MeetingStatus, string> = {
        pending: 'pendente',
        confirmed: 'confirmada',
        cancelled: 'cancelada',
        no_show: 'sem comparência',
        completed: 'concluída',
      };

      toast.success(`Reunião marcada como ${statusLabels[status]}`);
      await fetchMeetings();
      return true;
    } catch (err) {
      console.error('Error updating meeting status:', err);
      toast.error('Erro ao atualizar estado');
      return false;
    }
  };

  const deleteMeeting = async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('meetings')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      toast.success('Reunião eliminada');
      await fetchMeetings();
      return true;
    } catch (err) {
      console.error('Error deleting meeting:', err);
      toast.error('Erro ao eliminar reunião');
      return false;
    }
  };

  // Group meetings by status
  const meetingsByStatus = {
    pending: meetings.filter(m => m.status === 'pending'),
    confirmed: meetings.filter(m => m.status === 'confirmed'),
    cancelled: meetings.filter(m => m.status === 'cancelled'),
    no_show: meetings.filter(m => m.status === 'no_show'),
    completed: meetings.filter(m => m.status === 'completed'),
  };

  // Group meetings by category
  const meetingsByCategory = {
    client: meetings.filter(m => m.category === 'client'),
    internal: meetings.filter(m => m.category === 'internal'),
    hybrid: meetings.filter(m => m.category === 'hybrid'),
  };

  // Update meeting outcome (for client meetings - triggers CRM integration)
  const updateMeetingOutcome = async (
    id: string,
    outcome: MeetingOutcome,
    outcomeNotes?: string,
    nextSteps?: string,
    followUpDate?: string
  ): Promise<boolean> => {
    try {
      const updateData: Record<string, unknown> = {
        outcome,
        outcome_notes: outcomeNotes || null,
        next_steps: nextSteps || null,
        status: 'completed',
        completed_at: new Date().toISOString(),
      };

      if (followUpDate) {
        updateData.follow_up_date = followUpDate;
        updateData.follow_up_required = true;
      }

      const { error: updateError } = await supabase
        .from('meetings')
        .update(updateData)
        .eq('id', id);

      if (updateError) throw updateError;

      toast.success('Resultado da reunião registado');
      await fetchMeetings();
      return true;
    } catch (err) {
      console.error('Error updating meeting outcome:', err);
      toast.error('Erro ao registar resultado');
      return false;
    }
  };

  // Add note to meeting
  const addMeetingNote = async (
    meetingId: string,
    content: string,
    noteType: 'general' | 'action_item' | 'decision' | 'question' = 'general'
  ): Promise<boolean> => {
    if (!currentWorkspace?.id || !user?.id) return false;

    try {
      const { error: insertError } = await supabase
        .from('meeting_notes')
        .insert({
          meeting_id: meetingId,
          workspace_id: currentWorkspace.id,
          content,
          note_type: noteType,
          created_by: user.id,
        });

      if (insertError) throw insertError;

      toast.success('Nota adicionada');
      return true;
    } catch (err) {
      console.error('Error adding meeting note:', err);
      toast.error('Erro ao adicionar nota');
      return false;
    }
  };

  // Create follow-up task from meeting
  const createFollowUpTask = async (
    meetingId: string,
    title: string,
    description?: string,
    dueDate?: string
  ): Promise<string | null> => {
    try {
      const { data, error: rpcError } = await supabase.rpc('create_meeting_followup_task', {
        p_meeting_id: meetingId,
        p_title: title,
        p_description: description || null,
        p_due_date: dueDate || null,
      });

      if (rpcError) throw rpcError;

      toast.success('Tarefa de follow-up criada');
      await fetchMeetings();
      return data as string;
    } catch (err) {
      console.error('Error creating follow-up task:', err);
      toast.error('Erro ao criar tarefa');
      return null;
    }
  };

  // Publish internal meeting to team (make activity public)
  const publishToTeam = async (meetingId: string): Promise<boolean> => {
    if (!currentWorkspace?.id || !user?.id) return false;

    try {
      // Update existing activity to be public
      const { error: updateError } = await supabase
        .from('user_activity_feed')
        .update({ is_public: true })
        .eq('entity_id', meetingId)
        .eq('entity_type', 'meeting')
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      toast.success('Reunião publicada no mural da equipa');
      return true;
    } catch (err) {
      console.error('Error publishing to team:', err);
      toast.error('Erro ao publicar');
      return false;
    }
  };

  return {
    meetings,
    meetingTypes,
    meetingsByStatus,
    meetingsByCategory,
    isLoading,
    error,
    createMeeting,
    updateMeeting,
    updateMeetingStatus,
    updateMeetingOutcome,
    addMeetingNote,
    createFollowUpTask,
    publishToTeam,
    deleteMeeting,
    refresh: fetchMeetings,
  };
}
