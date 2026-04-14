
ALTER TABLE public.c2c_livestreams
  ADD COLUMN IF NOT EXISTS mux_stream_id TEXT,
  ADD COLUMN IF NOT EXISTS mux_playback_id TEXT,
  ADD COLUMN IF NOT EXISTS mux_stream_key TEXT;
