import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Meeting, MeetingOutcome } from './useMeetings';

export interface MeetingAutomationEvent {
  id: string;
  workspace_id: string;
  meeting_id: string;
  event_type: 'completed' | 'no_show' | 'internal_completed' | 'inactivity_alert';
  trigger_source: 'manual' | 'status_change' | 'scheduled' | 'system';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
  actions_executed: Record<string, unknown>[];
  error_message?: string;
  created_at: string;
  processed_at?: string;
  created_by?: string;
}

export interface RescheduleRequest {
  id: string;
  workspace_id: string;
  original_meeting_id: string;
  new_meeting_id?: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  reschedule_token: string;
  suggested_slots: Array<{ date: string; start_time: string; end_time: string }>;
  message_sent_at?: string;
  message_channel?: string;
  responded_at?: string;
  created_at: string;
  expires_at: string;
}

export interface InactivityAlert {
  id: string;
  workspace_id: string;
  user_id: string;
  alert_type: 'no_followup' | 'no_contact' | 'stale_opportunity' | 'overdue_task';
  entity_type: string;
  entity_ids: string[];
  entity_count: number;
  days_inactive: number;
  status: 'pending' | 'sent' | 'acknowledged' | 'dismissed';
  message?: string;
  created_at: string;
  sent_at?: string;
  acknowledged_at?: string;
}

export interface TeamFeedPost {
  id: string;
  workspace_id: string;
  user_id: string;
  post_type: 'meeting_summary' | 'announcement' | 'achievement' | 'update' | 'question';
  title: string;
  content: string;
  meeting_id?: string;
  metadata: Record<string, unknown>;
  is_pinned: boolean;
  reactions: Record<string, string[]>;
  created_at: string;
  updated_at: string;
}

export function useMeetingAutomations() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  // Process meeting completion automation
  const processClientMeetingCompletion = async (
    meeting: Meeting,
    outcome: MeetingOutcome,
    aiResult: {
      official_summary?: string;
      tasks?: Array<{ title: string; description?: string; suggested_due_days?: number }>;
      followup_email?: { subject: string; body: string };
      followup_whatsapp?: string;
      internal_notes?: string;
      suggested_followup_date?: string;
    }
  ) => {
    if (!currentWorkspace?.id || !user?.id) return;

    setIsProcessing(true);

    try {
      // 1. Create automation event
      const { data: event, error: eventError } = await supabase
        .from('meeting_automation_events')
        .insert({
          workspace_id: currentWorkspace.id,
          meeting_id: meeting.id,
          event_type: 'completed',
          trigger_source: 'status_change',
          status: 'processing',
          created_by: user.id,
        })
        .select()
        .single();

      if (eventError) throw eventError;

      const actionsExecuted: Record<string, unknown>[] = [];

      // 2. Create follow-up task in 24h if AI suggested
      if (aiResult.tasks && aiResult.tasks.length > 0) {
        const followupTask = aiResult.tasks[0];
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (followupTask.suggested_due_days || 1));

        const { error: taskError } = await supabase.rpc('create_meeting_followup_task', {
          p_meeting_id: meeting.id,
          p_title: followupTask.title,
          p_description: followupTask.description || null,
          p_due_date: dueDate.toISOString().split('T')[0],
        });

        if (!taskError) {
          actionsExecuted.push({
            action: 'create_followup_task',
            task_title: followupTask.title,
            due_date: dueDate.toISOString().split('T')[0],
          });
        }
      }

      // 3. Log CRM activity
      if (aiResult.official_summary || aiResult.internal_notes) {
        const { error: activityError } = await supabase
          .from('crm_activities')
          .insert({
            workspace_id: currentWorkspace.id,
            entity_type: meeting.contact_id ? 'contact' : meeting.lead_id ? 'lead' : 'company',
            entity_id: meeting.contact_id || meeting.lead_id || meeting.company_id,
            activity_type: 'meeting',
            title: `Reunião concluída: ${meeting.title}`,
            description: aiResult.official_summary || 'Reunião concluída com sucesso',
            metadata: {
              meeting_id: meeting.id,
              outcome,
              internal_notes: aiResult.internal_notes,
              suggested_followup: aiResult.suggested_followup_date,
            },
            created_by: user.id,
          });

        if (!activityError) {
          actionsExecuted.push({
            action: 'log_crm_activity',
            entity_type: meeting.contact_id ? 'contact' : meeting.lead_id ? 'lead' : 'company',
          });
        }
      }

      // 4. Update automation event as completed
      await supabase
        .from('meeting_automation_events')
        .update({
          status: 'completed',
          actions_executed: JSON.parse(JSON.stringify(actionsExecuted)),
          processed_at: new Date().toISOString(),
        })
        .eq('id', event.id);

      toast.success('Automações de reunião executadas');

    } catch (error) {
      console.error('Meeting automation error:', error);
      toast.error('Erro ao executar automações');
    } finally {
      setIsProcessing(false);
    }
  };

  // Process no-show automation
  const processNoShow = async (meeting: Meeting) => {
    if (!currentWorkspace?.id || !user?.id) return null;

    setIsProcessing(true);

    try {
      // 1. Create automation event
      const { data: event } = await supabase
        .from('meeting_automation_events')
        .insert({
          workspace_id: currentWorkspace.id,
          meeting_id: meeting.id,
          event_type: 'no_show',
          trigger_source: 'status_change',
          status: 'processing',
          created_by: user.id,
        })
        .select()
        .single();

      // 2. Generate AI message for no-show
      const { data: aiResult } = await supabase.functions.invoke('productivity-coach', {
        body: {
          action: 'generate-noshow-message',
          workspaceId: currentWorkspace.id,
          data: { meetingId: meeting.id },
        },
      });

      // 3. Create reschedule request
      const suggestedSlots = aiResult?.suggested_slots || [];
      
      const { data: rescheduleRequest, error: rescheduleError } = await supabase
        .from('meeting_reschedule_requests')
        .insert({
          workspace_id: currentWorkspace.id,
          original_meeting_id: meeting.id,
          status: 'pending',
          suggested_slots: suggestedSlots,
        })
        .select()
        .single();

      if (rescheduleError) throw rescheduleError;

      // 4. Log CRM activity
      const entityId = meeting.contact_id || meeting.lead_id || meeting.company_id;
      if (entityId) {
        await supabase
          .from('crm_activities')
          .insert({
            workspace_id: currentWorkspace.id,
            entity_type: meeting.contact_id ? 'contact' : meeting.lead_id ? 'lead' : 'company',
            entity_id: entityId,
            activity_type: 'no_show',
            title: `No-show: ${meeting.title}`,
            description: 'Cliente não compareceu à reunião agendada',
            metadata: {
              meeting_id: meeting.id,
              reschedule_token: rescheduleRequest?.reschedule_token,
            },
            created_by: user.id,
          });
      }

      // 5. Update automation event
      const noShowActions = [
        { action: 'create_reschedule_request', request_id: rescheduleRequest?.id },
        { action: 'log_crm_activity' },
        { action: 'generate_noshow_message' },
      ];
      await supabase
        .from('meeting_automation_events')
        .update({
          status: 'completed',
          actions_executed: JSON.parse(JSON.stringify(noShowActions)),
          processed_at: new Date().toISOString(),
        })
        .eq('id', event?.id);

      toast.success('Automação de no-show executada');

      return {
        rescheduleRequest,
        message: aiResult?.message || generateDefaultNoShowMessage(meeting),
        suggested_slots: suggestedSlots,
      };

    } catch (error) {
      console.error('No-show automation error:', error);
      toast.error('Erro ao processar no-show');
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  // Process internal meeting completion
  const processInternalMeetingCompletion = async (
    meeting: Meeting,
    summary: string,
    decisions?: string[],
    actionItems?: string[]
  ) => {
    if (!currentWorkspace?.id || !user?.id) return;

    setIsProcessing(true);

    try {
      // 1. Create team feed post
      const { error: postError } = await supabase
        .from('team_feed_posts')
        .insert({
          workspace_id: currentWorkspace.id,
          user_id: user.id,
          post_type: 'meeting_summary',
          title: meeting.title,
          content: summary,
          meeting_id: meeting.id,
          metadata: {
            decisions: decisions || [],
            action_items: actionItems || [],
            meeting_date: meeting.start_time,
          },
        });

      if (postError) throw postError;

      // 2. Create automation event
      const internalActions = [{ action: 'create_team_post' }];
      await supabase
        .from('meeting_automation_events')
        .insert({
          workspace_id: currentWorkspace.id,
          meeting_id: meeting.id,
          event_type: 'internal_completed',
          trigger_source: 'status_change',
          status: 'completed',
          actions_executed: JSON.parse(JSON.stringify(internalActions)),
          created_by: user.id,
          processed_at: new Date().toISOString(),
        });

      toast.success('Resumo publicado no feed da equipa');

    } catch (error) {
      console.error('Internal meeting automation error:', error);
      toast.error('Erro ao publicar resumo');
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isProcessing,
    processClientMeetingCompletion,
    processNoShow,
    processInternalMeetingCompletion,
  };
}

// Hook for inactivity alerts
export function useInactivityAlerts() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<InactivityAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentWorkspace?.id || !user?.id) return;

    const fetchAlerts = async () => {
      const { data, error } = await supabase
        .from('inactivity_alerts')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['pending', 'sent'])
        .order('created_at', { ascending: false });

      if (!error && data) {
        setAlerts(data as InactivityAlert[]);
      }
      setIsLoading(false);
    };

    fetchAlerts();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('inactivity_alerts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inactivity_alerts',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchAlerts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentWorkspace?.id, user?.id]);

  const acknowledgeAlert = async (alertId: string) => {
    const { error } = await supabase
      .from('inactivity_alerts')
      .update({
        status: 'acknowledged',
        acknowledged_at: new Date().toISOString(),
      })
      .eq('id', alertId);

    if (!error) {
      setAlerts(prev => prev.filter(a => a.id !== alertId));
      toast.success('Alerta reconhecido');
    }
  };

  const dismissAlert = async (alertId: string) => {
    const { error } = await supabase
      .from('inactivity_alerts')
      .update({ status: 'dismissed' })
      .eq('id', alertId);

    if (!error) {
      setAlerts(prev => prev.filter(a => a.id !== alertId));
    }
  };

  return {
    alerts,
    isLoading,
    acknowledgeAlert,
    dismissAlert,
  };
}

// Hook for team feed
export function useTeamFeed() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const [posts, setPosts] = useState<TeamFeedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentWorkspace?.id) return;

    const fetchPosts = async () => {
      const { data, error } = await supabase
        .from('team_feed_posts')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        setPosts(data as TeamFeedPost[]);
      }
      setIsLoading(false);
    };

    fetchPosts();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('team_feed')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_feed_posts',
          filter: `workspace_id=eq.${currentWorkspace.id}`,
        },
        () => {
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentWorkspace?.id]);

  const addReaction = async (postId: string, emoji: string) => {
    if (!user?.id) return;

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const reactions = { ...post.reactions } as Record<string, string[]>;
    if (!reactions[emoji]) {
      reactions[emoji] = [];
    }

    if (reactions[emoji].includes(user.id)) {
      reactions[emoji] = reactions[emoji].filter(id => id !== user.id);
      if (reactions[emoji].length === 0) {
        delete reactions[emoji];
      }
    } else {
      reactions[emoji].push(user.id);
    }

    await supabase
      .from('team_feed_posts')
      .update({ reactions })
      .eq('id', postId);
  };

  return {
    posts,
    isLoading,
    addReaction,
  };
}

// Default no-show message generator
function generateDefaultNoShowMessage(meeting: Meeting): string {
  const clientName = meeting.contact?.name || 'Cliente';
  return `Olá ${clientName},\n\nNotámos que não foi possível contar consigo na reunião agendada para hoje. Esperamos que esteja tudo bem!\n\nSe desejar, pode remarcar a reunião clicando no link abaixo. Estamos à disposição.\n\nCumprimentos`;
}
