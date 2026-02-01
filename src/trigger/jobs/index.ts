/**
 * Trigger.dev Job Registry
 * 
 * Central export point for all job definitions and utilities.
 */

// AI Analysis Job
export {
  AI_ANALYSIS_JOB_CONFIG,
  AGENT_TYPES,
  AI_ANALYSIS_STEPS,
  validateAIAnalysisPayload,
  createDefaultAIAnalysisResult,
  createProgressEvent as createAIProgressEvent,
  getAgentTypeForEntity,
  calculateCooldownRemaining,
  shouldSkipCache,
} from './ai-analysis';

export type { AIAnalysisStep } from './ai-analysis';

// Workflow Execution Job
export {
  WORKFLOW_EXECUTE_JOB_CONFIG,
  validateWorkflowExecutePayload,
  createDefaultWorkflowResult,
  createWorkflowProgressEvent,
  createCheckpoint,
  isRetryableStepError,
  calculateWaitDuration,
  evaluateCondition,
  mergeStepOutput,
} from './workflow-execute';

export type {
  WorkflowStepType,
  StepExecutionStatus,
  WorkflowStepResult,
  WorkflowCheckpoint,
} from './workflow-execute';

// Batch Processing Job
export {
  BATCH_PROCESS_JOB_CONFIG,
  BATCH_TYPE_CONFIGS,
  validateBatchProcessPayload,
  createDefaultBatchResult,
  createBatchProgressEvent,
  initializeBatchStats,
  finalizeBatchStats,
  buildEntityFilterParams,
  calculateInactivityDays,
  needsAttention,
  getBatchTypeConfig,
} from './batch-process';

export type {
  BatchTypeConfig,
  BatchAction,
  EntityFilter,
  BatchStats,
} from './batch-process';

// Integration Sync Job
export {
  INTEGRATION_SYNC_JOB_CONFIG,
  INTEGRATION_CONFIGS,
  validateIntegrationSyncPayload,
  createDefaultIntegrationResult,
  createIntegrationProgressEvent,
  getIntegrationConfig,
  isOperationSupported,
  calculateRateLimitDelay,
  isRetryableIntegrationError,
  buildWebhookSignature,
  parseWebhookTimestamp,
  isWebhookTimestampValid,
} from './integration-sync';

export type {
  IntegrationType,
  IntegrationOperation,
  IntegrationConfig,
  SyncStatus,
  SyncDetails,
} from './integration-sync';

// Knowledge Document Processing Job
export {
  KNOWLEDGE_DOCUMENT_JOB_CONFIG,
  validateKnowledgeDocumentPayload,
  createDefaultKnowledgeDocumentResult,
  createKnowledgeDocumentProgressEvent,
} from './knowledge-document';

export type {
  KnowledgeDocumentJobPayload,
  KnowledgeDocumentJobResult,
} from './knowledge-document';

// Job configuration registry
export const JOB_CONFIGS = {
  'ai-analysis': {
    ...AI_ANALYSIS_JOB_CONFIG,
    validator: validateAIAnalysisPayload,
    resultFactory: createDefaultAIAnalysisResult,
  },
  'workflow-execute': {
    ...WORKFLOW_EXECUTE_JOB_CONFIG,
    validator: validateWorkflowExecutePayload,
    resultFactory: createDefaultWorkflowResult,
  },
  'batch-process': {
    ...BATCH_PROCESS_JOB_CONFIG,
    validator: validateBatchProcessPayload,
    resultFactory: createDefaultBatchResult,
  },
  'integration-sync': {
    ...INTEGRATION_SYNC_JOB_CONFIG,
    validator: validateIntegrationSyncPayload,
    resultFactory: createDefaultIntegrationResult,
  },
  'knowledge-document': {
    ...KNOWLEDGE_DOCUMENT_JOB_CONFIG,
    validator: validateKnowledgeDocumentPayload,
    resultFactory: createDefaultKnowledgeDocumentResult,
  },
} as const;

import { AI_ANALYSIS_JOB_CONFIG } from './ai-analysis';
import { WORKFLOW_EXECUTE_JOB_CONFIG } from './workflow-execute';
import { BATCH_PROCESS_JOB_CONFIG } from './batch-process';
import { INTEGRATION_SYNC_JOB_CONFIG } from './integration-sync';
import { KNOWLEDGE_DOCUMENT_JOB_CONFIG } from './knowledge-document';
import { validateAIAnalysisPayload, createDefaultAIAnalysisResult } from './ai-analysis';
import { validateWorkflowExecutePayload, createDefaultWorkflowResult } from './workflow-execute';
import { validateBatchProcessPayload, createDefaultBatchResult } from './batch-process';
import { validateIntegrationSyncPayload, createDefaultIntegrationResult } from './integration-sync';
import { validateKnowledgeDocumentPayload, createDefaultKnowledgeDocumentResult } from './knowledge-document';

export type JobType = keyof typeof JOB_CONFIGS;

/**
 * Get job configuration by type
 */
export function getJobConfig(jobType: JobType) {
  return JOB_CONFIGS[jobType];
}

/**
 * Validate job payload by type
 */
export function validateJobPayload(jobType: JobType, payload: unknown): boolean {
  const config = JOB_CONFIGS[jobType];
  return config?.validator(payload) ?? false;
}

/**
 * Create default result for job type
 */
export function createDefaultJobResult(jobType: JobType) {
  const config = JOB_CONFIGS[jobType];
  return config?.resultFactory() ?? { success: false, output: {}, durationMs: 0 };
}
