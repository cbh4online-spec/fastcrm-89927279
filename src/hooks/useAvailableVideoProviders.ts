import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export type VideoProvider = 'zoom' | 'google_meet';

interface AvailableProviders {
  zoom: boolean;
  google_meet: boolean;
  isLoading: boolean;
  defaultProvider: VideoProvider | null;
}

export function useAvailableVideoProviders(): AvailableProviders {
  const { currentWorkspace } = useWorkspace();
  const [zoom, setZoom] = useState(false);
  const [googleMeet, setGoogleMeet] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentWorkspace?.id) {
      setIsLoading(false);
      return;
    }

    const fetch = async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from('workspace_video_config')
        .select('zoom_enabled, google_meet_enabled')
        .eq('workspace_id', currentWorkspace.id)
        .maybeSingle();

      setZoom(!!data?.zoom_enabled);
      setGoogleMeet(!!data?.google_meet_enabled);
      setIsLoading(false);
    };

    fetch();
  }, [currentWorkspace?.id]);

  const defaultProvider: VideoProvider | null = googleMeet
    ? 'google_meet'
    : zoom
      ? 'zoom'
      : null;

  return { zoom, google_meet: googleMeet, isLoading, defaultProvider };
}
