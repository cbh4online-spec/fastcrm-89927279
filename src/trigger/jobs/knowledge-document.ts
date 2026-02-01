/**
 * Knowledge Document Processing Job Definition
 * 
 * Handles large document processing via Trigger.dev for files that exceed
 * the Edge Function memory limits (>20MB).
 */

import type {
  TriggerJobPayload,
  TriggerJobResult,
  TriggerJobProgressEvent,
} from '@/types/trigger';

// Job configuration
export const KNOWLEDGE_DOCUMENT_JOB_CONFIG = {
  id: 'knowledge-document',
  name: 'Knowledge Document Processing',
  version: '1.0.0',
  maxDuration: 900, // 15 minutes max for very large documents
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeout: 10000,
    maxTimeout: 120000,
  },
  concurrency: {
    perWorkspace: 3,
  },
};

// Payload interface
export interface KnowledgeDocumentJobPayload extends TriggerJobPayload {
  jobType: 'knowledge-document';
  inputData: {
    sourceId: string;
    filePath: string;
    fileName: string;
    mimeType: string;
    knowledgeBaseId: string;
    fileSize: number;
  };
}

// Result interface
export interface KnowledgeDocumentJobResult extends TriggerJobResult {
  output: {
    sourceId: string;
    entriesCreated: number;
    faqsExtracted: number;
    topicsIdentified: number;
    charactersProcessed: number;
    processingMode: 'full' | 'chunked';
    summary: string;
  };
}

/**
 * Validate knowledge document job payload
 */
export function validateKnowledgeDocumentPayload(payload: unknown): payload is KnowledgeDocumentJobPayload {
  if (!payload || typeof payload !== 'object') return false;
  
  const p = payload as Record<string, unknown>;
  
  if (p.jobType !== 'knowledge-document') return false;
  if (!p.workspaceId || typeof p.workspaceId !== 'string') return false;
  if (!p.inputData || typeof p.inputData !== 'object') return false;
  
  const inputData = p.inputData as Record<string, unknown>;
  if (!inputData.sourceId || typeof inputData.sourceId !== 'string') return false;
  if (!inputData.filePath || typeof inputData.filePath !== 'string') return false;
  if (!inputData.fileName || typeof inputData.fileName !== 'string') return false;
  if (!inputData.knowledgeBaseId || typeof inputData.knowledgeBaseId !== 'string') return false;
  
  return true;
}

/**
 * Create default knowledge document result structure
 */
export function createDefaultKnowledgeDocumentResult(): KnowledgeDocumentJobResult {
  return {
    success: false,
    output: {
      sourceId: '',
      entriesCreated: 0,
      faqsExtracted: 0,
      topicsIdentified: 0,
      charactersProcessed: 0,
      processingMode: 'full',
      summary: '',
    },
    durationMs: 0,
  };
}

/**
 * Create progress event for knowledge document processing
 */
export function createKnowledgeDocumentProgressEvent(
  jobId: string,
  runId: string,
  event: TriggerJobProgressEvent['event'],
  step: number,
  totalSteps: number,
  message?: string
): TriggerJobProgressEvent {
  return {
    jobId,
    runId,
    event,
    timestamp: new Date().toISOString(),
    data: {
      stepIndex: step,
      progress: totalSteps > 0 ? Math.round((step / totalSteps) * 100) : 0,
      message: message || `Processing step ${step} of ${totalSteps}`,
    },
  };
}
