import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export interface MeetingAIAnalysis {
  id: string;
  recording_id: string;
  workspace_id: string;
  objections_detected: Array<{
    text: string;
    severity: 'low' | 'medium' | 'high';
    timestamp_ms?: number;
    speaker?: string;
  }>;
  buying_signals: Array<{
    signal: string;
    strength: 'weak' | 'moderate' | 'strong';
    timestamp_ms?: number;
  }>;
  competitor_mentions: Array<{
    name: string;
    context: string;
    sentiment?: 'positive' | 'neutral' | 'negative';
  }>;
  follow_up_suggestions: Array<{
    action: string;
    priority: 'low' | 'medium' | 'high';
    deadline_days?: number;
  }>;
  talk_ratio: Record<string, number>;
  engagement_score: number | null;
  deal_impact: string | null;
  created_at: string;
  updated_at: string;
}

export function useMeetingIntelligence(recordingId: string | undefined) {
  const { data: analysis, isLoading, refetch } = useQuery({
    queryKey: ['meeting-ai-analysis', recordingId],
    queryFn: async (): Promise<MeetingAIAnalysis | null> => {
      if (!recordingId) return null;
      
      const { data, error } = await supabase
        .from('meeting_ai_analysis' as any)
        .select('*')
        .eq('recording_id', recordingId)
        .maybeSingle();

      if (error) {
        console.error('[useMeetingIntelligence] Error:', error);
        return null;
      }
      
      return (data as unknown) as MeetingAIAnalysis | null;
    },
    enabled: !!recordingId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!recordingId) return;

    const channel = supabase
      .channel(`meeting-ai-${recordingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meeting_ai_analysis',
          filter: `recording_id=eq.${recordingId}`,
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [recordingId, refetch]);

  const [isTranscribing, setIsTranscribing] = useState(false);

  const transcribeRecording = useCallback(async (recId: string) => {
    setIsTranscribing(true);
    try {
      const { data, error } = await supabase.functions.invoke('meeting-transcribe', {
        body: { recording_id: recId },
      });
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('[useMeetingIntelligence] Transcribe error:', err);
      throw err;
    } finally {
      setIsTranscribing(false);
    }
  }, []);

  return {
    analysis,
    isLoading,
    refetch,
    transcribeRecording,
    isTranscribing,
  };
}
