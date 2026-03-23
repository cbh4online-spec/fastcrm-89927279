import { supabase } from '@/integrations/supabase/client';
import type { AIPersona } from '@/types/ai-assistants';

/**
 * Resolves the best persona for a given workspace/context.
 * Called by ai-inbox-reply and conversation-intelligence edge functions.
 */
export async function resolvePersonaForContext(
  workspaceId: string,
  context: { channel?: string; is_b2b_portal?: boolean }
): Promise<AIPersona | null> {
  let query = supabase
    .from('ai_personas')
    .select('*, vibe_profile:vibe_profiles(*)')
    .eq('workspace_id', workspaceId)
    .eq('status', 'active');

  if (context.is_b2b_portal) {
    query = query.eq('active_in_b2b_portal', true);
  } else {
    query = query.eq('active_in_inbox', true);
  }

  const { data } = await query
    .order('is_default', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as unknown as AIPersona) ?? null;
}
