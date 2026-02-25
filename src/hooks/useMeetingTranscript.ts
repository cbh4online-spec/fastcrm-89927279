import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { toast } from "sonner";

export interface MeetingRecording {
  id: string;
  workspace_id: string;
  meeting_id: string;
  status: string;
  duration_seconds: number | null;
  file_url: string | null;
  file_size_bytes: number | null;
  transcription_status: string;
  transcription_language: string | null;
  ai_summary: string | null;
  ai_action_items: any[];
  ai_topics: string[];
  ai_sentiment: string | null;
  speaker_count: number | null;
  created_at: string;
  updated_at: string;
}

export interface TranscriptSegment {
  id: string;
  recording_id: string;
  speaker_label: string;
  speaker_role: string | null;
  start_time_ms: number;
  end_time_ms: number;
  content: string;
  confidence: number | null;
  is_key_moment: boolean;
  sentiment: string | null;
  created_at: string;
}

export interface TranscriptHighlight {
  id: string;
  recording_id: string;
  segment_id: string | null;
  highlight_type: string;
  title: string;
  description: string | null;
  start_time_ms: number;
  assignee: string | null;
  due_date: string | null;
  created_at: string;
}

export function useMeetingTranscript(meetingId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: recording, isLoading: loadingRecording } = useQuery({
    queryKey: ["meeting-recording", meetingId],
    queryFn: async () => {
      if (!meetingId) return null;
      const { data, error } = await supabase
        .from("meeting_recordings" as any)
        .select("*")
        .eq("meeting_id", meetingId)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as MeetingRecording | null;
    },
    enabled: !!meetingId,
  });

  const recordingId = recording?.id;

  const { data: crmLinks = [] } = useQuery({
    queryKey: ["recording-crm-links", recordingId],
    queryFn: async () => {
      if (!recordingId) return [];
      const { data, error } = await supabase
        .from("recording_crm_links" as any)
        .select("*")
        .eq("recording_id", recordingId);
      if (error) throw error;
      return (data || []).map((d: any) => ({
        entity_type: d.entity_type,
        entity_id: d.entity_id,
        entity_name: d.entity_name,
      }));
    },
    enabled: !!recordingId,
  });

  const { data: segments = [], isLoading: loadingSegments } = useQuery({
    queryKey: ["transcript-segments", recordingId],
    queryFn: async () => {
      if (!recordingId) return [];
      const { data, error } = await supabase
        .from("meeting_transcript_segments" as any)
        .select("*")
        .eq("recording_id", recordingId)
        .order("start_time_ms", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as TranscriptSegment[];
    },
    enabled: !!recordingId,
  });

  const { data: highlights = [], isLoading: loadingHighlights } = useQuery({
    queryKey: ["transcript-highlights", recordingId],
    queryFn: async () => {
      if (!recordingId) return [];
      const { data, error } = await supabase
        .from("meeting_transcript_highlights" as any)
        .select("*")
        .eq("recording_id", recordingId)
        .order("start_time_ms", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as TranscriptHighlight[];
    },
    enabled: !!recordingId,
  });

  // Realtime subscription for recording status updates
  useEffect(() => {
    if (!recordingId) return;
    const channel = supabase
      .channel(`recording-${recordingId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "meeting_recordings", filter: `id=eq.${recordingId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["meeting-recording", meetingId] });
          queryClient.invalidateQueries({ queryKey: ["transcript-highlights", recordingId] });
          queryClient.invalidateQueries({ queryKey: ["transcript-segments", recordingId] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [recordingId, meetingId, queryClient]);

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      if (!recordingId) throw new Error("No recording");
      const { data, error } = await supabase.functions.invoke("ai-transcript-analyze", {
        body: { recording_id: recordingId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meeting-recording", meetingId] });
      queryClient.invalidateQueries({ queryKey: ["transcript-highlights", recordingId] });
      queryClient.invalidateQueries({ queryKey: ["transcript-segments", recordingId] });
      toast.success("Transcript analysis completed");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to analyze transcript");
    },
  });

  return {
    recording,
    segments,
    highlights,
    crmLinks,
    isLoading: loadingRecording || loadingSegments || loadingHighlights,
    analyzeTranscript: () => analyzeMutation.mutateAsync(),
    isAnalyzing: analyzeMutation.isPending,
  };
}
