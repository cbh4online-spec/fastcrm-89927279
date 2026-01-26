/**
 * Agent Lifecycle & Orchestration Manager - Type Definitions
 */

// =============================================================================
// ENUMS (matching database)
// =============================================================================

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export type AgentTrigger = 
  | 'manual' 
  | 'entity_created' 
  | 'status_changed' 
  | 'time_based' 
  | 'message_received';

// =============================================================================
// AGENT REGISTRY
// =============================================================================

export interface AgentRegistryEntry {
  id: string;
  agentType: string;
  displayName: string;
  description: string | null;
  
  // Scopes
  entityTypes: string[];
  enabledTriggers: AgentTrigger[];
  
  // Limits
  maxReasoningIterations: number;
  maxToolCalls: number;
  timeoutMs: number;
  cooldownMs: number;
  maxExecutionsPerHourEntity: number;
  maxExecutionsPerHourWorkspace: number;
  
  // State
  isEnabled: boolean;
  priority: number;
  
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// JOBS
// =============================================================================

export interface AgentJob {
  id: string;
  workspaceId: string;
  
  // Job definition
  agentType: string;
  entityId: string;
  entityType: string;
  triggerType: AgentTrigger;
  priority: number;
  context: Record<string, unknown>;
  
  // Scheduling
  scheduledFor: string;
  startedAt: string | null;
  completedAt: string | null;
  
  // State
  status: JobStatus;
  executionId: string | null;
  errorMessage: string | null;
  attempts: number;
  maxAttempts: number;
  
  // Metadata
  createdAt: string;
  createdBy: string | null;
}

export interface CreateJobRequest {
  workspaceId: string;
  agentType: string;
  entityId: string;
  entityType: string;
  triggerType: AgentTrigger;
  priority?: number;
  context?: Record<string, unknown>;
  scheduledFor?: string;
}

// =============================================================================
// LOCKS
// =============================================================================

export interface AgentLock {
  id: string;
  workspaceId: string;
  entityId: string;
  agentType: string;
  jobId: string | null;
  lockedAt: string;
  lockedBy: string | null;
  expiresAt: string;
}

export interface LockResult {
  acquired: boolean;
  lockId?: string;
  expiresAt?: string;
  reason?: string;
}

// =============================================================================
// SCHEDULES
// =============================================================================

export interface AgentSchedule {
  id: string;
  workspaceId: string;
  
  // Schedule definition
  name: string;
  description: string | null;
  agentType: string;
  entityFilter: Record<string, unknown>;
  
  // Timing
  cronExpression: string;
  timezone: string;
  lastRunAt: string | null;
  nextRunAt: string | null;
  
  // Limits
  maxEntitiesPerRun: number;
  priority: number;
  
  // State
  isEnabled: boolean;
  
  createdAt: string;
  createdBy: string | null;
}

export interface CreateScheduleRequest {
  workspaceId: string;
  name: string;
  description?: string;
  agentType: string;
  entityFilter?: Record<string, unknown>;
  cronExpression: string;
  timezone?: string;
  maxEntitiesPerRun?: number;
  priority?: number;
}

// =============================================================================
// RATE LIMIT CHECK
// =============================================================================

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  limit?: number;
  current?: number;
  waitMs?: number;
  config?: {
    maxReasoningIterations: number;
    maxToolCalls: number;
    timeoutMs: number;
  };
}

// =============================================================================
// LIFECYCLE RESPONSE
// =============================================================================

export interface LifecycleResponse {
  // Identification
  jobId: string;
  agentType: string;
  entityId: string;
  
  // Status
  status: JobStatus;
  
  // Timing
  scheduledFor: string;
  startedAt?: string;
  completedAt?: string;
  
  // Result (if completed)
  executionId?: string;
  success?: boolean;
  
  // Error (if failed)
  errorMessage?: string;
  attempts: number;
  
  // Queue position
  queuePosition?: number;
  estimatedWaitMs?: number;
  
  // Job already exists
  alreadyExists?: boolean;
  message?: string;
}

// =============================================================================
// PRIORITY CONSTANTS
// =============================================================================

export const TRIGGER_PRIORITIES: Record<AgentTrigger, number> = {
  manual: 100,
  status_changed: 80,
  entity_created: 60,
  message_received: 40,
  time_based: 20,
};

// =============================================================================
// HELPERS
// =============================================================================

export function getDefaultPriority(trigger: AgentTrigger): number {
  return TRIGGER_PRIORITIES[trigger] ?? 50;
}

export function isJobActive(status: JobStatus): boolean {
  return status === 'pending' || status === 'running';
}

export function isJobTerminal(status: JobStatus): boolean {
  return status === 'completed' || status === 'failed' || status === 'cancelled';
}

export function getStatusColor(status: JobStatus): string {
  switch (status) {
    case 'pending': return 'text-yellow-600';
    case 'running': return 'text-blue-600';
    case 'completed': return 'text-green-600';
    case 'failed': return 'text-red-600';
    case 'cancelled': return 'text-muted-foreground';
  }
}

export function getStatusLabel(status: JobStatus): string {
  switch (status) {
    case 'pending': return 'Pendente';
    case 'running': return 'A executar';
    case 'completed': return 'Concluído';
    case 'failed': return 'Falhou';
    case 'cancelled': return 'Cancelado';
  }
}
