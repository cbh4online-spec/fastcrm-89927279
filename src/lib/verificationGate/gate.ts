/**
 * Verification Gate
 * 
 * The Iron Law: NO SUCCESS CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
 * 
 * Gate Flow: IDENTIFY → RUN → READ → VERIFY → CLAIM (or FAIL)
 */

import type {
  VerificationCheck,
  VerificationGateContext,
  VerificationGateResult,
  VerificationResult,
  VerificationGateConfig,
  AuditEntry,
  VerificationEvidence,
  FORBIDDEN_CLAIM_PATTERNS,
} from '@/types/verificationGate';
import { DEFAULT_GATE_CONFIG } from '@/types/verificationGate';

/**
 * Execute the verification gate
 * 
 * This is the core function that enforces evidence-based success claims.
 * Skipping any step is considered a governance failure.
 */
export async function executeVerificationGate(
  context: VerificationGateContext,
  checks: VerificationCheck[],
  config: Partial<VerificationGateConfig> = {}
): Promise<VerificationGateResult> {
  const fullConfig = { ...DEFAULT_GATE_CONFIG, ...config };
  const auditTrail: AuditEntry[] = [];
  const checkResults: VerificationGateResult['checks'] = [];
  
  // STEP 1: IDENTIFY - Document what checks will prove success
  auditTrail.push({
    step: 'identify',
    timestamp: new Date().toISOString(),
    action: 'Identify verification checks',
    result: `${checks.length} checks identified`,
    details: {
      checks: checks.map(c => ({ id: c.id, name: c.name, required: c.required })),
    },
  });

  // STEP 2: RUN - Execute each verification check
  for (const check of checks) {
    const runEntry: AuditEntry = {
      step: 'run',
      timestamp: new Date().toISOString(),
      action: `Execute check: ${check.name}`,
      result: 'pending',
    };

    let result: VerificationResult;
    let retries = 0;

    // Retry logic with backoff
    while (true) {
      try {
        // Execute with timeout
        const timeoutPromise = new Promise<VerificationResult>((_, reject) => {
          setTimeout(() => reject(new Error('Verification timeout')), fullConfig.timeoutMs);
        });

        result = await Promise.race([check.execute(), timeoutPromise]);

        // STEP 3: READ - Log the result
        runEntry.result = result.status;
        runEntry.details = {
          evidence: result.evidence,
          reason: result.reason,
          retries,
        };
        auditTrail.push(runEntry);

        // If failed but retryable, retry up to max
        if (result.retryable && result.status === 'failed' && retries < fullConfig.maxRetries) {
          retries++;
          await sleep(fullConfig.retryDelayMs * retries); // Exponential backoff
          continue;
        }

        break;
      } catch (err) {
        result = {
          status: 'failed',
          reason: err instanceof Error ? err.message : 'Unknown error',
          retryable: true,
          timestamp: new Date().toISOString(),
        };

        if (retries < fullConfig.maxRetries) {
          retries++;
          await sleep(fullConfig.retryDelayMs * retries);
          continue;
        }

        runEntry.result = 'failed';
        runEntry.details = { error: result.reason, retries };
        auditTrail.push(runEntry);
        break;
      }
    }

    checkResults.push({
      checkId: check.id,
      checkName: check.name,
      result,
    });
  }

  // STEP 4: VERIFY - Analyze results to determine if claim is allowed
  const verifyEntry: AuditEntry = {
    step: 'verify',
    timestamp: new Date().toISOString(),
    action: 'Analyze verification results',
    result: 'pending',
  };

  const requiredChecks = checks.filter(c => c.required);
  const requiredResults = checkResults.filter(r => 
    requiredChecks.some(c => c.id === r.checkId)
  );

  const allRequiredVerified = requiredResults.every(r => r.result.status === 'verified');
  const anyFailed = checkResults.some(r => r.result.status === 'failed');
  const anyPending = checkResults.some(r => r.result.status === 'pending');
  const partialVerified = checkResults.some(r => r.result.status === 'verified') && 
                          checkResults.some(r => r.result.status !== 'verified');

  let overallStatus: VerificationGateResult['overallStatus'];
  let canClaimSuccess = false;

  if (allRequiredVerified && !anyFailed) {
    overallStatus = 'verified';
    canClaimSuccess = true;
  } else if (anyPending) {
    overallStatus = 'pending';
  } else if (partialVerified && fullConfig.allowPartialSuccess) {
    overallStatus = 'partial';
    canClaimSuccess = true;
  } else if (anyFailed) {
    overallStatus = 'failed';
  } else {
    overallStatus = 'not_verified';
  }

  verifyEntry.result = overallStatus;
  verifyEntry.details = {
    requiredChecksVerified: allRequiredVerified,
    anyFailed,
    anyPending,
    canClaimSuccess,
  };
  auditTrail.push(verifyEntry);

  // STEP 5: Build result (CLAIM or FAIL)
  const claimEntry: AuditEntry = {
    step: 'claim',
    timestamp: new Date().toISOString(),
    action: canClaimSuccess ? 'Generate success claim' : 'Generate failure report',
    result: canClaimSuccess ? 'success_claim' : 'failure_report',
  };

  let successClaim: VerificationGateResult['successClaim'];
  let failureReport: VerificationGateResult['failureReport'];

  if (canClaimSuccess) {
    const evidence: VerificationEvidence[] = checkResults
      .filter(r => r.result.evidence)
      .map(r => r.result.evidence!);

    successClaim = {
      status: overallStatus === 'partial' ? 'partial' : 'success',
      evidence,
      timestamp: new Date().toISOString(),
    };

    claimEntry.details = {
      evidenceCount: evidence.length,
      status: successClaim.status,
    };
  } else {
    const missingEvidence = checkResults
      .filter(r => r.result.status !== 'verified' && requiredChecks.some(c => c.id === r.checkId))
      .map(r => r.checkName);

    const requiredNextSteps = checkResults
      .filter(r => r.result.requiredNextStep)
      .map(r => r.result.requiredNextStep!);

    const reasons = checkResults
      .filter(r => r.result.reason)
      .map(r => r.result.reason!);

    failureReport = {
      status: anyFailed ? 'failed' : 'not_verified',
      reason: reasons.join('; ') || 'Verification incomplete',
      missingEvidence,
      requiredNextSteps: [...new Set(requiredNextSteps)],
    };

    claimEntry.details = {
      missingCount: missingEvidence.length,
      status: failureReport.status,
    };
  }

  auditTrail.push(claimEntry);

  return {
    context,
    overallStatus,
    checks: checkResults,
    canClaimSuccess,
    successClaim,
    failureReport,
    auditTrail,
  };
}

/**
 * Validate that a claim message doesn't contain forbidden patterns
 */
export function validateClaimMessage(message: string): {
  valid: boolean;
  violations: string[];
} {
  const forbiddenPatterns: readonly string[] = [
    'should work',
    'likely completed',
    'probably done',
    'seems successful',
    'appears to have',
    'might have',
    'could have worked',
    'expected to',
    'assumed',
  ];

  const lowerMessage = message.toLowerCase();
  const violations = forbiddenPatterns.filter(pattern => 
    lowerMessage.includes(pattern.toLowerCase())
  );

  return {
    valid: violations.length === 0,
    violations,
  };
}

/**
 * Generate a verified success message with evidence
 */
export function generateVerifiedSuccessMessage(
  result: VerificationGateResult
): string {
  if (!result.canClaimSuccess || !result.successClaim) {
    throw new Error('Cannot generate success message for unverified result');
  }

  const evidenceRefs = result.successClaim.evidence
    .map(e => `${e.verificationType}:${e.reference.type}=${e.reference.value}`)
    .join(', ');

  return `[VERIFIED] Action completed successfully. Evidence: ${evidenceRefs}. Verified at: ${result.successClaim.timestamp}`;
}

/**
 * Generate a failure report message
 */
export function generateFailureReportMessage(
  result: VerificationGateResult
): string {
  if (!result.failureReport) {
    throw new Error('No failure report available');
  }

  const nextSteps = result.failureReport.requiredNextSteps.length > 0
    ? ` Next steps: ${result.failureReport.requiredNextSteps.join('; ')}`
    : '';

  return `[NOT VERIFIED] ${result.failureReport.reason}. Missing evidence for: ${result.failureReport.missingEvidence.join(', ')}.${nextSteps}`;
}

/**
 * Create a verification check from a simple async function
 */
export function createCheck(
  id: string,
  name: string,
  description: string,
  verificationType: VerificationCheck['verificationType'],
  execute: () => Promise<VerificationResult>,
  required = true
): VerificationCheck {
  return {
    id,
    name,
    description,
    verificationType,
    execute,
    required,
  };
}

// Helper
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
