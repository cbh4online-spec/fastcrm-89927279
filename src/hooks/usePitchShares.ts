import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import type { PitchTokens } from '@/lib/pitch/tokens';

export interface PitchShareRow {
  id: string;
  token: string;
  contact_name: string | null;
  company_name: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  view_count: number;
  unique_viewers_count: number;
  last_viewed_at: string | null;
  created_at: string;
  total_slides: number;
}

export interface PitchShareViewRow {
  id: string;
  share_id: string;
  viewer_email: string;
  viewer_name: string | null;
  device_type: string | null;
  started_at: string;
  last_activity_at: string;
  ended_at: string | null;
  total_seconds: number;
  slides_seen: Array<{ index: number; id?: string; seconds: number }>;
  max_slide_index: number;
  completed: boolean;
}

function generateToken(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function usePitchShares() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const [shares, setShares] = useState<PitchShareRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('pitch_shares')
      .select('id, token, contact_name, company_name, expires_at, revoked_at, view_count, unique_viewers_count, last_viewed_at, created_at, total_slides')
      .order('created_at', { ascending: false });
    if (!error && data) setShares(data as PitchShareRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createShare = useCallback(
    async (params: {
      tokens: PitchTokens;
      slideTitles: string[];
      totalSlides: number;
      expiresAt: string | null;
    }) => {
      const token = generateToken();
      const { data, error } = await (supabase as any)
        .from('pitch_shares')
        .insert({
          token,
          workspace_id: currentWorkspace?.id ?? null,
          created_by: user?.id ?? null,
          contact_name: (params.tokens as any).contactName || null,
          company_name: (params.tokens as any).companyName || null,
          tokens_snapshot: params.tokens as unknown as Record<string, unknown>,
          slide_titles: params.slideTitles,
          total_slides: params.totalSlides,
          expires_at: params.expiresAt,
        })
        .select()
        .single();
      if (error) throw error;
      await refresh();
      return data as PitchShareRow;
    },
    [currentWorkspace?.id, user?.id, refresh]
  );

  const revokeShare = useCallback(
    async (id: string) => {
      const { error } = await (supabase as any)
        .from('pitch_shares')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      await refresh();
    },
    [refresh]
  );

  const deleteShare = useCallback(
    async (id: string) => {
      const { error } = await (supabase as any).from('pitch_shares').delete().eq('id', id);
      if (error) throw error;
      await refresh();
    },
    [refresh]
  );

  return { shares, loading, refresh, createShare, revokeShare, deleteShare };
}

export function useShareViews(shareId: string | null) {
  const [views, setViews] = useState<PitchShareViewRow[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!shareId) {
      setViews([]);
      return;
    }
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('pitch_share_views')
      .select('*')
      .eq('share_id', shareId)
      .order('started_at', { ascending: false });
    if (!error && data) setViews(data as unknown as PitchShareViewRow[]);
    setLoading(false);
  }, [shareId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { views, loading, refresh };
}
