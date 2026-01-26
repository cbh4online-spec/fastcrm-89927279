/**
 * Agent Test Runner
 * 
 * Executes agent tests with statistical evaluation,
 * handling multiple runs and analyzing distributions.
 */

import type {
  AgentTestCase,
  TestRun,
  TestRunStatus,
  SingleRunResult,
  TestStatistics,
  TestVerdict,
  ExpectationResult,
  TestExpectation,
} from '@/types/agentEvaluation';

// ============================================
// Test Execution
// ============================================

export interface TestExecutionContext {
  workspaceId: string;
  agentExecutor: AgentExecutor;
  onProgress?: (progress: TestProgress) => void;
}

export interface AgentExecutor {
  execute: (
    agentType: string,
    input: AgentTestCase['input']
  ) => Promise<AgentExecutionResult>;
}

export interface AgentExecutionResult {
  success: boolean;
  output?: Record<string, unknown>;
  latencyMs: number;
  tokensUsed?: number;
  error?: {
    type: string;
    message: string;
    stack?: string;
  };
}

export interface TestProgress {
  testCaseId: string;
  currentRun: number;
  totalRuns: number;
  status: 'running' | 'completed';
  partialResults?: SingleRunResult[];
}

/**
 * Execute a single test case with statistical evaluation
 */
export async function executeTestCase(
  testCase: AgentTestCase,
  context: TestExecutionContext
): Promise<TestRun> {
  const testRun: TestRun = {
    id: generateTestRunId(),
    testCaseId: testCase.id,
    workspaceId: context.workspaceId,
    status: 'running',
    startedAt: new Date().toISOString(),
    statistics: createEmptyStatistics(),
    runResults: [],
    verdict: {
      status: 'inconclusive',
      confidence: 0,
      summary: 'Test not yet completed',
      isFlaky: false,
    },
    environment: {},
  };

  try {
    const { runs, warmupRuns = 0, timeoutMs } = testCase.config;
    const totalRuns = runs + warmupRuns;

    // Execute all runs
    for (let i = 0; i < totalRuns; i++) {
      const isWarmup = i < warmupRuns;
      
      context.onProgress?.({
        testCaseId: testCase.id,
        currentRun: i + 1,
        totalRuns,
        status: 'running',
        partialResults: testRun.runResults,
      });

      const runResult = await executeTestRun(
        testCase,
        context.agentExecutor,
        i - warmupRuns, // Negative for warmup runs
        timeoutMs
      );

      // Only record non-warmup runs
      if (!isWarmup) {
        testRun.runResults.push(runResult);
      }
    }

    // Calculate statistics
    testRun.statistics = calculateStatistics(testRun.runResults);
    
    // Determine verdict
    testRun.verdict = determineVerdict(testRun.runResults, testRun.statistics, testCase);
    
    testRun.status = 'completed';
    testRun.completedAt = new Date().toISOString();

  } catch (error) {
    testRun.status = 'failed';
    testRun.completedAt = new Date().toISOString();
    testRun.verdict = {
      status: 'fail',
      confidence: 1,
      summary: `Test execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      isFlaky: false,
    };
  }

  context.onProgress?.({
    testCaseId: testCase.id,
    currentRun: testCase.config.runs,
    totalRuns: testCase.config.runs,
    status: 'completed',
    partialResults: testRun.runResults,
  });

  return testRun;
}

/**
 * Execute a single run of a test
 */
async function executeTestRun(
  testCase: AgentTestCase,
  executor: AgentExecutor,
  runIndex: number,
  timeoutMs: number
): Promise<SingleRunResult> {
  const startTime = Date.now();

  try {
    // Execute with timeout
    const result = await Promise.race([
      executor.execute(testCase.agentType, testCase.input),
      timeout(timeoutMs),
    ]);

    if (result === 'timeout') {
      return {
        runIndex,
        status: 'timeout',
        expectationResults: [],
        latencyMs: timeoutMs,
      };
    }

    const executionResult = result as AgentExecutionResult;
    const latencyMs = Date.now() - startTime;

    if (!executionResult.success) {
      return {
        runIndex,
        status: 'error',
        expectationResults: [],
        latencyMs,
        tokensUsed: executionResult.tokensUsed,
        error: executionResult.error,
      };
    }

    // Evaluate expectations
    const expectationResults = evaluateExpectations(
      testCase.expectations,
      executionResult.output,
      latencyMs
    );

    const allPassed = expectationResults.every(r => r.passed);

    return {
      runIndex,
      status: allPassed ? 'pass' : 'fail',
      output: normalizeAgentOutput(executionResult.output),
      expectationResults,
      latencyMs,
      tokensUsed: executionResult.tokensUsed,
    };

  } catch (error) {
    return {
      runIndex,
      status: 'error',
      expectationResults: [],
      latencyMs: Date.now() - startTime,
      error: {
        type: 'ExecutionError',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
    };
  }
}

// ============================================
// Expectation Evaluation
// ============================================

function evaluateExpectations(
  expectations: TestExpectation[],
  output: Record<string, unknown> | undefined,
  latencyMs: number
): ExpectationResult[] {
  return expectations.map(expectation => 
    evaluateSingleExpectation(expectation, output, latencyMs)
  );
}

function evaluateSingleExpectation(
  expectation: TestExpectation,
  output: Record<string, unknown> | undefined,
  latencyMs: number
): ExpectationResult {
  const { type, field, operator, value, tolerance, pattern } = expectation;

  try {
    switch (type) {
      case 'output_exists':
        return {
          expectation,
          passed: output !== undefined && output !== null,
          actualValue: output !== undefined,
          message: output ? 'Output exists' : 'No output generated',
        };

      case 'field_value':
        if (!field || !output) {
          return { expectation, passed: false, message: 'Field or output missing' };
        }
        const fieldValue = getNestedValue(output, field);
        return evaluateOperator(expectation, fieldValue, value, operator);

      case 'field_range':
        if (!field || !output) {
          return { expectation, passed: false, message: 'Field or output missing' };
        }
        const numValue = getNestedValue(output, field);
        if (typeof numValue !== 'number') {
          return { expectation, passed: false, actualValue: numValue, message: 'Field is not a number' };
        }
        const inRange = operator === 'in_range' && 
          Array.isArray(value) && 
          numValue >= value[0] && 
          numValue <= value[1];
        return {
          expectation,
          passed: inRange,
          actualValue: numValue,
          message: inRange ? 'Value in range' : `Value ${numValue} not in range [${value}]`,
        };

      case 'field_pattern':
        if (!field || !output || !pattern) {
          return { expectation, passed: false, message: 'Field, output, or pattern missing' };
        }
        const strValue = String(getNestedValue(output, field));
        const regex = new RegExp(pattern);
        const matches = regex.test(strValue);
        return {
          expectation,
          passed: matches,
          actualValue: strValue,
          message: matches ? 'Pattern matched' : `Value "${strValue}" does not match pattern`,
        };

      case 'confidence_level':
        const confidence = output?.confidenceLevel || output?.confidence_level;
        const confValue = parseConfidence(confidence);
        const threshold = typeof value === 'number' ? value : 0.7;
        return {
          expectation,
          passed: confValue >= threshold,
          actualValue: confValue,
          message: confValue >= threshold 
            ? 'Confidence meets threshold' 
            : `Confidence ${confValue} below threshold ${threshold}`,
        };

      case 'latency':
        const maxLatency = typeof value === 'number' ? value : 5000;
        return {
          expectation,
          passed: latencyMs <= maxLatency,
          actualValue: latencyMs,
          message: latencyMs <= maxLatency 
            ? 'Latency within limit' 
            : `Latency ${latencyMs}ms exceeds limit ${maxLatency}ms`,
        };

      case 'recommendation_valid':
        const recommendation = output?.recommendedAction || output?.recommended_action;
        const hasRecommendation = recommendation !== undefined && 
          recommendation !== null && 
          String(recommendation).trim().length > 0;
        return {
          expectation,
          passed: hasRecommendation,
          actualValue: recommendation,
          message: hasRecommendation 
            ? 'Valid recommendation present' 
            : 'No valid recommendation',
        };

      case 'reasoning_coherent':
        const reasoning = output?.reasoningTrace || output?.reasoning_trace;
        const hasReasoning = reasoning !== undefined && 
          (Array.isArray(reasoning) ? reasoning.length > 0 : true);
        return {
          expectation,
          passed: hasReasoning,
          actualValue: reasoning,
          message: hasReasoning 
            ? 'Reasoning trace present' 
            : 'No reasoning trace',
        };

      default:
        return {
          expectation,
          passed: false,
          message: `Unknown expectation type: ${type}`,
        };
    }
  } catch (error) {
    return {
      expectation,
      passed: false,
      message: `Evaluation error: ${error instanceof Error ? error.message : 'Unknown'}`,
    };
  }
}

function evaluateOperator(
  expectation: TestExpectation,
  actualValue: unknown,
  expectedValue: unknown,
  operator: string
): ExpectationResult {
  let passed = false;

  switch (operator) {
    case 'equals':
      passed = actualValue === expectedValue;
      break;
    case 'not_equals':
      passed = actualValue !== expectedValue;
      break;
    case 'contains':
      passed = String(actualValue).includes(String(expectedValue));
      break;
    case 'not_contains':
      passed = !String(actualValue).includes(String(expectedValue));
      break;
    case 'greater_than':
      passed = Number(actualValue) > Number(expectedValue);
      break;
    case 'less_than':
      passed = Number(actualValue) < Number(expectedValue);
      break;
    case 'is_one_of':
      passed = Array.isArray(expectedValue) && expectedValue.includes(actualValue);
      break;
    default:
      passed = false;
  }

  return {
    expectation,
    passed,
    actualValue,
    message: passed ? 'Expectation met' : `Expected ${operator} ${expectedValue}, got ${actualValue}`,
  };
}

// ============================================
// Statistics Calculation
// ============================================

function calculateStatistics(results: SingleRunResult[]): TestStatistics {
  const total = results.length;
  if (total === 0) {
    return createEmptyStatistics();
  }

  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const errors = results.filter(r => r.status === 'error').length;
  const timeouts = results.filter(r => r.status === 'timeout').length;

  // Latency statistics
  const latencies = results.map(r => r.latencyMs).sort((a, b) => a - b);
  const avgLatency = latencies.reduce((a, b) => a + b, 0) / total;
  const latencyVariance = latencies.reduce((sum, l) => sum + Math.pow(l - avgLatency, 2), 0) / total;

  // Token usage
  const tokensUsed = results.map(r => r.tokensUsed).filter((t): t is number => t !== undefined);
  const avgTokens = tokensUsed.length > 0 
    ? tokensUsed.reduce((a, b) => a + b, 0) / tokensUsed.length 
    : undefined;

  // Expectation-level pass rates
  const expectationPassRates: Record<string, number> = {};
  if (results.length > 0 && results[0].expectationResults.length > 0) {
    const numExpectations = results[0].expectationResults.length;
    for (let i = 0; i < numExpectations; i++) {
      const passCount = results.filter(r => r.expectationResults[i]?.passed).length;
      expectationPassRates[`expectation_${i}`] = passCount / total;
    }
  }

  return {
    totalRuns: total,
    passedRuns: passed,
    failedRuns: failed,
    errorRuns: errors,
    timeoutRuns: timeouts,
    passRate: passed / total,
    passRateStdDev: calculateBinomialStdDev(passed / total, total),
    avgLatencyMs: avgLatency,
    p50LatencyMs: percentile(latencies, 0.5),
    p95LatencyMs: percentile(latencies, 0.95),
    p99LatencyMs: percentile(latencies, 0.99),
    latencyStdDev: Math.sqrt(latencyVariance),
    avgTokensUsed: avgTokens,
    expectationPassRates,
  };
}

function createEmptyStatistics(): TestStatistics {
  return {
    totalRuns: 0,
    passedRuns: 0,
    failedRuns: 0,
    errorRuns: 0,
    timeoutRuns: 0,
    passRate: 0,
    passRateStdDev: 0,
    avgLatencyMs: 0,
    p50LatencyMs: 0,
    p95LatencyMs: 0,
    p99LatencyMs: 0,
    latencyStdDev: 0,
    expectationPassRates: {},
  };
}

// ============================================
// Verdict Determination
// ============================================

function determineVerdict(
  results: SingleRunResult[],
  statistics: TestStatistics,
  testCase: AgentTestCase
): TestVerdict {
  const { passRate, passRateStdDev } = statistics;
  
  // Detect flakiness: high variance in results
  const isFlaky = passRate > 0.1 && passRate < 0.9 && passRateStdDev > 0.15;
  
  // Find flaky expectations
  const flakyExpectations: string[] = [];
  Object.entries(statistics.expectationPassRates).forEach(([key, rate]) => {
    if (rate > 0.1 && rate < 0.9) {
      flakyExpectations.push(key);
    }
  });

  // Determine overall status
  let status: TestVerdict['status'];
  let confidence: number;
  let summary: string;

  if (passRate >= 0.95) {
    status = 'pass';
    confidence = Math.min(0.99, passRate);
    summary = `Test passed with ${(passRate * 100).toFixed(1)}% success rate`;
  } else if (passRate <= 0.05) {
    status = 'fail';
    confidence = Math.min(0.99, 1 - passRate);
    summary = `Test failed with ${(passRate * 100).toFixed(1)}% success rate`;
  } else if (isFlaky) {
    status = 'flaky';
    confidence = 1 - passRateStdDev;
    summary = `Test is flaky with ${(passRate * 100).toFixed(1)}% success rate (σ=${(passRateStdDev * 100).toFixed(1)}%)`;
  } else if (statistics.totalRuns < 3) {
    status = 'inconclusive';
    confidence = 0.5;
    summary = 'Insufficient runs for conclusive verdict';
  } else {
    status = passRate >= 0.5 ? 'pass' : 'fail';
    confidence = Math.abs(passRate - 0.5) * 2;
    summary = `Test ${status}ed with ${(passRate * 100).toFixed(1)}% success rate`;
  }

  // Generate recommendations
  const recommendations: string[] = [];
  if (isFlaky) {
    recommendations.push('Consider increasing test stability or investigating non-deterministic behavior');
  }
  if (statistics.p95LatencyMs > 5000) {
    recommendations.push('Latency is high; consider optimizing agent performance');
  }
  if (statistics.errorRuns > 0) {
    recommendations.push('Some runs produced errors; investigate error causes');
  }

  return {
    status,
    confidence,
    summary,
    isFlaky,
    flakyExpectations: flakyExpectations.length > 0 ? flakyExpectations : undefined,
    recommendations: recommendations.length > 0 ? recommendations : undefined,
  };
}

// ============================================
// Utility Functions
// ============================================

function generateTestRunId(): string {
  return `tr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function timeout(ms: number): Promise<'timeout'> {
  return new Promise(resolve => setTimeout(() => resolve('timeout'), ms));
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current: unknown, key) => {
    if (current && typeof current === 'object') {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function parseConfidence(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const map: Record<string, number> = {
      'high': 0.9,
      'medium': 0.7,
      'low': 0.4,
      'very_high': 0.95,
      'very_low': 0.2,
    };
    return map[value.toLowerCase()] || parseFloat(value) || 0;
  }
  return 0;
}

function percentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) return 0;
  const index = Math.ceil(p * sortedValues.length) - 1;
  return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))];
}

function calculateBinomialStdDev(p: number, n: number): number {
  if (n === 0) return 0;
  return Math.sqrt((p * (1 - p)) / n);
}

function normalizeAgentOutput(output: Record<string, unknown> | undefined): SingleRunResult['output'] {
  if (!output) return undefined;
  
  return {
    executiveSummary: output.executive_summary as string | undefined || output.executiveSummary as string | undefined,
    statusAssessment: output.status_assessment as string | undefined || output.statusAssessment as string | undefined,
    keySignals: output.key_signals as string[] | undefined || output.keySignals as string[] | undefined,
    riskIndicators: output.risk_indicators as string[] | undefined || output.riskIndicators as string[] | undefined,
    recommendedAction: output.recommended_action as string | undefined || output.recommendedAction as string | undefined,
    confidenceLevel: output.confidence_level as string | undefined || output.confidenceLevel as string | undefined,
    rawOutput: output,
  };
}

export {
  calculateStatistics,
  determineVerdict,
  evaluateExpectations,
};
