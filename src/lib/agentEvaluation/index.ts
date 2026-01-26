/**
 * Agent Evaluation Framework
 * 
 * Comprehensive testing and benchmarking for LLM agents:
 * - Statistical test evaluation
 * - Behavioral contract testing
 * - Adversarial testing
 * - Reliability metrics
 * - Production monitoring
 */

// Types
export type {
  // Test case types
  AgentTestCase,
  TestCategory,
  TestSeverity,
  TestExpectation,
  ExpectationType,
  ExpectationOperator,
  
  // Test execution types
  TestRun,
  TestRunStatus,
  SingleRunResult,
  TestStatistics,
  TestVerdict,
  ExpectationResult,
  
  // Test suite types
  TestSuite,
  TestSuiteRun,
  
  // Benchmark types
  AgentBenchmark,
  BenchmarkCategory,
  BenchmarkResult,
  
  // Reliability types
  ReliabilityMetrics,
  
  // Adversarial types
  AdversarialTestCase,
  AdversarialAttackType,
  
  // Behavioral contract types
  BehavioralContract,
  BehavioralInvariant,
  BehavioralCondition,
  
  // Monitoring types
  ProductionMonitorConfig,
  ProductionMonitor,
  AlertConfig,
  
  // Report types
  EvaluationReport,
  AgentEvaluationReport,
  EvaluationFinding,
  EvaluationIssue,
} from '@/types/agentEvaluation';

// Test Runner
export {
  executeTestCase,
  calculateStatistics,
  determineVerdict,
  evaluateExpectations,
  type TestExecutionContext,
  type AgentExecutor,
  type AgentExecutionResult,
  type TestProgress,
} from './testRunner';

// Behavioral Testing
export {
  AGENT_CONTRACTS,
  validateContract,
  generateTestCasesFromContract,
  type ContractValidationResult,
  type InvariantResult,
  type ConditionResult,
} from './behavioralTesting';

// Adversarial Testing
export {
  ATTACK_GENERATORS,
  generateAdversarialTests,
  calculateRobustnessScore,
  detectInjectionInOutput,
  PROMPT_INJECTION_PATTERNS,
  SQL_INJECTION_PATTERNS,
  XSS_PATTERNS,
  type AttackGenerator,
  type RobustnessScore,
} from './adversarialTesting';

// Reliability Metrics
export {
  calculateReliabilityMetrics,
  analyzeMetricsTrend,
  calculateHealthScore,
  type MetricsInput,
  type ProductionExecution,
  type UserFeedback,
  type MetricsTrend,
  type HealthScore,
} from './reliabilityMetrics';
