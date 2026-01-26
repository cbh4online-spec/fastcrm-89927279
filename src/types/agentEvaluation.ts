/**
 * Agent Evaluation Framework Types
 * 
 * Testing and benchmarking LLM agents including:
 * - Behavioral testing
 * - Capability assessment
 * - Reliability metrics
 * - Production monitoring
 */

// ============================================
// Test Case Types
// ============================================

export type TestCategory = 
  | 'behavioral'      // Tests agent behavior contracts
  | 'capability'      // Tests specific capabilities
  | 'adversarial'     // Attempts to break the agent
  | 'regression'      // Ensures no regressions
  | 'reliability';    // Tests consistency

export type TestSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface AgentTestCase {
  id: string;
  name: string;
  description: string;
  agentType: string;
  category: TestCategory;
  severity: TestSeverity;
  
  // Input specification
  input: {
    entityType: string;
    entityData: Record<string, unknown>;
    context?: Record<string, unknown>;
    memories?: string[];
  };
  
  // Expected behavior (not exact output)
  expectations: TestExpectation[];
  
  // Test configuration
  config: {
    runs: number;           // Number of times to run (for statistical testing)
    timeoutMs: number;
    retryOnFailure: boolean;
    warmupRuns?: number;    // Runs to discard before measuring
  };
  
  // Metadata
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TestExpectation {
  type: ExpectationType;
  field?: string;          // For field-based expectations
  operator: ExpectationOperator;
  value?: unknown;
  tolerance?: number;      // For numeric comparisons
  pattern?: string;        // For regex matching
  customValidator?: string; // Function name for custom validation
}

export type ExpectationType =
  | 'output_exists'           // Output was generated
  | 'output_format'           // Output matches expected format
  | 'field_value'             // Specific field has expected value
  | 'field_range'             // Numeric field within range
  | 'field_pattern'           // Field matches regex
  | 'confidence_level'        // Confidence meets threshold
  | 'latency'                 // Response time within limit
  | 'no_hallucination'        // No fabricated data
  | 'reasoning_coherent'      // Reasoning trace is logical
  | 'recommendation_valid'    // Recommendation is actionable
  | 'custom';                 // Custom validation function

export type ExpectationOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'less_than'
  | 'in_range'
  | 'matches_pattern'
  | 'is_one_of'
  | 'custom';

// ============================================
// Test Execution Types
// ============================================

export interface TestRun {
  id: string;
  testCaseId: string;
  workspaceId: string;
  
  // Execution details
  status: TestRunStatus;
  startedAt: string;
  completedAt?: string;
  
  // Statistical results (for multiple runs)
  statistics: TestStatistics;
  
  // Individual run results
  runResults: SingleRunResult[];
  
  // Aggregated verdict
  verdict: TestVerdict;
  
  // Environment info
  environment: {
    promptVersion?: string;
    modelVersion?: string;
    agentVersion?: string;
  };
}

export type TestRunStatus = 
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'timeout';

export interface SingleRunResult {
  runIndex: number;
  status: 'pass' | 'fail' | 'error' | 'timeout';
  
  // Agent output
  output?: {
    executiveSummary?: string;
    statusAssessment?: string;
    keySignals?: string[];
    riskIndicators?: string[];
    recommendedAction?: string;
    confidenceLevel?: string;
    rawOutput?: Record<string, unknown>;
  };
  
  // Expectation results
  expectationResults: ExpectationResult[];
  
  // Metrics
  latencyMs: number;
  tokensUsed?: number;
  
  // Error info if failed
  error?: {
    type: string;
    message: string;
    stack?: string;
  };
}

export interface ExpectationResult {
  expectation: TestExpectation;
  passed: boolean;
  actualValue?: unknown;
  message?: string;
}

export interface TestStatistics {
  totalRuns: number;
  passedRuns: number;
  failedRuns: number;
  errorRuns: number;
  timeoutRuns: number;
  
  // Success rate
  passRate: number;        // 0-1
  passRateStdDev: number;
  
  // Latency statistics
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  latencyStdDev: number;
  
  // Token usage
  avgTokensUsed?: number;
  
  // Expectation-level statistics
  expectationPassRates: Record<string, number>;
}

export interface TestVerdict {
  status: 'pass' | 'fail' | 'flaky' | 'inconclusive';
  confidence: number;      // 0-1
  summary: string;
  
  // Flakiness detection
  isFlaky: boolean;
  flakyExpectations?: string[];
  
  // Recommendations
  recommendations?: string[];
}

// ============================================
// Test Suite Types
// ============================================

export interface TestSuite {
  id: string;
  name: string;
  description: string;
  workspaceId: string;
  
  // Test cases in this suite
  testCaseIds: string[];
  
  // Suite configuration
  config: {
    parallelExecution: boolean;
    stopOnFirstFailure: boolean;
    maxConcurrentTests: number;
  };
  
  // Scheduling
  schedule?: {
    enabled: boolean;
    cronExpression: string;
    timezone: string;
  };
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  lastRunAt?: string;
  lastRunStatus?: TestVerdict['status'];
}

export interface TestSuiteRun {
  id: string;
  suiteId: string;
  workspaceId: string;
  
  status: TestRunStatus;
  startedAt: string;
  completedAt?: string;
  
  // Individual test run IDs
  testRunIds: string[];
  
  // Aggregated results
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    flaky: number;
    skipped: number;
  };
  
  verdict: TestVerdict;
}

// ============================================
// Benchmark Types
// ============================================

export interface AgentBenchmark {
  id: string;
  name: string;
  description: string;
  
  // Benchmark categories
  categories: BenchmarkCategory[];
  
  // Scoring
  scoringMethod: 'weighted_average' | 'minimum' | 'custom';
  weights?: Record<string, number>;
  
  // Thresholds
  thresholds: {
    pass: number;
    warn: number;
  };
}

export interface BenchmarkCategory {
  id: string;
  name: string;
  testCaseIds: string[];
  weight: number;
}

export interface BenchmarkResult {
  benchmarkId: string;
  agentType: string;
  workspaceId: string;
  
  timestamp: string;
  
  // Scores per category
  categoryScores: Record<string, number>;
  
  // Overall score
  overallScore: number;
  
  // Comparison to baseline
  baseline?: {
    score: number;
    delta: number;
    improved: boolean;
  };
  
  // Pass/fail
  status: 'pass' | 'warn' | 'fail';
}

// ============================================
// Reliability Metrics Types
// ============================================

export interface ReliabilityMetrics {
  agentType: string;
  workspaceId: string;
  periodStart: string;
  periodEnd: string;
  
  // Core metrics
  successRate: number;           // Successful completions
  errorRate: number;             // Errors and timeouts
  flakinessRate: number;         // Inconsistent results
  
  // Latency
  avgLatencyMs: number;
  p95LatencyMs: number;
  latencyDegradation: number;    // vs baseline
  
  // Quality metrics
  avgConfidence: number;
  confidenceStdDev: number;
  
  // Behavioral consistency
  outputConsistency: number;     // Same input → similar output
  reasoningCoherence: number;    // Logical reasoning trace
  
  // Production metrics
  productionErrors: number;
  userFeedbackScore: number;
  recommendationAcceptRate: number;
}

// ============================================
// Adversarial Testing Types
// ============================================

export interface AdversarialTestCase extends AgentTestCase {
  attackType: AdversarialAttackType;
  attackDetails: Record<string, unknown>;
}

export type AdversarialAttackType =
  | 'prompt_injection'          // Attempt to override instructions
  | 'data_poisoning'            // Malformed or misleading data
  | 'context_overflow'          // Exceed context limits
  | 'edge_case_input'           // Extreme or unusual values
  | 'conflicting_signals'       // Contradictory information
  | 'temporal_confusion'        // Confusing date/time info
  | 'missing_data'              // Required fields missing
  | 'unicode_abuse'             // Special characters
  | 'jailbreak_attempt';        // Break out of role

// ============================================
// Behavioral Contract Types
// ============================================

export interface BehavioralContract {
  id: string;
  agentType: string;
  name: string;
  description: string;
  
  // Invariants that must always hold
  invariants: BehavioralInvariant[];
  
  // Pre/post conditions
  preconditions: BehavioralCondition[];
  postconditions: BehavioralCondition[];
}

export interface BehavioralInvariant {
  id: string;
  description: string;
  
  // What to check
  check: {
    type: 'output_field' | 'reasoning' | 'recommendation' | 'custom';
    specification: Record<string, unknown>;
  };
  
  // Severity if violated
  severity: TestSeverity;
}

export interface BehavioralCondition {
  id: string;
  description: string;
  expression: string;  // Condition expression
}

// ============================================
// Production Monitoring Types
// ============================================

export interface ProductionMonitorConfig {
  agentType: string;
  workspaceId: string;
  
  enabled: boolean;
  
  // What to monitor
  monitors: ProductionMonitor[];
  
  // Alerting
  alerts: AlertConfig[];
}

export interface ProductionMonitor {
  id: string;
  type: 'latency' | 'error_rate' | 'quality' | 'drift' | 'custom';
  
  // Thresholds
  warnThreshold: number;
  criticalThreshold: number;
  
  // Window
  windowMinutes: number;
  
  // Sampling
  sampleRate: number;  // 0-1
}

export interface AlertConfig {
  id: string;
  monitorId: string;
  
  severity: 'warn' | 'critical';
  
  // Actions
  actions: ('log' | 'notify' | 'pause_agent' | 'rollback')[];
  
  // Notification
  notificationChannels: string[];
}

// ============================================
// Evaluation Report Types
// ============================================

export interface EvaluationReport {
  id: string;
  workspaceId: string;
  generatedAt: string;
  
  // Period covered
  periodStart: string;
  periodEnd: string;
  
  // Agents evaluated
  agentReports: AgentEvaluationReport[];
  
  // Overall health
  overallHealth: 'healthy' | 'degraded' | 'critical';
  
  // Key findings
  findings: EvaluationFinding[];
  
  // Recommendations
  recommendations: string[];
}

export interface AgentEvaluationReport {
  agentType: string;
  
  // Test results summary
  testsSummary: {
    total: number;
    passed: number;
    failed: number;
    flaky: number;
  };
  
  // Benchmark score
  benchmarkScore?: number;
  benchmarkDelta?: number;
  
  // Reliability metrics
  reliability: ReliabilityMetrics;
  
  // Issues found
  issues: EvaluationIssue[];
}

export interface EvaluationFinding {
  type: 'regression' | 'improvement' | 'anomaly' | 'drift';
  severity: TestSeverity;
  agentType: string;
  description: string;
  details: Record<string, unknown>;
}

export interface EvaluationIssue {
  type: string;
  severity: TestSeverity;
  description: string;
  affectedTests?: string[];
  suggestedFix?: string;
}
