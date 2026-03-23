
-- Voice Settings table
CREATE TABLE IF NOT EXISTS public.voice_settings (
  workspace_id          uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  default_voice_id      text NOT NULL DEFAULT 'pNInz6obpgDQGcFmaJgB',
  default_voice_name    text NOT NULL DEFAULT 'Adam',
  voice_stability       float NOT NULL DEFAULT 0.5,
  voice_similarity_boost float NOT NULL DEFAULT 0.75,
  voice_style           float NOT NULL DEFAULT 0.0,
  voice_use_speaker_boost boolean NOT NULL DEFAULT true,
  agent_id              text,
  proposal_narration_enabled  boolean NOT NULL DEFAULT true,
  copilot_voice_enabled       boolean NOT NULL DEFAULT false,
  voice_widget_enabled        boolean NOT NULL DEFAULT false,
  total_tts_characters  bigint NOT NULL DEFAULT 0,
  total_conversation_minutes float NOT NULL DEFAULT 0,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.voice_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_can_access_voice_settings" ON public.voice_settings
  FOR ALL TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE TRIGGER trg_voice_settings_updated
  BEFORE UPDATE ON public.voice_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed default settings for existing workspaces
INSERT INTO public.voice_settings (workspace_id)
SELECT id FROM public.workspaces
ON CONFLICT (workspace_id) DO NOTHING;

-- Voice Audio Cache table
CREATE TABLE IF NOT EXISTS public.voice_audio_cache (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id          uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  cache_key             text NOT NULL,
  storage_path          text NOT NULL,
  public_url            text,
  source_type           text NOT NULL DEFAULT 'custom',
  source_id             uuid,
  text_length           integer,
  voice_id              text NOT NULL,
  voice_name            text,
  duration_seconds      float,
  file_size_bytes       integer,
  play_count            integer NOT NULL DEFAULT 0,
  last_played_at        timestamptz,
  expires_at            timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_voice_cache_key ON public.voice_audio_cache(workspace_id, cache_key);
CREATE INDEX IF NOT EXISTS idx_voice_cache_source ON public.voice_audio_cache(source_type, source_id) WHERE source_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_voice_cache_expires ON public.voice_audio_cache(expires_at);

ALTER TABLE public.voice_audio_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_can_access_voice_cache" ON public.voice_audio_cache
  FOR ALL TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

-- Create storage bucket for voice audio
INSERT INTO storage.buckets (id, name, public) VALUES ('voice-audio', 'voice-audio', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policy for voice audio bucket
CREATE POLICY "workspace_members_voice_audio" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'voice-audio')
  WITH CHECK (bucket_id = 'voice-audio');
