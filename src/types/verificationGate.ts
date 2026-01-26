/**
 * Verification Gate Types
 * 
 * Enforces evidence-based success claims across all AI agents and workflows.
 * NO SUCCESS CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE.
 */

// Verification status - no ambiguity allowed
export type VerificationStatus = 
  | 'verified'      // Proof obtained
  | 'not_verified'  // No proof yet
  | 'partial'       // Some evidence, incomplete
  | 'failed'        // Verification attempted, failed
  | 'pending';      // Verification in progress

// Types of verification sources
export type VerificationType = 
  | 'database'      // Record exists, status updated
  | 'provider'      // External API confirmation
  | 'workflow'      // Workflow engine confirmation
  | 'job'           // Trigger.dev job status
  | 'business_rule'; // Preconditions satisfied

// Evidence reference types
export interface EvidenceReference {
  type: 'record_id' | 'message_id' | 'job_id' | 'step_id' | 'execution_id';
  value: string;
  source: string;
}

// Core verification evidence structure
export interface VerificationEvidence {
  verificationType: VerificationType;
  reference: EvidenceReference;
  timestamp: string;
  rawResponse?: Record<string, unknown>;
  checksPerformed: string[];
  metadata?: Record<string, unknown>;
}

// Verification result - what every check must return
export interface VerificationResult {
  status: VerificationStatus;
  evidence?: VerificationEvidence;
  reason?: string;
  requiredNextStep?: string;
  retryable: boolean;
  timestamp: string;
}

// Gate check definition
export interface VerificationCheck {
  id: string;
  name: string;
  description: string;
  verificationType: VerificationType;
  execute: () => Promise<VerificationResult>;
  required: boolean;
}

// Gate execution context
export interface VerificationGateContext {
  entityType: 'lead' | 'opportunity' | 'client' | 'contact' | 'workflow' | 'job';
  entityId: string;
  actionType: string;
  workspaceId: string;
  initiatedBy: string;
  initiatedAt: string;
}

// Complete gate result
export interface VerificationGateResult {
  context: VerificationGateContext;
  overallStatus: VerificationStatus;
  checks: {
    checkId: string;
    checkName: string;
    result: VerificationResult;
  }[];
  canClaimSuccess: boolean;
  successClaim?: {
    status: 'success' | 'partial' | 'failed';
    evidence: VerificationEvidence[];
    timestamp: string;
  };
  failureReport?: {
    status: 'not_verified' | 'failed';
    reason: string;
    missingEvidence: string[];
    requiredNextSteps: string[];
  };
  auditTrail: AuditEntry[];
}

// Audit entry for tracking
export interface AuditEntry {
  step: 'identify' | 'run' | 'read' | 'verify' | 'claim';
  timestamp: string;
  action: string;
  result: string;
  details?: Record<string, unknown>;
}

// Database verification params
export interface DatabaseVerificationParams {
  table: string;
  column: string;
  expectedValue: unknown;
  recordId: string;
  additionalChecks?: {
    column: string;
    operator: '=' | '!=' | '>' | '<' | 'is_not_null';
    value?: unknown;
  }[];
}

// Provider verification params
export interface ProviderVerificationParams {
  provider: string;
  messageId?: string;
  externalId?: string;
  expectedStatus: string[];
  endpoint?: string;
}

// Workflow verification params
export interface WorkflowVerificationParams {
  runId: string;
  expectedStepIndex?: number;
  expectedStatus: 'completed' | 'running' | 'failed';
  checkOutput?: boolean;
}

// Job verification params
export interface JobVerificationParams {
  jobId: string;
  runId?: string;
  expectedStatus: 'completed' | 'running' | 'failed' | 'queued';
  checkLogs?: boolean;
  checkRetries?: boolean;
}

// Business rule verification params
export interface BusinessRuleVerificationParams {
  ruleId: string;
  entityType: string;
  entityId: string;
  preconditions: {
    field: string;
    operator: '=' | '!=' | '>' | '<' | 'in' | 'not_in' | 'is_not_null';
    value?: unknown;
  }[];
}

// Forbidden claim patterns (for validation)
export const FORBIDDEN_CLAIM_PATTERNS = [
  'should work',
  'likely completed',
  'probably done',
  'seems successful',
  'appears to have',
  'might have',
  'could have worked',
  'expected to',
  'assumed',
] as const;

// Verification gate configuration
export interface VerificationGateConfig {
  requireAllChecks: boolean;
  allowPartialSuccess: boolean;
  maxRetries: number;
  retryDelayMs: number;
  timeoutMs: number;
  logLevel: 'minimal' | 'standard' | 'verbose';
}

export const DEFAULT_GATE_CONFIG: VerificationGateConfig = {
  requireAllChecks: true,
  allowPartialSuccess: false,
  maxRetries: 3,
  retryDelayMs: 1000,
  timeoutMs: 30000,
  logLevel: 'standard',
};
