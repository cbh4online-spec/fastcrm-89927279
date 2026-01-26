/**
 * Workflow Step Executors
 * 
 * Individual executors for each step type.
 * Each executor is idempotent and handles its own error cases.
 * 
 * Note: Uses dynamic table access for some tables.
 * TypeScript errors will resolve after Supabase types are regenerated.
 */

// @ts-nocheck - Some tables not yet in generated types

import { supabase } from '@/integrations/supabase/client';
import { registerStepExecutor } from './workflowEngine';
import type { StepExecutorContext, StepExecutorResult } from '@/types/workflows';

// =============================================================================
// TEMPLATE INTERPOLATION
// =============================================================================

function interpolateTemplate(
  template: string,
  context: Record<string, unknown>
): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const parts = path.trim().split('.');
    let value: unknown = context;
    
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = (value as Record<string, unknown>)[part];
      } else {
        return match;
      }
    }
    
    return String(value);
  });
}

function interpolateObject(
  obj: Record<string, unknown>,
  context: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = interpolateTemplate(value, context);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = interpolateObject(value as Record<string, unknown>, context);
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

// =============================================================================
// CREATE TASK EXECUTOR
// =============================================================================

registerStepExecutor('create_task', async (ctx: StepExecutorContext): Promise<StepExecutorResult> => {
  const { stepConfig, workspaceId, entityType, entityId, accumulatedContext } = ctx;
  
  const input = interpolateObject(stepConfig.input, accumulatedContext);
  
  const title = String(input.title || 'Nova Tarefa');
  const description = input.description ? String(input.description) : undefined;
  const priority = String(input.priority || 'medium');
  const dueInHours = Number(input.due_in_hours) || 24;
  
  const dueDate = new Date();
  dueDate.setHours(dueDate.getHours() + dueInHours);
  
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data: task, error } = await supabase
    .from('tasks')
    .insert({
      workspace_id: workspaceId,
      title,
      description,
      priority,
      due_at: dueDate.toISOString(),
      status: 'pending',
      related_type: entityType || 'general',
      related_id: entityId || '',
      assigned_to: user?.id,
    })
    .select()
    .single();
  
  if (error) {
    return {
      success: false,
      output: {},
      error: {
        message: error.message,
        code: 'CREATE_TASK_ERROR',
        retryable: true,
      },
    };
  }
  
  return {
    success: true,
    output: { task_id: task.id, task },
    contextUpdates: { created_task: task },
  };
});

// =============================================================================
// UPDATE STAGE EXECUTOR
// =============================================================================

registerStepExecutor('update_stage', async (ctx: StepExecutorContext): Promise<StepExecutorResult> => {
  const { stepConfig, entityType, entityId, accumulatedContext } = ctx;
  
  const input = interpolateObject(stepConfig.input, accumulatedContext);
  const targetStage = String(input.stage);
  
  if (!entityId) {
    return {
      success: false,
      output: {},
      error: {
        message: 'Entity ID required for stage update',
        code: 'MISSING_ENTITY',
        retryable: false,
      },
    };
  }
  
  let updateResult: { error: unknown };
  
  if (entityType === 'lead') {
    updateResult = await supabase
      .from('leads')
      .update({ status: targetStage })
      .eq('id', entityId);
  } else if (entityType === 'opportunity') {
    updateResult = await supabase
      .from('opportunities')
      .update({ stage_id: targetStage })
      .eq('id', entityId);
  } else {
    return {
      success: false,
      output: {},
      error: {
        message: `Stage update not supported for entity type: ${entityType}`,
        code: 'UNSUPPORTED_ENTITY',
        retryable: false,
      },
    };
  }
  
  if (updateResult.error) {
    return {
      success: false,
      output: {},
      error: {
        message: String(updateResult.error),
        code: 'UPDATE_STAGE_ERROR',
        retryable: true,
      },
    };
  }
  
  return {
    success: true,
    output: { previous_stage: accumulatedContext.current_stage, new_stage: targetStage },
    contextUpdates: { current_stage: targetStage },
  };
});

// =============================================================================
// CREATE NOTE EXECUTOR
// =============================================================================

registerStepExecutor('create_note', async (ctx: StepExecutorContext): Promise<StepExecutorResult> => {
  const { stepConfig, workspaceId, entityType, entityId, accumulatedContext } = ctx;
  
  const input = interpolateObject(stepConfig.input, accumulatedContext);
  const content = String(input.content || input.note || '');
  
  if (!content) {
    return {
      success: false,
      output: {},
      error: {
        message: 'Note content is required',
        code: 'MISSING_CONTENT',
        retryable: false,
      },
    };
  }
  
  const { data: { user } } = await supabase.auth.getUser();
  
  // Use generic insert for notes table
  const { data, error } = await (supabase
    .from('notes' as 'product_usage_stats')
    .insert({
      workspace_id: workspaceId,
      content,
      entity_type: entityType,
      entity_id: entityId,
      created_by: user?.id,
    } as never)
    .select()
    .single() as unknown as Promise<{ data: { id: string } | null; error: unknown }>);
  
  if (error || !data) {
    return {
      success: false,
      output: {},
      error: {
        message: String(error),
        code: 'CREATE_NOTE_ERROR',
        retryable: true,
      },
    };
  }
  
  return {
    success: true,
    output: { note_id: data.id },
  };
});

// =============================================================================
// NOTIFY USER EXECUTOR
// =============================================================================

registerStepExecutor('notify_user', async (ctx: StepExecutorContext): Promise<StepExecutorResult> => {
  const { stepConfig, workspaceId, accumulatedContext } = ctx;
  
  const input = interpolateObject(stepConfig.input, accumulatedContext);
  const message = String(input.message || '');
  const type = String(input.type || 'info');
  const targetUserId = input.user_id ? String(input.user_id) : undefined;
  
  if (!message) {
    return {
      success: false,
      output: {},
      error: {
        message: 'Notification message is required',
        code: 'MISSING_MESSAGE',
        retryable: false,
      },
    };
  }
  
  const { data: { user } } = await supabase.auth.getUser();
  const userId = targetUserId || user?.id;
  
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      workspace_id: workspaceId,
      user_id: userId,
      title: type === 'urgent' ? '🚨 Alerta Urgente' : 'Notificação',
      message,
      type,
      is_read: false,
    })
    .select()
    .single();
  
  if (error) {
    return {
      success: false,
      output: {},
      error: {
        message: error.message,
        code: 'CREATE_NOTIFICATION_ERROR',
        retryable: true,
      },
    };
  }
  
  return {
    success: true,
    output: { notification_id: data.id },
  };
});

// =============================================================================
// CREATE ACTIVITY EXECUTOR
// =============================================================================

registerStepExecutor('create_activity', async (ctx: StepExecutorContext): Promise<StepExecutorResult> => {
  const { stepConfig, workspaceId, entityType, entityId, accumulatedContext } = ctx;
  
  const input = interpolateObject(stepConfig.input, accumulatedContext);
  const activityType = String(input.type || 'workflow_execution');
  const description = String(input.description || '');
  
  const { data: { user } } = await supabase.auth.getUser();
  
  // Use generic insert for activities table
  const { data, error } = await (supabase
    .from('activities' as 'product_usage_stats')
    .insert({
      workspace_id: workspaceId,
      activity_type: activityType,
      description,
      entity_type: entityType,
      entity_id: entityId,
      user_id: user?.id,
    } as never)
    .select()
    .single() as unknown as Promise<{ data: { id: string } | null; error: unknown }>);
  
  if (error || !data) {
    return {
      success: false,
      output: {},
      error: {
        message: String(error),
        code: 'CREATE_ACTIVITY_ERROR',
        retryable: true,
      },
    };
  }
  
  return {
    success: true,
    output: { activity_id: data.id },
  };
});

// =============================================================================
// DELAY EXECUTOR
// =============================================================================

registerStepExecutor('delay', async (ctx: StepExecutorContext): Promise<StepExecutorResult> => {
  const { stepConfig, accumulatedContext } = ctx;
  
  const input = interpolateObject(stepConfig.input, accumulatedContext);
  const delayMs = Number(input.delay_ms) || Number(input.seconds) * 1000 || 1000;
  
  await new Promise(resolve => setTimeout(resolve, delayMs));
  
  return {
    success: true,
    output: { delayed_ms: delayMs },
  };
});

// =============================================================================
// HTTP CALL EXECUTOR
// =============================================================================

registerStepExecutor('http_call', async (ctx: StepExecutorContext): Promise<StepExecutorResult> => {
  const { stepConfig, accumulatedContext } = ctx;
  
  const input = interpolateObject(stepConfig.input, accumulatedContext);
  const url = String(input.url);
  const method = String(input.method || 'POST').toUpperCase();
  const headers = (input.headers as Record<string, string>) || {};
  const body = input.body;
  
  if (!url) {
    return {
      success: false,
      output: {},
      error: {
        message: 'URL is required for HTTP call',
        code: 'MISSING_URL',
        retryable: false,
      },
    };
  }
  
  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    
    const responseBody = await response.text();
    let parsedBody: unknown;
    
    try {
      parsedBody = JSON.parse(responseBody);
    } catch {
      parsedBody = responseBody;
    }
    
    if (!response.ok) {
      return {
        success: false,
        output: { status: response.status, body: parsedBody },
        error: {
          message: `HTTP ${response.status}: ${response.statusText}`,
          code: 'HTTP_ERROR',
          retryable: response.status >= 500,
        },
      };
    }
    
    return {
      success: true,
      output: { status: response.status, body: parsedBody },
    };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    
    return {
      success: false,
      output: {},
      error: {
        message: error.message,
        code: 'HTTP_FETCH_ERROR',
        retryable: true,
      },
    };
  }
});

// =============================================================================
// CONDITION EXECUTOR
// =============================================================================

registerStepExecutor('condition', async (ctx: StepExecutorContext): Promise<StepExecutorResult> => {
  const { stepConfig, accumulatedContext } = ctx;
  
  const condition = stepConfig.condition;
  if (!condition) {
    return {
      success: true,
      output: { result: true },
    };
  }
  
  const parts = condition.field.split('.');
  let value: unknown = accumulatedContext;
  
  for (const part of parts) {
    if (value && typeof value === 'object' && part in value) {
      value = (value as Record<string, unknown>)[part];
    } else {
      value = undefined;
      break;
    }
  }
  
  let result = false;
  
  switch (condition.operator) {
    case 'eq':
      result = value === condition.value;
      break;
    case 'ne':
      result = value !== condition.value;
      break;
    case 'gt':
      result = Number(value) > Number(condition.value);
      break;
    case 'gte':
      result = Number(value) >= Number(condition.value);
      break;
    case 'lt':
      result = Number(value) < Number(condition.value);
      break;
    case 'lte':
      result = Number(value) <= Number(condition.value);
      break;
    case 'contains':
      result = String(value).includes(String(condition.value));
      break;
    case 'exists':
      result = value !== undefined && value !== null;
      break;
  }
  
  return {
    success: true,
    output: { result, field: condition.field, operator: condition.operator, value },
    contextUpdates: { condition_result: result },
  };
});

// =============================================================================
// SEND EMAIL EXECUTOR (calls edge function)
// =============================================================================

registerStepExecutor('send_email', async (ctx: StepExecutorContext): Promise<StepExecutorResult> => {
  const { stepConfig, workspaceId, accumulatedContext } = ctx;
  
  const input = interpolateObject(stepConfig.input, accumulatedContext);
  
  const { data, error } = await supabase.functions.invoke('send-workflow-email', {
    body: {
      workspaceId,
      to: input.to,
      template: input.template,
      subject: input.subject,
      body: input.body,
      context: accumulatedContext,
    },
  });
  
  if (error) {
    return {
      success: false,
      output: {},
      error: {
        message: error.message,
        code: 'SEND_EMAIL_ERROR',
        retryable: true,
      },
    };
  }
  
  return {
    success: true,
    output: { message_id: data?.messageId },
  };
});

// =============================================================================
// SEND WHATSAPP EXECUTOR (calls edge function)
// =============================================================================

registerStepExecutor('send_whatsapp', async (ctx: StepExecutorContext): Promise<StepExecutorResult> => {
  const { stepConfig, workspaceId, accumulatedContext } = ctx;
  
  const input = interpolateObject(stepConfig.input, accumulatedContext);
  
  const { data, error } = await supabase.functions.invoke('send-workflow-whatsapp', {
    body: {
      workspaceId,
      to: input.to,
      template: input.template,
      message: input.message,
      context: accumulatedContext,
    },
  });
  
  if (error) {
    return {
      success: false,
      output: {},
      error: {
        message: error.message,
        code: 'SEND_WHATSAPP_ERROR',
        retryable: true,
      },
    };
  }
  
  return {
    success: true,
    output: { message_id: data?.messageId },
  };
});

// =============================================================================
// UPDATE ENTITY EXECUTOR
// =============================================================================

registerStepExecutor('update_entity', async (ctx: StepExecutorContext): Promise<StepExecutorResult> => {
  const { stepConfig, entityType, entityId, accumulatedContext } = ctx;
  
  if (!entityId || !entityType) {
    return {
      success: false,
      output: {},
      error: {
        message: 'Entity type and ID required',
        code: 'MISSING_ENTITY',
        retryable: false,
      },
    };
  }
  
  const input = interpolateObject(stepConfig.input, accumulatedContext);
  const updates = (input.updates as Record<string, unknown>) || input;
  
  // Remove internal fields
  const { updates: _, ...cleanUpdates } = updates;
  
  let updateResult: { error: unknown };
  
  switch (entityType) {
    case 'lead':
      updateResult = await supabase.from('leads').update(cleanUpdates).eq('id', entityId);
      break;
    case 'opportunity':
      updateResult = await supabase.from('opportunities').update(cleanUpdates).eq('id', entityId);
      break;
    case 'contact':
      updateResult = await supabase.from('contacts').update(cleanUpdates).eq('id', entityId);
      break;
    case 'company':
      updateResult = await supabase.from('companies').update(cleanUpdates).eq('id', entityId);
      break;
    default:
      return {
        success: false,
        output: {},
        error: {
          message: `Unknown entity type: ${entityType}`,
          code: 'UNKNOWN_ENTITY',
          retryable: false,
        },
      };
  }
  
  if (updateResult.error) {
    return {
      success: false,
      output: {},
      error: {
        message: String(updateResult.error),
        code: 'UPDATE_ENTITY_ERROR',
        retryable: true,
      },
    };
  }
  
  return {
    success: true,
    output: { updated_fields: Object.keys(cleanUpdates) },
  };
});

console.log('[WorkflowStepExecutors] All step executors registered');
