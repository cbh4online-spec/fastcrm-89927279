/**
 * Behavioral Contract Testing
 * 
 * Defines and tests agent behavioral invariants.
 * Ensures agents maintain consistent behavior contracts.
 */

import type {
  BehavioralContract,
  BehavioralInvariant,
  AgentTestCase,
  TestExpectation,
  TestSeverity,
} from '@/types/agentEvaluation';

// ============================================
// Pre-defined Behavioral Contracts
// ============================================

/**
 * Standard behavioral contracts for CRM agents
 */
export const AGENT_CONTRACTS: Record<string, BehavioralContract> = {
  lead_agent: {
    id: 'contract_lead_agent',
    agentType: 'lead',
    name: 'Lead Agent Behavioral Contract',
    description: 'Defines expected behaviors for the Lead qualification agent',
    invariants: [
      {
        id: 'lead_always_executive_summary',
        description: 'Lead agent must always provide an executive summary',
        check: {
          type: 'output_field',
          specification: {
            field: 'executiveSummary',
            mustExist: true,
            minLength: 10,
          },
        },
        severity: 'critical',
      },
      {
        id: 'lead_confidence_bounded',
        description: 'Confidence level must be a valid value',
        check: {
          type: 'output_field',
          specification: {
            field: 'confidenceLevel',
            mustBeOneOf: ['high', 'medium', 'low', 'very_high', 'very_low'],
          },
        },
        severity: 'high',
      },
      {
        id: 'lead_recommendation_actionable',
        description: 'Recommended action must be specific and actionable',
        check: {
          type: 'recommendation',
          specification: {
            mustExist: true,
            minLength: 20,
            mustNotContain: ['maybe', 'perhaps', 'might', 'could possibly'],
          },
        },
        severity: 'high',
      },
      {
        id: 'lead_no_pii_leak',
        description: 'Agent must not leak PII in summaries',
        check: {
          type: 'output_field',
          specification: {
            field: 'executiveSummary',
            mustNotMatchPatterns: [
              '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b', // Email
              '\\b\\d{3}[-.]?\\d{3}[-.]?\\d{4}\\b', // Phone
            ],
          },
        },
        severity: 'critical',
      },
    ],
    preconditions: [
      {
        id: 'lead_has_basic_data',
        description: 'Lead must have name and at least one contact method',
        expression: 'input.entityData.name && (input.entityData.email || input.entityData.phone)',
      },
    ],
    postconditions: [
      {
        id: 'lead_output_complete',
        description: 'Output must contain all required fields',
        expression: 'output.executiveSummary && output.statusAssessment && output.confidenceLevel',
      },
    ],
  },

  opportunity_agent: {
    id: 'contract_opportunity_agent',
    agentType: 'opportunity',
    name: 'Opportunity Agent Behavioral Contract',
    description: 'Defines expected behaviors for the Opportunity analysis agent',
    invariants: [
      {
        id: 'opp_probability_bounded',
        description: 'Win probability must be between 0 and 100',
        check: {
          type: 'output_field',
          specification: {
            field: 'winProbability',
            mustBeInRange: [0, 100],
          },
        },
        severity: 'critical',
      },
      {
        id: 'opp_risk_indicators_array',
        description: 'Risk indicators must be an array',
        check: {
          type: 'output_field',
          specification: {
            field: 'riskIndicators',
            mustBeArray: true,
          },
        },
        severity: 'high',
      },
      {
        id: 'opp_reasoning_coherent',
        description: 'Reasoning trace must be present and logical',
        check: {
          type: 'reasoning',
          specification: {
            mustExist: true,
            minSteps: 3,
          },
        },
        severity: 'medium',
      },
    ],
    preconditions: [
      {
        id: 'opp_has_value',
        description: 'Opportunity must have a value',
        expression: 'input.entityData.value !== undefined && input.entityData.value > 0',
      },
    ],
    postconditions: [],
  },

  client_agent: {
    id: 'contract_client_agent',
    agentType: 'client',
    name: 'Client Agent Behavioral Contract',
    description: 'Defines expected behaviors for the Client health agent',
    invariants: [
      {
        id: 'client_health_score_bounded',
        description: 'Health score must be between 0 and 100',
        check: {
          type: 'output_field',
          specification: {
            field: 'healthScore',
            mustBeInRange: [0, 100],
          },
        },
        severity: 'critical',
      },
      {
        id: 'client_churn_risk_valid',
        description: 'Churn risk must be a valid level',
        check: {
          type: 'output_field',
          specification: {
            field: 'churnRisk',
            mustBeOneOf: ['high', 'medium', 'low', 'none'],
          },
        },
        severity: 'high',
      },
    ],
    preconditions: [],
    postconditions: [],
  },
};

// ============================================
// Contract Validation
// ============================================

export interface ContractValidationResult {
  contractId: string;
  agentType: string;
  passed: boolean;
  invariantResults: InvariantResult[];
  preconditionResults: ConditionResult[];
  postconditionResults: ConditionResult[];
  summary: string;
}

export interface InvariantResult {
  invariantId: string;
  passed: boolean;
  severity: TestSeverity;
  message: string;
  actualValue?: unknown;
}

export interface ConditionResult {
  conditionId: string;
  passed: boolean;
  message: string;
}

/**
 * Validate agent output against its behavioral contract
 */
export function validateContract(
  contract: BehavioralContract,
  input: Record<string, unknown>,
  output: Record<string, unknown>
): ContractValidationResult {
  // Check preconditions
  const preconditionResults = contract.preconditions.map(cond => 
    evaluateCondition(cond.id, cond.expression, { input })
  );

  // Check invariants
  const invariantResults = contract.invariants.map(inv => 
    evaluateInvariant(inv, output)
  );

  // Check postconditions
  const postconditionResults = contract.postconditions.map(cond => 
    evaluateCondition(cond.id, cond.expression, { input, output })
  );

  // Determine overall pass/fail
  const criticalFailures = invariantResults.filter(r => !r.passed && r.severity === 'critical');
  const highFailures = invariantResults.filter(r => !r.passed && r.severity === 'high');
  const preconditionsFailed = preconditionResults.some(r => !r.passed);
  const postconditionsFailed = postconditionResults.some(r => !r.passed);

  const passed = criticalFailures.length === 0 && 
                 highFailures.length === 0 && 
                 !preconditionsFailed && 
                 !postconditionsFailed;

  const summary = passed 
    ? 'All contract requirements satisfied'
    : `Contract violations: ${criticalFailures.length} critical, ${highFailures.length} high`;

  return {
    contractId: contract.id,
    agentType: contract.agentType,
    passed,
    invariantResults,
    preconditionResults,
    postconditionResults,
    summary,
  };
}

/**
 * Evaluate a single invariant
 */
function evaluateInvariant(
  invariant: BehavioralInvariant,
  output: Record<string, unknown>
): InvariantResult {
  const { id, check, severity, description } = invariant;
  const spec = check.specification as Record<string, unknown>;

  try {
    switch (check.type) {
      case 'output_field':
        return evaluateFieldInvariant(id, spec, output, severity);
      
      case 'reasoning':
        return evaluateReasoningInvariant(id, spec, output, severity);
      
      case 'recommendation':
        return evaluateRecommendationInvariant(id, spec, output, severity);
      
      default:
        return {
          invariantId: id,
          passed: false,
          severity,
          message: `Unknown invariant type: ${check.type}`,
        };
    }
  } catch (error) {
    return {
      invariantId: id,
      passed: false,
      severity,
      message: `Evaluation error: ${error instanceof Error ? error.message : 'Unknown'}`,
    };
  }
}

function evaluateFieldInvariant(
  id: string,
  spec: Record<string, unknown>,
  output: Record<string, unknown>,
  severity: TestSeverity
): InvariantResult {
  const fieldName = spec.field as string;
  const value = getNestedValue(output, fieldName);

  // Check mustExist
  if (spec.mustExist && (value === undefined || value === null)) {
    return {
      invariantId: id,
      passed: false,
      severity,
      message: `Field '${fieldName}' must exist`,
      actualValue: value,
    };
  }

  // Check minLength
  if (spec.minLength && typeof value === 'string' && value.length < (spec.minLength as number)) {
    return {
      invariantId: id,
      passed: false,
      severity,
      message: `Field '${fieldName}' must have at least ${spec.minLength} characters`,
      actualValue: value?.toString().substring(0, 50),
    };
  }

  // Check mustBeOneOf
  if (spec.mustBeOneOf && !((spec.mustBeOneOf as unknown[]).includes(value))) {
    return {
      invariantId: id,
      passed: false,
      severity,
      message: `Field '${fieldName}' must be one of: ${(spec.mustBeOneOf as unknown[]).join(', ')}`,
      actualValue: value,
    };
  }

  // Check mustBeInRange
  if (spec.mustBeInRange && typeof value === 'number') {
    const [min, max] = spec.mustBeInRange as number[];
    if (value < min || value > max) {
      return {
        invariantId: id,
        passed: false,
        severity,
        message: `Field '${fieldName}' must be between ${min} and ${max}`,
        actualValue: value,
      };
    }
  }

  // Check mustBeArray
  if (spec.mustBeArray && !Array.isArray(value)) {
    return {
      invariantId: id,
      passed: false,
      severity,
      message: `Field '${fieldName}' must be an array`,
      actualValue: typeof value,
    };
  }

  // Check mustNotMatchPatterns
  if (spec.mustNotMatchPatterns && typeof value === 'string') {
    for (const pattern of spec.mustNotMatchPatterns as string[]) {
      if (new RegExp(pattern).test(value)) {
        return {
          invariantId: id,
          passed: false,
          severity,
          message: `Field '${fieldName}' contains prohibited pattern`,
          actualValue: 'REDACTED',
        };
      }
    }
  }

  // Check mustNotContain
  if (spec.mustNotContain && typeof value === 'string') {
    const lower = value.toLowerCase();
    for (const phrase of spec.mustNotContain as string[]) {
      if (lower.includes(phrase.toLowerCase())) {
        return {
          invariantId: id,
          passed: false,
          severity,
          message: `Field '${fieldName}' must not contain '${phrase}'`,
          actualValue: value?.toString().substring(0, 50),
        };
      }
    }
  }

  return {
    invariantId: id,
    passed: true,
    severity,
    message: 'Invariant satisfied',
    actualValue: value,
  };
}

function evaluateReasoningInvariant(
  id: string,
  spec: Record<string, unknown>,
  output: Record<string, unknown>,
  severity: TestSeverity
): InvariantResult {
  const reasoning = output.reasoningTrace || output.reasoning_trace;
  
  if (spec.mustExist && !reasoning) {
    return {
      invariantId: id,
      passed: false,
      severity,
      message: 'Reasoning trace must exist',
    };
  }

  if (spec.minSteps && Array.isArray(reasoning)) {
    if (reasoning.length < (spec.minSteps as number)) {
      return {
        invariantId: id,
        passed: false,
        severity,
        message: `Reasoning must have at least ${spec.minSteps} steps`,
        actualValue: reasoning.length,
      };
    }
  }

  return {
    invariantId: id,
    passed: true,
    severity,
    message: 'Reasoning invariant satisfied',
  };
}

function evaluateRecommendationInvariant(
  id: string,
  spec: Record<string, unknown>,
  output: Record<string, unknown>,
  severity: TestSeverity
): InvariantResult {
  const recommendation = output.recommendedAction || output.recommended_action;
  
  if (spec.mustExist && !recommendation) {
    return {
      invariantId: id,
      passed: false,
      severity,
      message: 'Recommendation must exist',
    };
  }

  if (spec.minLength && typeof recommendation === 'string') {
    if (recommendation.length < (spec.minLength as number)) {
      return {
        invariantId: id,
        passed: false,
        severity,
        message: `Recommendation must have at least ${spec.minLength} characters`,
        actualValue: recommendation.length,
      };
    }
  }

  if (spec.mustNotContain && typeof recommendation === 'string') {
    const lower = recommendation.toLowerCase();
    for (const phrase of spec.mustNotContain as string[]) {
      if (lower.includes(phrase.toLowerCase())) {
        return {
          invariantId: id,
          passed: false,
          severity,
          message: `Recommendation must be definitive, not contain '${phrase}'`,
        };
      }
    }
  }

  return {
    invariantId: id,
    passed: true,
    severity,
    message: 'Recommendation invariant satisfied',
  };
}

function evaluateCondition(
  id: string,
  expression: string,
  context: Record<string, unknown>
): ConditionResult {
  try {
    // Simple expression evaluation (in production, use a proper parser)
    const fn = new Function(...Object.keys(context), `return ${expression}`);
    const result = fn(...Object.values(context));
    
    return {
      conditionId: id,
      passed: Boolean(result),
      message: result ? 'Condition met' : 'Condition not met',
    };
  } catch (error) {
    return {
      conditionId: id,
      passed: false,
      message: `Condition evaluation error: ${error instanceof Error ? error.message : 'Unknown'}`,
    };
  }
}

// ============================================
// Test Case Generation from Contracts
// ============================================

/**
 * Generate test cases from a behavioral contract
 */
export function generateTestCasesFromContract(
  contract: BehavioralContract,
  sampleInputs: Record<string, unknown>[]
): AgentTestCase[] {
  const testCases: AgentTestCase[] = [];

  // Generate tests for each invariant
  for (const invariant of contract.invariants) {
    for (let i = 0; i < sampleInputs.length; i++) {
      testCases.push(createInvariantTestCase(contract, invariant, sampleInputs[i], i));
    }
  }

  return testCases;
}

function createInvariantTestCase(
  contract: BehavioralContract,
  invariant: BehavioralInvariant,
  sampleInput: Record<string, unknown>,
  inputIndex: number
): AgentTestCase {
  const expectations = invariantToExpectations(invariant);

  return {
    id: `tc_${contract.id}_${invariant.id}_${inputIndex}`,
    name: `${invariant.description} (Sample ${inputIndex + 1})`,
    description: `Tests invariant: ${invariant.description}`,
    agentType: contract.agentType,
    category: 'behavioral',
    severity: invariant.severity,
    input: {
      entityType: contract.agentType,
      entityData: sampleInput,
    },
    expectations,
    config: {
      runs: 5,
      timeoutMs: 30000,
      retryOnFailure: false,
    },
    tags: ['behavioral', 'contract', contract.agentType, invariant.severity],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function invariantToExpectations(invariant: BehavioralInvariant): TestExpectation[] {
  const spec = invariant.check.specification as Record<string, unknown>;
  const expectations: TestExpectation[] = [];

  switch (invariant.check.type) {
    case 'output_field':
      if (spec.mustExist) {
        expectations.push({
          type: 'field_value',
          field: spec.field as string,
          operator: 'not_equals',
          value: undefined,
        });
      }
      if (spec.mustBeOneOf) {
        expectations.push({
          type: 'field_value',
          field: spec.field as string,
          operator: 'is_one_of',
          value: spec.mustBeOneOf,
        });
      }
      if (spec.mustBeInRange) {
        expectations.push({
          type: 'field_range',
          field: spec.field as string,
          operator: 'in_range',
          value: spec.mustBeInRange,
        });
      }
      break;

    case 'reasoning':
      expectations.push({
        type: 'reasoning_coherent',
        operator: 'equals',
        value: true,
      });
      break;

    case 'recommendation':
      expectations.push({
        type: 'recommendation_valid',
        operator: 'equals',
        value: true,
      });
      break;
  }

  return expectations;
}

// ============================================
// Utility Functions
// ============================================

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current: unknown, key) => {
    if (current && typeof current === 'object') {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

export { getNestedValue };
