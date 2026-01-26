/**
 * Verification Gate Module
 * 
 * Enforces evidence-based success claims across all AI agents and workflows.
 * 
 * THE IRON LAW: NO SUCCESS CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
 */

export {
  executeVerificationGate,
  validateClaimMessage,
  generateVerifiedSuccessMessage,
  generateFailureReportMessage,
  createCheck,
} from './gate';

export {
  verifyDatabase,
  verifyProvider,
  verifyWorkflow,
  verifyJob,
  verifyBusinessRule,
} from './checks';

// Re-export types
export type {
  VerificationStatus,
  VerificationType,
  EvidenceReference,
  VerificationEvidence,
  VerificationResult,
  VerificationCheck,
  VerificationGateContext,
  VerificationGateResult,
  VerificationGateConfig,
  AuditEntry,
  DatabaseVerificationParams,
  ProviderVerificationParams,
  WorkflowVerificationParams,
  JobVerificationParams,
  BusinessRuleVerificationParams,
} from '@/types/verificationGate';

export { DEFAULT_GATE_CONFIG, FORBIDDEN_CLAIM_PATTERNS } from '@/types/verificationGate';
