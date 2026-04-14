import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;

interface MuxStreamResult {
  stream_key: string;
  playback_id: string;
  rtmp_url: string;
  srt_url: string;
  whip_url: string;
}

interface MuxPlaybackResult {
  playback_id: string;
  playback_url: string;
  thumbnail_url: string;
  status: string;
}

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Não autenticado");
  return {
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
  };
}

function fnUrl(name: string, params?: Record<string, string>) {
  const base = `https://${PROJECT_ID}.supabase.co/functions/v1/${name}`;
  if (!params) return base;
  const qs = new URLSearchParams(params).toString();
  return `${base}?${qs}`;
}

/** Create a Mux live stream for a given livestream ID */
export function useCreateMuxStream() {
  return useMutation({
    mutationFn: async (livestreamId: string): Promise<MuxStreamResult> => {
      const headers = await getAuthHeaders();
      const res = await fetch(fnUrl("mux-livestream", { action: "create" }), {
        method: "POST",
        headers,
        body: JSON.stringify({ livestream_id: livestreamId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erro desconhecido" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      return res.json();
    },
  });
}

/** End/disable a Mux live stream */
export function useEndMuxStream() {
  return useMutation({
    mutationFn: async (livestreamId: string): Promise<void> => {
      const headers = await getAuthHeaders();
      const res = await fetch(fnUrl("mux-livestream", { action: "end" }), {
        method: "POST",
        headers,
        body: JSON.stringify({ livestream_id: livestreamId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erro desconhecido" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
    },
  });
}

/** Get playback info for a livestream */
export async function fetchMuxPlayback(livestreamId: string): Promise<MuxPlaybackResult | null> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(
      fnUrl("mux-livestream", { action: "playback", livestream_id: livestreamId }),
      { method: "GET", headers }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
