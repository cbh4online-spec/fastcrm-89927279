/**
 * useVerificationGate Hook
 * 
 * React hook for executing verification gates and managing verification state.
 */

import { useState, useCallback } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import {
  executeVerificationGate,
  validateClaimMessage,
  generateVerifiedSuccessMessage,
  generateFailureReportMessage,
  createCheck,
  verifyDatabase,
  verifyWorkflow,
  verifyJob,
  verifyBusinessRule,
} from '@/lib/verificationGate';
import type {
  VerificationCheck,
  VerificationGateContext,
  VerificationGateResult,
  VerificationGateConfig,
  DatabaseVerificationParams,
  WorkflowVerificationParams,
  JobVerificationParams,
  BusinessRuleVerificationParams,
} from '@/types/verificationGate';

interface UseVerificationGateOptions {
  config?: Partial<VerificationGateConfig>;
  onVerified?: (result: VerificationGateResult) => void;
  onFailed?: (result: VerificationGateResult) => void;
}

export function useVerificationGate(options: UseVerificationGateOptions = {}) {
  const { currentWorkspace } = useWorkspace();
  const [isVerifying, setIsVerifying] = useState(false);
  const [lastResult, setLastResult] = useState<VerificationGateResult | null>(null);

  /**
   * Execute a verification gate
   */
  const verify = useCallback(async (
    context: Omit<VerificationGateContext, 'workspaceId' | 'initiatedAt'>,
    checks: VerificationCheck[]
  ): Promise<VerificationGateResult> => {
    if (!currentWorkspace?.id) {
      throw new Error('No workspace context');
    }

    setIsVerifying(true);

    try {
      const fullContext: VerificationGateContext = {
        ...context,
        workspaceId: currentWorkspace.id,
        initiatedAt: new Date().toISOString(),
      };

      const result = await executeVerificationGate(fullContext, checks, options.config);
      setLastResult(result);

      if (result.canClaimSuccess) {
        options.onVerified?.(result);
      } else {
        options.onFailed?.(result);
      }

      return result;
    } finally {
      setIsVerifying(false);
    }
  }, [currentWorkspace?.id, options]);

  /**
   * Verify a database record state
   */
  const verifyDatabaseState = useCallback(async (
    entityType: VerificationGateContext['entityType'],
    entityId: string,
    actionType: string,
    initiatedBy: string,
    params: DatabaseVerificationParams
  ): Promise<VerificationGateResult> => {
    const check = createCheck(
      'db-state',
      `Database State: ${params.table}.${params.column}`,
      `Verify ${params.column}=${params.expectedValue} in ${params.table}`,
      'database',
      () => verifyDatabase(params),
      true
    );

    return verify({ entityType, entityId, actionType, initiatedBy }, [check]);
  }, [verify]);

  /**
   * Verify a workflow execution
   */
  const verifyWorkflowExecution = useCallback(async (
    entityType: VerificationGateContext['entityType'],
    entityId: string,
    actionType: string,
    initiatedBy: string,
    params: WorkflowVerificationParams
  ): Promise<VerificationGateResult> => {
    const check = createCheck(
      'workflow-execution',
      `Workflow: ${params.runId}`,
      `Verify workflow run completed with status ${params.expectedStatus}`,
      'workflow',
      () => verifyWorkflow(params),
      true
    );

    return verify({ entityType, entityId, actionType, initiatedBy }, [check]);
  }, [verify]);

  /**
   * Verify a job execution
   */
  const verifyJobExecution = useCallback(async (
    entityType: VerificationGateContext['entityType'],
    entityId: string,
    actionType: string,
    initiatedBy: string,
    params: JobVerificationParams
  ): Promise<VerificationGateResult> => {
    const check = createCheck(
      'job-execution',
      `Job: ${params.jobId}`,
      `Verify job completed with status ${params.expectedStatus}`,
      'job',
      () => verifyJob(params),
      true
    );

    return verify({ entityType, entityId, actionType, initiatedBy }, [check]);
  }, [verify]);

  /**
   * Verify business rule preconditions
   */
  const verifyBusinessRulePreconditions = useCallback(async (
    entityType: VerificationGateContext['entityType'],
    entityId: string,
    actionType: string,
    initiatedBy: string,
    params: BusinessRuleVerificationParams
  ): Promise<VerificationGateResult> => {
    const check = createCheck(
      'business-rule',
      `Rule: ${params.ruleId}`,
      `Verify preconditions for business rule ${params.ruleId}`,
      'business_rule',
      () => verifyBusinessRule(params),
      true
    );

    return verify({ entityType, entityId, actionType, initiatedBy }, [check]);
  }, [verify]);

  /**
   * Create a custom verification check
   */
  const createCustomCheck = useCallback((
    id: string,
    name: string,
    description: string,
    verificationType: VerificationCheck['verificationType'],
    execute: () => Promise<import('@/types/verificationGate').VerificationResult>,
    required = true
  ): VerificationCheck => {
    return createCheck(id, name, description, verificationType, execute, required);
  }, []);

  /**
   * Validate a message for forbidden claim patterns
   */
  const validateMessage = useCallback((message: string) => {
    return validateClaimMessage(message);
  }, []);

  /**
   * Generate appropriate message based on result
   */
  const generateResultMessage = useCallback((result: VerificationGateResult): string => {
    if (result.canClaimSuccess) {
      return generateVerifiedSuccessMessage(result);
    }
    return generateFailureReportMessage(result);
  }, []);

  return {
    // State
    isVerifying,
    lastResult,

    // Core verification
    verify,

    // Convenience methods
    verifyDatabaseState,
    verifyWorkflowExecution,
    verifyJobExecution,
    verifyBusinessRulePreconditions,

    // Utilities
    createCustomCheck,
    validateMessage,
    generateResultMessage,

    // Quick status checks
    isVerified: lastResult?.canClaimSuccess ?? false,
    hasEvidence: (lastResult?.successClaim?.evidence?.length ?? 0) > 0,
    failureReason: lastResult?.failureReport?.reason,
  };
}
