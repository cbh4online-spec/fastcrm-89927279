import { supabase } from '@/integrations/supabase/client';
import { generateRequestId } from './requestId';

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
  correlation_id?: string;
  causation_id?: string;
  occurred_at?: string;
  schema_version?: number;
  metadata?: Record<string, unknown>;
}) {
  try {
    const correlation_id = params.correlation_id ?? generateRequestId();
    await supabase.functions.invoke('kernel-ingest-event', {
      body: {
        actor_type: 'user',
        schema_version: 1,
        occurred_at: new Date().toISOString(),
        ...params,
        correlation_id,
      },
    });
  } catch (err) {
    console.warn('[KernelEmitter] Failed to emit event:', (err as Error).message);
  }
}
