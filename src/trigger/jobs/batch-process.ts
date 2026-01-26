/**
 * Batch Processing Job Definition
 * 
 * Handles scheduled batch operations like daily pipeline reviews,
 * weekly health checks, and periodic entity re-scoring.
 */

import type {
  BatchProcessJobPayload,
  BatchProcessJobResult,
  TriggerJobProgressEvent,
  EntityType,
} from '@/types/trigger';

// Job configuration
export const BATCH_PROCESS_JOB_CONFIG = {
  id: 'batch-process',
  name: 'Batch Processing',
  version: '1.0.0',
  maxDuration: 600, // 10 minutes max for large batches
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeout: 5000,
    maxTimeout: 60000,
  },
  concurrency: {
    perWorkspace: 2,
  },
};

// Batch types with their configurations
export interface BatchTypeConfig {
  name: string;
  description: string;
  defaultMaxEntities: number;
  cronExpression: string;
  entityTypes: EntityType[];
  actions: BatchAction[];
}

export type BatchAction =
  | 'analyze'
  | 'alert'
  | 'update_score'
  | 'create_task'
  | 'send_notification'
  | 'archive';

export const BATCH_TYPE_CONFIGS: Record<string, BatchTypeConfig> = {
  'daily-pipeline-review': {
    name: 'Daily Pipeline Review',
    description: 'Review all active opportunities and leads for stale items',
    defaultMaxEntities: 500,
    cronExpression: '0 6 * * *', // 6 AM daily
    entityTypes: ['lead', 'opportunity'],
    actions: ['analyze', 'alert', 'create_task'],
  },
  'weekly-health-check': {
    name: 'Weekly Health Check',
    description: 'Comprehensive health check of all clients and key opportunities',
    defaultMaxEntities: 200,
    cronExpression: '0 8 * * 1', // 8 AM every Monday
    entityTypes: ['client', 'opportunity'],
    actions: ['analyze', 'update_score', 'alert'],
  },
  'periodic-rescoring': {
    name: 'Periodic Rescoring',
    description: 'Recalculate lead and opportunity scores based on latest data',
    defaultMaxEntities: 1000,
    cronExpression: '0 3 * * *', // 3 AM daily
    entityTypes: ['lead', 'opportunity'],
    actions: ['update_score'],
  },
};

// Entity filter configuration
export interface EntityFilter {
  entityType?: EntityType;
  status?: string[];
  stageId?: string;
  lastActivityBefore?: string;
  scoreBelow?: number;
  assignedTo?: string;
  tags?: string[];
}

// Batch processing statistics
export interface BatchStats {
  startedAt: string;
  completedAt?: string;
  totalEntities: number;
  processedCount: number;
  skippedCount: number;
  failedCount: number;
  actionsTaken: number;
  alertsGenerated: number;
  recommendationsCreated: number;
  errors: Array<{
    entityId: string;
    entityType: EntityType;
    error: string;
  }>;
}

/**
 * Validate batch process payload
 */
export function validateBatchProcessPayload(payload: unknown): payload is BatchProcessJobPayload {
  if (!payload || typeof payload !== 'object') return false;
  
  const p = payload as Record<string, unknown>;
  
  if (p.jobType !== 'batch-process') return false;
  if (!p.workspaceId || typeof p.workspaceId !== 'string') return false;
  if (!p.inputData || typeof p.inputData !== 'object') return false;
  
  const inputData = p.inputData as Record<string, unknown>;
  if (!inputData.batchType || typeof inputData.batchType !== 'string') return false;
  
  const validBatchTypes = Object.keys(BATCH_TYPE_CONFIGS);
  if (!validBatchTypes.includes(inputData.batchType)) return false;
  
  return true;
}

/**
 * Create default batch process result structure
 */
export function createDefaultBatchResult(): BatchProcessJobResult {
  return {
    success: false,
    output: {
      batchId: '',
      entitiesProcessed: 0,
      entitiesSkipped: 0,
      entitiesFailed: 0,
      summary: {
        actionsTaken: 0,
        alertsGenerated: 0,
        recommendationsCreated: 0,
      },
    },
    durationMs: 0,
  };
}

/**
 * Create progress event for batch processing
 */
export function createBatchProgressEvent(
  jobId: string,
  runId: string,
  event: TriggerJobProgressEvent['event'],
  processed: number,
  total: number,
  message?: string
): TriggerJobProgressEvent {
  return {
    jobId,
    runId,
    event,
    timestamp: new Date().toISOString(),
    data: {
      stepIndex: processed,
      progress: total > 0 ? Math.round((processed / total) * 100) : 0,
      message: message || `Processed ${processed} of ${total} entities`,
    },
  };
}

/**
 * Initialize batch stats
 */
export function initializeBatchStats(totalEntities: number): BatchStats {
  return {
    startedAt: new Date().toISOString(),
    totalEntities,
    processedCount: 0,
    skippedCount: 0,
    failedCount: 0,
    actionsTaken: 0,
    alertsGenerated: 0,
    recommendationsCreated: 0,
    errors: [],
  };
}

/**
 * Finalize batch stats
 */
export function finalizeBatchStats(stats: BatchStats): BatchStats {
  return {
    ...stats,
    completedAt: new Date().toISOString(),
  };
}

/**
 * Build entity filter query parameters
 */
export function buildEntityFilterParams(filter: EntityFilter): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  
  if (filter.entityType) {
    params.entityType = filter.entityType;
  }
  
  if (filter.status && filter.status.length > 0) {
    params.status = filter.status;
  }
  
  if (filter.stageId) {
    params.stageId = filter.stageId;
  }
  
  if (filter.lastActivityBefore) {
    params.lastActivityBefore = filter.lastActivityBefore;
  }
  
  if (filter.scoreBelow !== undefined) {
    params.scoreBelow = filter.scoreBelow;
  }
  
  if (filter.assignedTo) {
    params.assignedTo = filter.assignedTo;
  }
  
  if (filter.tags && filter.tags.length > 0) {
    params.tags = filter.tags;
  }
  
  return params;
}

/**
 * Calculate days since last activity
 */
export function calculateInactivityDays(lastActivityAt: string | null): number {
  if (!lastActivityAt) return Infinity;
  
  const lastActivity = new Date(lastActivityAt).getTime();
  const now = Date.now();
  const diffMs = now - lastActivity;
  
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Determine if entity needs attention based on inactivity
 */
export function needsAttention(
  entityType: EntityType,
  inactivityDays: number
): { needsAttention: boolean; severity: 'low' | 'medium' | 'high' | 'critical' } {
  const thresholds: Record<EntityType, { medium: number; high: number; critical: number }> = {
    lead: { medium: 3, high: 7, critical: 14 },
    opportunity: { medium: 5, high: 10, critical: 21 },
    client: { medium: 14, high: 30, critical: 60 },
    contact: { medium: 30, high: 60, critical: 90 },
    company: { medium: 30, high: 60, critical: 90 },
    task: { medium: 1, high: 3, critical: 7 },
    meeting: { medium: 7, high: 14, critical: 30 },
  };
  
  const entityThresholds = thresholds[entityType] || thresholds.lead;
  
  if (inactivityDays >= entityThresholds.critical) {
    return { needsAttention: true, severity: 'critical' };
  }
  if (inactivityDays >= entityThresholds.high) {
    return { needsAttention: true, severity: 'high' };
  }
  if (inactivityDays >= entityThresholds.medium) {
    return { needsAttention: true, severity: 'medium' };
  }
  
  return { needsAttention: false, severity: 'low' };
}

/**
 * Get batch type configuration
 */
export function getBatchTypeConfig(batchType: string): BatchTypeConfig | null {
  return BATCH_TYPE_CONFIGS[batchType] || null;
}
