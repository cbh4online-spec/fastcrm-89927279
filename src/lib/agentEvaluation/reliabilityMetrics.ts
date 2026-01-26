/**
 * Reliability Metrics
 * 
 * Calculates and tracks agent reliability metrics
 * for production monitoring.
 */

import type {
  ReliabilityMetrics,
  TestRun,
  SingleRunResult,
} from '@/types/agentEvaluation';

// ============================================
// Metrics Calculation
// ============================================

export interface MetricsInput {
  testRuns: TestRun[];
  productionExecutions?: ProductionExecution[];
  userFeedback?: UserFeedback[];
}

export interface ProductionExecution {
  id: string;
  agentType: string;
  workspaceId: string;
  timestamp: string;
  success: boolean;
  latencyMs: number;
  tokensUsed?: number;
  confidenceLevel?: string;
  error?: string;
  recommendationAccepted?: boolean;
}

export interface UserFeedback {
  executionId: string;
  rating: number; // 1-5
  feedbackType: 'helpful' | 'not_helpful' | 'incorrect' | 'neutral';
  timestamp: string;
}

/**
 * Calculate comprehensive reliability metrics
 */
export function calculateReliabilityMetrics(
  agentType: string,
  workspaceId: string,
  input: MetricsInput,
  periodStart: Date,
  periodEnd: Date
): ReliabilityMetrics {
  const { testRuns, productionExecutions = [], userFeedback = [] } = input;

  // Filter to relevant test runs
  const relevantRuns = testRuns.filter(run => 
    run.completedAt && 
    new Date(run.completedAt) >= periodStart && 
    new Date(run.completedAt) <= periodEnd
  );

  // Aggregate all single run results
  const allResults = relevantRuns.flatMap(run => run.runResults);

  // Calculate success metrics
  const successMetrics = calculateSuccessMetrics(allResults);

  // Calculate latency metrics
  const latencyMetrics = calculateLatencyMetrics(allResults, productionExecutions);

  // Calculate quality metrics
  const qualityMetrics = calculateQualityMetrics(allResults);

  // Calculate consistency metrics
  const consistencyMetrics = calculateConsistencyMetrics(relevantRuns);

  // Calculate production metrics
  const productionMetrics = calculateProductionMetrics(
    productionExecutions.filter(e => 
      new Date(e.timestamp) >= periodStart && 
      new Date(e.timestamp) <= periodEnd
    ),
    userFeedback
  );

  return {
    agentType,
    workspaceId,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    successRate: successMetrics.successRate,
    errorRate: successMetrics.errorRate,
    flakinessRate: consistencyMetrics.flakinessRate,
    avgLatencyMs: latencyMetrics.avgLatencyMs,
    p95LatencyMs: latencyMetrics.p95LatencyMs,
    latencyDegradation: latencyMetrics.degradation,
    avgConfidence: qualityMetrics.avgConfidence,
    confidenceStdDev: qualityMetrics.confidenceStdDev,
    outputConsistency: consistencyMetrics.outputConsistency,
    reasoningCoherence: qualityMetrics.reasoningCoherence,
    productionErrors: productionMetrics.errorCount,
    userFeedbackScore: productionMetrics.feedbackScore,
    recommendationAcceptRate: productionMetrics.acceptRate,
  };
}

// ============================================
// Success Metrics
// ============================================

interface SuccessMetrics {
  successRate: number;
  errorRate: number;
  timeoutRate: number;
}

function calculateSuccessMetrics(results: SingleRunResult[]): SuccessMetrics {
  if (results.length === 0) {
    return { successRate: 0, errorRate: 0, timeoutRate: 0 };
  }

  const total = results.length;
  const passed = results.filter(r => r.status === 'pass').length;
  const errors = results.filter(r => r.status === 'error').length;
  const timeouts = results.filter(r => r.status === 'timeout').length;

  return {
    successRate: passed / total,
    errorRate: (errors + timeouts) / total,
    timeoutRate: timeouts / total,
  };
}

// ============================================
// Latency Metrics
// ============================================

interface LatencyMetrics {
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  degradation: number;
}

function calculateLatencyMetrics(
  testResults: SingleRunResult[],
  productionExecutions: ProductionExecution[]
): LatencyMetrics {
  const allLatencies = [
    ...testResults.map(r => r.latencyMs),
    ...productionExecutions.map(e => e.latencyMs),
  ].sort((a, b) => a - b);

  if (allLatencies.length === 0) {
    return {
      avgLatencyMs: 0,
      p50LatencyMs: 0,
      p95LatencyMs: 0,
      p99LatencyMs: 0,
      degradation: 0,
    };
  }

  const avg = allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length;

  // Calculate baseline (first 20% of data) vs recent (last 20%)
  const baselineSize = Math.max(1, Math.floor(allLatencies.length * 0.2));
  const baseline = allLatencies.slice(0, baselineSize);
  const recent = allLatencies.slice(-baselineSize);
  
  const baselineAvg = baseline.reduce((a, b) => a + b, 0) / baseline.length;
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  
  const degradation = baselineAvg > 0 
    ? (recentAvg - baselineAvg) / baselineAvg 
    : 0;

  return {
    avgLatencyMs: avg,
    p50LatencyMs: percentile(allLatencies, 0.5),
    p95LatencyMs: percentile(allLatencies, 0.95),
    p99LatencyMs: percentile(allLatencies, 0.99),
    degradation,
  };
}

// ============================================
// Quality Metrics
// ============================================

interface QualityMetrics {
  avgConfidence: number;
  confidenceStdDev: number;
  reasoningCoherence: number;
}

function calculateQualityMetrics(results: SingleRunResult[]): QualityMetrics {
  const confidenceValues: number[] = [];
  let reasoningPresent = 0;

  for (const result of results) {
    if (result.output?.confidenceLevel) {
      confidenceValues.push(parseConfidence(result.output.confidenceLevel));
    }
    if (result.output?.rawOutput?.reasoningTrace) {
      reasoningPresent++;
    }
  }

  const avgConfidence = confidenceValues.length > 0
    ? confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length
    : 0;

  const variance = confidenceValues.length > 0
    ? confidenceValues.reduce((sum, c) => sum + Math.pow(c - avgConfidence, 2), 0) / confidenceValues.length
    : 0;

  return {
    avgConfidence,
    confidenceStdDev: Math.sqrt(variance),
    reasoningCoherence: results.length > 0 ? reasoningPresent / results.length : 0,
  };
}

// ============================================
// Consistency Metrics
// ============================================

interface ConsistencyMetrics {
  flakinessRate: number;
  outputConsistency: number;
}

function calculateConsistencyMetrics(testRuns: TestRun[]): ConsistencyMetrics {
  if (testRuns.length === 0) {
    return { flakinessRate: 0, outputConsistency: 0 };
  }

  // Calculate flakiness
  const flakyRuns = testRuns.filter(run => run.verdict.isFlaky).length;
  const flakinessRate = flakyRuns / testRuns.length;

  // Calculate output consistency
  // Compare outputs from same test case across runs
  const testCaseOutputs = new Map<string, string[]>();
  
  for (const run of testRuns) {
    for (const result of run.runResults) {
      if (result.output?.executiveSummary) {
        const key = run.testCaseId;
        const outputs = testCaseOutputs.get(key) || [];
        outputs.push(result.output.executiveSummary);
        testCaseOutputs.set(key, outputs);
      }
    }
  }

  let totalSimilarity = 0;
  let comparisons = 0;

  for (const outputs of testCaseOutputs.values()) {
    if (outputs.length >= 2) {
      // Compare each pair
      for (let i = 0; i < outputs.length - 1; i++) {
        for (let j = i + 1; j < outputs.length; j++) {
          totalSimilarity += calculateSimilarity(outputs[i], outputs[j]);
          comparisons++;
        }
      }
    }
  }

  const outputConsistency = comparisons > 0 ? totalSimilarity / comparisons : 1;

  return {
    flakinessRate,
    outputConsistency,
  };
}

// ============================================
// Production Metrics
// ============================================

interface ProductionMetrics {
  errorCount: number;
  feedbackScore: number;
  acceptRate: number;
}

function calculateProductionMetrics(
  executions: ProductionExecution[],
  feedback: UserFeedback[]
): ProductionMetrics {
  const errorCount = executions.filter(e => !e.success).length;

  // Calculate feedback score (1-5 scale)
  const ratings = feedback.map(f => f.rating);
  const feedbackScore = ratings.length > 0
    ? ratings.reduce((a, b) => a + b, 0) / ratings.length
    : 0;

  // Calculate recommendation acceptance rate
  const withRecommendations = executions.filter(e => e.recommendationAccepted !== undefined);
  const accepted = withRecommendations.filter(e => e.recommendationAccepted).length;
  const acceptRate = withRecommendations.length > 0
    ? accepted / withRecommendations.length
    : 0;

  return {
    errorCount,
    feedbackScore,
    acceptRate,
  };
}

// ============================================
// Trend Analysis
// ============================================

export interface MetricsTrend {
  metric: keyof ReliabilityMetrics;
  direction: 'improving' | 'stable' | 'degrading';
  changePercent: number;
  significance: 'high' | 'medium' | 'low';
}

/**
 * Analyze trends between two metric periods
 */
export function analyzeMetricsTrend(
  current: ReliabilityMetrics,
  previous: ReliabilityMetrics
): MetricsTrend[] {
  const trends: MetricsTrend[] = [];

  // Metrics where higher is better
  const higherIsBetter: (keyof ReliabilityMetrics)[] = [
    'successRate',
    'avgConfidence',
    'outputConsistency',
    'reasoningCoherence',
    'userFeedbackScore',
    'recommendationAcceptRate',
  ];

  // Metrics where lower is better
  const lowerIsBetter: (keyof ReliabilityMetrics)[] = [
    'errorRate',
    'flakinessRate',
    'avgLatencyMs',
    'p95LatencyMs',
    'latencyDegradation',
    'productionErrors',
  ];

  for (const metric of higherIsBetter) {
    const curr = current[metric] as number;
    const prev = previous[metric] as number;
    if (prev !== 0) {
      trends.push(createTrend(metric, curr, prev, true));
    }
  }

  for (const metric of lowerIsBetter) {
    const curr = current[metric] as number;
    const prev = previous[metric] as number;
    if (prev !== 0) {
      trends.push(createTrend(metric, curr, prev, false));
    }
  }

  return trends;
}

function createTrend(
  metric: keyof ReliabilityMetrics,
  current: number,
  previous: number,
  higherIsBetter: boolean
): MetricsTrend {
  const changePercent = ((current - previous) / previous) * 100;
  const absChange = Math.abs(changePercent);

  let direction: MetricsTrend['direction'];
  if (absChange < 5) {
    direction = 'stable';
  } else if (higherIsBetter) {
    direction = changePercent > 0 ? 'improving' : 'degrading';
  } else {
    direction = changePercent < 0 ? 'improving' : 'degrading';
  }

  const significance: MetricsTrend['significance'] = 
    absChange > 20 ? 'high' :
    absChange > 10 ? 'medium' : 'low';

  return {
    metric,
    direction,
    changePercent,
    significance,
  };
}

// ============================================
// Health Score
// ============================================

export interface HealthScore {
  overall: number; // 0-100
  category: 'healthy' | 'degraded' | 'critical';
  components: {
    name: string;
    score: number;
    weight: number;
  }[];
  issues: string[];
}

/**
 * Calculate overall agent health score
 */
export function calculateHealthScore(metrics: ReliabilityMetrics): HealthScore {
  const components = [
    { name: 'Success Rate', score: metrics.successRate * 100, weight: 3 },
    { name: 'Error Rate', score: (1 - metrics.errorRate) * 100, weight: 3 },
    { name: 'Flakiness', score: (1 - metrics.flakinessRate) * 100, weight: 2 },
    { name: 'Latency', score: calculateLatencyScore(metrics.avgLatencyMs), weight: 1 },
    { name: 'Confidence', score: metrics.avgConfidence * 100, weight: 2 },
    { name: 'Consistency', score: metrics.outputConsistency * 100, weight: 2 },
    { name: 'User Feedback', score: (metrics.userFeedbackScore / 5) * 100, weight: 2 },
    { name: 'Accept Rate', score: metrics.recommendationAcceptRate * 100, weight: 1 },
  ];

  const totalWeight = components.reduce((sum, c) => sum + c.weight, 0);
  const weightedSum = components.reduce((sum, c) => sum + c.score * c.weight, 0);
  const overall = weightedSum / totalWeight;

  const category: HealthScore['category'] = 
    overall >= 80 ? 'healthy' :
    overall >= 50 ? 'degraded' : 'critical';

  const issues: string[] = [];
  if (metrics.successRate < 0.9) issues.push('Low success rate');
  if (metrics.errorRate > 0.1) issues.push('High error rate');
  if (metrics.flakinessRate > 0.2) issues.push('High flakiness');
  if (metrics.avgLatencyMs > 5000) issues.push('High latency');
  if (metrics.productionErrors > 0) issues.push(`${metrics.productionErrors} production errors`);

  return {
    overall,
    category,
    components,
    issues,
  };
}

function calculateLatencyScore(avgLatencyMs: number): number {
  // Score based on latency thresholds
  if (avgLatencyMs <= 1000) return 100;
  if (avgLatencyMs <= 2000) return 90;
  if (avgLatencyMs <= 3000) return 80;
  if (avgLatencyMs <= 5000) return 70;
  if (avgLatencyMs <= 10000) return 50;
  return 30;
}

// ============================================
// Utility Functions
// ============================================

function percentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) return 0;
  const index = Math.ceil(p * sortedValues.length) - 1;
  return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))];
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

function calculateSimilarity(str1: string, str2: string): number {
  // Simple Jaccard similarity on words
  const words1 = new Set(str1.toLowerCase().split(/\s+/));
  const words2 = new Set(str2.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return union.size > 0 ? intersection.size / union.size : 1;
}

export {
  calculateSuccessMetrics,
  calculateLatencyMetrics,
  calculateQualityMetrics,
  calculateConsistencyMetrics,
  calculateProductionMetrics,
};
