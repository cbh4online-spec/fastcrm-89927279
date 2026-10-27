import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { importProspectingLead } from './identity';

/** Conversion ends prospecting; the CRM takes over subsequent follow-up. */
export function importSentProfile(
  client: SupabaseClient<Database>, workspaceId: string,
  profile: { id: string; profile_name: string | null; phone?: string | null; profile_url: string; platform: string },
  allowPossible = false,
) {
  return importProspectingLead(client, workspaceId, {
    name: profile.profile_name || 'Sem nome',
    source: 'instagram_extractor',
    status: 'new', lead_type: 'person', phone: profile.phone || null,
    profile_url: profile.profile_url,
    instagram_url: profile.platform === 'instagram' ? profile.profile_url : null,
  }, profile.id, allowPossible);
}