/**
 * Integration Sync Job Definition
 * 
 * Handles reliable synchronization with external systems like email,
 * WhatsApp, payment providers, and external CRMs.
 */

import type {
  IntegrationSyncJobPayload,
  IntegrationSyncJobResult,
  TriggerJobProgressEvent,
} from '@/types/trigger';

// Job configuration
export const INTEGRATION_SYNC_JOB_CONFIG = {
  id: 'integration-sync',
  name: 'Integration Sync',
  version: '1.0.0',
  maxDuration: 180, // 3 minutes max
  retry: {
    maxAttempts: 5, // More retries for external services
    factor: 2,
    minTimeout: 2000,
    maxTimeout: 60000,
  },
  concurrency: {
    perWorkspace: 2,
    perIntegration: 1,
  },
};

// Supported integration types
export type IntegrationType =
  | 'email'
  | 'whatsapp'
  | 'payment'
  | 'calendar'
  | 'external-crm';

// Supported operations per integration
export type IntegrationOperation = 'send' | 'sync' | 'webhook' | 'refresh';

// Integration-specific configurations
export interface IntegrationConfig {
  name: string;
  description: string;
  supportedOperations: IntegrationOperation[];
  rateLimit: {
    requests: number;
    windowMs: number;
  };
  timeout: number;
  requiresAuth: boolean;
}

export const INTEGRATION_CONFIGS: Record<IntegrationType, IntegrationConfig> = {
  email: {
    name: 'Email Integration',
    description: 'Send emails and sync email threads',
    supportedOperations: ['send', 'sync', 'refresh'],
    rateLimit: { requests: 100, windowMs: 60000 },
    timeout: 30000,
    requiresAuth: true,
  },
  whatsapp: {
    name: 'WhatsApp Integration',
    description: 'Send WhatsApp messages and sync conversations',
    supportedOperations: ['send', 'sync', 'webhook'],
    rateLimit: { requests: 60, windowMs: 60000 },
    timeout: 45000,
    requiresAuth: true,
  },
  payment: {
    name: 'Payment Integration',
    description: 'Process payments and sync transaction data',
    supportedOperations: ['sync', 'webhook', 'refresh'],
    rateLimit: { requests: 50, windowMs: 60000 },
    timeout: 60000,
    requiresAuth: true,
  },
  calendar: {
    name: 'Calendar Integration',
    description: 'Sync calendar events and availability',
    supportedOperations: ['sync', 'refresh'],
    rateLimit: { requests: 100, windowMs: 60000 },
    timeout: 30000,
    requiresAuth: true,
  },
  'external-crm': {
    name: 'External CRM Integration',
    description: 'Sync data with external CRM systems',
    supportedOperations: ['sync', 'webhook', 'refresh'],
    rateLimit: { requests: 30, windowMs: 60000 },
    timeout: 120000,
    requiresAuth: true,
  },
};

// Sync operation status
export type SyncStatus = 'pending' | 'syncing' | 'completed' | 'failed' | 'partial';

// Sync result details
export interface SyncDetails {
  itemsSynced: number;
  itemsFailed: number;
  itemsSkipped: number;
  lastSyncedId?: string;
  cursor?: string;
  hasMore: boolean;
}

/**
 * Validate integration sync payload
 */
export function validateIntegrationSyncPayload(payload: unknown): payload is IntegrationSyncJobPayload {
  if (!payload || typeof payload !== 'object') return false;
  
  const p = payload as Record<string, unknown>;
  
  if (p.jobType !== 'integration-sync') return false;
  if (!p.workspaceId || typeof p.workspaceId !== 'string') return false;
  if (!p.inputData || typeof p.inputData !== 'object') return false;
  
  const inputData = p.inputData as Record<string, unknown>;
  
  // Validate integration type
  const validTypes = Object.keys(INTEGRATION_CONFIGS);
  if (!inputData.integrationType || !validTypes.includes(inputData.integrationType as string)) {
    return false;
  }
  
  // Validate operation for the integration type
  const config = INTEGRATION_CONFIGS[inputData.integrationType as IntegrationType];
  if (!inputData.operation || !config.supportedOperations.includes(inputData.operation as IntegrationOperation)) {
    return false;
  }
  
  return true;
}

/**
 * Create default integration sync result structure
 */
export function createDefaultIntegrationResult(): IntegrationSyncJobResult {
  return {
    success: false,
    output: {
      integrationType: '',
      operation: '',
    },
    durationMs: 0,
  };
}

/**
 * Create progress event for integration sync
 */
export function createIntegrationProgressEvent(
  jobId: string,
  runId: string,
  event: TriggerJobProgressEvent['event'],
  itemsSynced: number,
  totalItems: number,
  message?: string
): TriggerJobProgressEvent {
  return {
    jobId,
    runId,
    event,
    timestamp: new Date().toISOString(),
    data: {
      stepIndex: itemsSynced,
      progress: totalItems > 0 ? Math.round((itemsSynced / totalItems) * 100) : 0,
      message: message || `Synced ${itemsSynced} items`,
    },
  };
}

/**
 * Get integration configuration
 */
export function getIntegrationConfig(integrationType: IntegrationType): IntegrationConfig {
  return INTEGRATION_CONFIGS[integrationType];
}

/**
 * Check if operation is supported for integration type
 */
export function isOperationSupported(
  integrationType: IntegrationType,
  operation: IntegrationOperation
): boolean {
  const config = INTEGRATION_CONFIGS[integrationType];
  return config?.supportedOperations.includes(operation) ?? false;
}

/**
 * Calculate rate limit delay
 */
export function calculateRateLimitDelay(
  integrationType: IntegrationType,
  recentRequestCount: number
): number {
  const config = INTEGRATION_CONFIGS[integrationType];
  
  if (recentRequestCount >= config.rateLimit.requests) {
    // Return remaining window time + buffer
    return config.rateLimit.windowMs + 1000;
  }
  
  // Spread requests evenly across the window
  const interval = config.rateLimit.windowMs / config.rateLimit.requests;
  return Math.min(interval, 1000);
}

/**
 * Determine if error is retryable for integration sync
 */
export function isRetryableIntegrationError(error: Error | string): boolean {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const lowerError = errorMessage.toLowerCase();
  
  // Retryable errors (transient failures)
  const retryablePatterns = [
    'timeout',
    'rate limit',
    'too many requests',
    '429',
    '500',
    '502',
    '503',
    '504',
    'connection reset',
    'network error',
    'econnrefused',
    'temporarily unavailable',
  ];
  
  // Non-retryable errors (permanent failures)
  const nonRetryablePatterns = [
    'unauthorized',
    '401',
    '403',
    'forbidden',
    'invalid credentials',
    'invalid api key',
    'not found',
    '404',
    'bad request',
    '400',
    'invalid payload',
  ];
  
  // Check non-retryable first
  if (nonRetryablePatterns.some(pattern => lowerError.includes(pattern))) {
    return false;
  }
  
  // Check retryable patterns
  return retryablePatterns.some(pattern => lowerError.includes(pattern));
}

/**
 * Build webhook signature for outgoing webhooks
 */
export function buildWebhookSignature(
  payload: string,
  secret: string,
  timestamp: number
): string {
  // This is a placeholder - actual implementation would use crypto
  // In edge functions, use Web Crypto API
  return `t=${timestamp},v1=${btoa(payload + secret).slice(0, 32)}`;
}

/**
 * Parse webhook timestamp from signature header
 */
export function parseWebhookTimestamp(signatureHeader: string): number | null {
  const match = signatureHeader.match(/t=(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Check if webhook timestamp is within acceptable window
 */
export function isWebhookTimestampValid(
  timestamp: number,
  toleranceMs: number = 300000 // 5 minutes
): boolean {
  const now = Date.now();
  return Math.abs(now - timestamp) <= toleranceMs;
}
