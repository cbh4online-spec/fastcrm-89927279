import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { VoiceSettings, TTSResponse, ElevenLabsVoice } from "@/types/voice";

// ── Voice settings ────────────────────────────────────────────────────────────
export function useVoiceSettings() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["voice-settings", currentWorkspace?.id],
    queryFn: async (): Promise<VoiceSettings | null> => {
      const { data } = await supabase
        .from("voice_settings")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .single();
      return (data as unknown as VoiceSettings) ?? null;
    },
    enabled: !!currentWorkspace?.id,
    staleTime: 300_000,
  });
}

export function useUpdateVoiceSettings() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (updates: Partial<VoiceSettings>) => {
      const { data, error } = await supabase
        .from("voice_settings")
        .upsert({ ...updates, workspace_id: currentWorkspace!.id })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as VoiceSettings;
    },
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: ["voice-settings", currentWorkspace?.id],
      }),
  });
}

// ── Available voices ──────────────────────────────────────────────────────────
export function useAvailableVoices() {
  return useQuery({
    queryKey: ["elevenlabs-voices"],
    queryFn: async (): Promise<ElevenLabsVoice[]> => ELEVENLABS_VOICES,
    staleTime: Infinity,
  });
}

const ELEVENLABS_VOICES: ElevenLabsVoice[] = [
  {
    voice_id: "pNInz6obpgDQGcFmaJgB",
    name: "Adam",
    category: "premade",
    labels: { accent: "american", gender: "male", age: "middle-aged" },
  },
  {
    voice_id: "EXAVITQu4vr4xnSDxMaL",
    name: "Sarah",
    category: "premade",
    labels: { accent: "american", gender: "female", age: "young" },
  },
  {
    voice_id: "ErXwobaYiN019PkySvjV",
    name: "Antoni",
    category: "premade",
    labels: { accent: "american", gender: "male", age: "young" },
  },
  {
    voice_id: "VR6AewLTigWG4xSOukaG",
    name: "Arnold",
    category: "premade",
    labels: { accent: "american", gender: "male", age: "middle-aged" },
  },
  {
    voice_id: "onwK4e9ZLuTAKqWW03F9",
    name: "Daniel",
    category: "premade",
    labels: { accent: "british", gender: "male", age: "middle-aged" },
  },
  {
    voice_id: "pFZP5JQG7iQjIQuC4Bku",
    name: "Lily",
    category: "premade",
    labels: { accent: "british", gender: "female", age: "middle-aged" },
  },
  {
    voice_id: "jBpfuIE2acCO8z3wKNLl",
    name: "Gigi",
    category: "premade",
    labels: { accent: "american", gender: "female", age: "young" },
  },
  {
    voice_id: "flq6f7yk4E4fJM5XTYuZ",
    name: "Michael",
    category: "premade",
    labels: { accent: "american", gender: "male", age: "old" },
  },
];

// ── TTS generation ────────────────────────────────────────────────────────────
export function useTTS() {
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async ({
      text,
      sourceType,
      sourceId,
      voiceId,
      useCache = true,
    }: {
      text: string;
      sourceType: "proposal" | "summary" | "copilot" | "custom";
      sourceId?: string;
      voiceId?: string;
      useCache?: boolean;
    }): Promise<TTSResponse> => {
      const { data, error } = await supabase.functions.invoke(
        "elevenlabs-tts",
        {
          body: {
            text,
            source_type: sourceType,
            source_id: sourceId,
            workspace_id: currentWorkspace!.id,
            voice_id: voiceId,
            use_cache: useCache,
          },
        }
      );
      if (error) throw error;
      return data as TTSResponse;
    },
  });
}

// ── Proposal narration ────────────────────────────────────────────────────────
export function useProposalNarration(proposalId: string | undefined) {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();

  const cachedNarration = useQuery({
    queryKey: ["proposal-narration", proposalId],
    queryFn: async (): Promise<{
      audio_url: string;
      duration_seconds?: number;
    } | null> => {
      if (!proposalId) return null;

      const { data } = await supabase
        .from("voice_audio_cache")
        .select("storage_path, duration_seconds")
        .eq("workspace_id", currentWorkspace!.id)
        .eq("source_type", "proposal")
        .eq("source_id", proposalId)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!data) return null;

      const { data: signedUrl } = await supabase.storage
        .from("voice-audio")
        .createSignedUrl(data.storage_path, 3600);

      return signedUrl?.signedUrl
        ? {
            audio_url: signedUrl.signedUrl,
            duration_seconds: data.duration_seconds,
          }
        : null;
    },
    enabled: !!proposalId && !!currentWorkspace?.id,
    staleTime: 3_300_000,
  });

  const generateNarration = useMutation({
    mutationFn: async ({ forceRegenerate = false }: { forceRegenerate?: boolean } = {}) => {
      const { data, error } = await supabase.functions.invoke(
        "elevenlabs-proposal-token",
        {
          body: {
            proposal_id: proposalId,
            workspace_id: currentWorkspace!.id,
            force_regenerate: forceRegenerate,
          },
        }
      );
      if (error) throw error;
      return data as {
        audio_url: string;
        cached: boolean;
        duration_seconds?: number;
      };
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["proposal-narration", proposalId],
      });
    },
  });

  return { cachedNarration, generateNarration };
}
