import mitt from 'mitt';
import { supabase } from '@/integrations/supabase/client';

// Event type union from PRD
export type ContextEventType =
  | 'system.booted'
  | 'system.tick'
  | 'context.block.created'
  | 'context.block.updated'
  | 'context.block.verified'
  | 'context.block.archived'
  | 'dependency.created'
  | 'dependency.deleted'
  | 'offer.changed'
  | 'drift.computed'
  | 'drift.threshold.crossed'
  | 'impact.calculated'
  | 'task.created'
  | 'task.completed'
  | 'alert.created'
  | 'alert.read'
  | 'brief.generated'
  | 'command.executed';

export interface EventPayload {
  workspace_id: string;
  actor_user_id?: string;
  entity_type?: string;
  entity_id?: string;
  correlation_id?: string;
  meta?: Record<string, unknown>;
  data?: Record<string, unknown>;
}

type Events = {
  [K in ContextEventType]: EventPayload;
};

export const eventBus = mitt<Events>();

export function emitAndPersist(type: ContextEventType, payload: EventPayload) {
  const correlation_id = payload.correlation_id ?? crypto.randomUUID();
  const enriched = { ...payload, correlation_id };

  // Emit to in-memory listeners
  eventBus.emit(type, enriched);

  // Persist async (fire-and-forget)
  supabase
    .from('context_event_log')
    .insert([{
      workspace_id: enriched.workspace_id,
      type,
      actor_user_id: enriched.actor_user_id ?? null,
      entity_type: enriched.entity_type ?? null,
      entity_id: enriched.entity_id ?? null,
      payload_json: JSON.parse(JSON.stringify(enriched)),
      correlation_id,
    }])
    .then(({ error }) => {
      if (error) console.warn('[EventBus] persist failed:', error.message);
    });
}
