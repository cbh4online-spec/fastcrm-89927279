import { supabase } from '@/integrations/supabase/client';

/**
 * Emit a kernel event via the kernel-ingest-event edge function.
 * Fire-and-forget by default.
 */
export async function emitKernelEvent(params: {
  workspace_id: string;
  type: string;
  entity_kind: string;
  entity_id: string;
  actor_type?: string;
  actor_id?: string;
  payload?: Record<string, unknown>;
  source_module?: string;
  source_route?: string;
  idempotency_key?: string;
  request_id?: string;
}) {
  try {
    await supabase.functions.invoke('kernel-ingest-event', {
      body: {
        actor_type: 'user',
        ...params,
      },
    });
  } catch (err) {
    console.warn('[KernelEmitter] Failed to emit event:', (err as Error).message);
  }
}
