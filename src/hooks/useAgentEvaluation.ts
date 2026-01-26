/**
 * Agent Evaluation Hook
 * 
 * React hook for running agent evaluations and tracking results.
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useToast } from '@/hooks/use-toast';
import type {
  AgentTestCase,
  TestRun,
  TestSuite,
  ReliabilityMetrics,
  BenchmarkResult,
} from '@/types/agentEvaluation';
import {
  executeTestCase,
  calculateReliabilityMetrics,
  calculateHealthScore,
  AGENT_CONTRACTS,
  validateContract,
  generateAdversarialTests,
  calculateRobustnessScore,
  type TestExecutionContext,
  type AgentExecutor,
  type HealthScore,
  type RobustnessScore,
} from '@/lib/agentEvaluation';

// ============================================
// Hook State Types
// ============================================

interface EvaluationState {
  isRunning: boolean;
  currentTest: string | null;
  progress: {
    completed: number;
    total: number;
    currentRun: number;
    totalRuns: number;
  };
  results: TestRun[];
  healthScore: HealthScore | null;
  robustnessScore: RobustnessScore | null;
}

interface UseAgentEvaluationReturn {
  state: EvaluationState;
  
  // Test execution
  runTest: (testCase: AgentTestCase) => Promise<TestRun | null>;
  runTestSuite: (suite: TestSuite, testCases: AgentTestCase[]) => Promise<TestRun[]>;
  runBehavioralTests: (agentType: string, sampleInputs: Record<string, unknown>[]) => Promise<TestRun[]>;
  runAdversarialTests: (agentType: string, sampleInputs: Record<string, unknown>[]) => Promise<TestRun[]>;
  
  // Metrics
  calculateMetrics: (agentType: string, daysBack?: number) => Promise<ReliabilityMetrics | null>;
  getHealthScore: (agentType: string) => Promise<HealthScore | null>;
  
  // Results
  getRecentResults: (agentType: string, limit?: number) => Promise<TestRun[]>;
  clearResults: () => void;
  
  // Contract validation
  validateAgentContract: (
    agentType: string,
    input: Record<string, unknown>,
    output: Record<string, unknown>
  ) => ReturnType<typeof validateContract>;
}

// ============================================
// Hook Implementation
// ============================================

export function useAgentEvaluation(): UseAgentEvaluationReturn {
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();
  
  const [state, setState] = useState<EvaluationState>({
    isRunning: false,
    currentTest: null,
    progress: { completed: 0, total: 0, currentRun: 0, totalRuns: 0 },
    results: [],
    healthScore: null,
    robustnessScore: null,
  });

  // Create agent executor that calls the actual agent
  const createAgentExecutor = useCallback((): AgentExecutor => {
    return {
      execute: async (agentType, input) => {
        const startTime = Date.now();
        
        try {
          // Call the agent analysis edge function
          const { data, error } = await supabase.functions.invoke('ai-analyze-entity', {
            body: {
              workspaceId: currentWorkspace?.id,
              entityType: input.entityType,
              entityId: input.entityData.id || 'test-entity',
              entityData: input.entityData,
              agentType,
              isTestRun: true,
            },
          });

          if (error) {
            return {
              success: false,
              latencyMs: Date.now() - startTime,
              error: {
                type: 'EdgeFunctionError',
                message: error.message,
              },
            };
          }

          return {
            success: true,
            output: data,
            latencyMs: Date.now() - startTime,
            tokensUsed: data?.tokensUsed,
          };
        } catch (error) {
          return {
            success: false,
            latencyMs: Date.now() - startTime,
            error: {
              type: 'ExecutionError',
              message: error instanceof Error ? error.message : 'Unknown error',
            },
          };
        }
      },
    };
  }, [currentWorkspace?.id]);

  // Run a single test
  const runTest = useCallback(async (testCase: AgentTestCase): Promise<TestRun | null> => {
    if (!currentWorkspace?.id) {
      toast({
        title: 'Error',
        description: 'No workspace selected',
        variant: 'destructive',
      });
      return null;
    }

    setState(prev => ({
      ...prev,
      isRunning: true,
      currentTest: testCase.id,
      progress: { completed: 0, total: 1, currentRun: 0, totalRuns: testCase.config.runs },
    }));

    try {
      const context: TestExecutionContext = {
        workspaceId: currentWorkspace.id,
        agentExecutor: createAgentExecutor(),
        onProgress: (progress) => {
          setState(prev => ({
            ...prev,
            progress: {
              ...prev.progress,
              currentRun: progress.currentRun,
              totalRuns: progress.totalRuns,
            },
          }));
        },
      };

      const result = await executeTestCase(testCase, context);

      setState(prev => ({
        ...prev,
        isRunning: false,
        currentTest: null,
        results: [...prev.results, result],
        progress: { completed: 1, total: 1, currentRun: 0, totalRuns: 0 },
      }));

      // Show result toast
      toast({
        title: result.verdict.status === 'pass' ? 'Test Passed' : 'Test Failed',
        description: result.verdict.summary,
        variant: result.verdict.status === 'pass' ? 'default' : 'destructive',
      });

      return result;
    } catch (error) {
      setState(prev => ({ ...prev, isRunning: false, currentTest: null }));
      toast({
        title: 'Test Execution Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      return null;
    }
  }, [currentWorkspace?.id, createAgentExecutor, toast]);

  // Run a test suite
  const runTestSuite = useCallback(async (
    suite: TestSuite,
    testCases: AgentTestCase[]
  ): Promise<TestRun[]> => {
    if (!currentWorkspace?.id) {
      toast({
        title: 'Error',
        description: 'No workspace selected',
        variant: 'destructive',
      });
      return [];
    }

    const relevantTests = testCases.filter(tc => suite.testCaseIds.includes(tc.id));
    
    setState(prev => ({
      ...prev,
      isRunning: true,
      progress: { completed: 0, total: relevantTests.length, currentRun: 0, totalRuns: 0 },
    }));

    const results: TestRun[] = [];
    const context: TestExecutionContext = {
      workspaceId: currentWorkspace.id,
      agentExecutor: createAgentExecutor(),
    };

    for (let i = 0; i < relevantTests.length; i++) {
      const testCase = relevantTests[i];
      
      setState(prev => ({
        ...prev,
        currentTest: testCase.id,
        progress: { ...prev.progress, completed: i },
      }));

      try {
        const result = await executeTestCase(testCase, context);
        results.push(result);
      } catch (error) {
        console.error(`Test ${testCase.id} failed:`, error);
      }

      if (suite.config.stopOnFirstFailure && results[results.length - 1]?.verdict.status === 'fail') {
        break;
      }
    }

    setState(prev => ({
      ...prev,
      isRunning: false,
      currentTest: null,
      results: [...prev.results, ...results],
      progress: { completed: results.length, total: relevantTests.length, currentRun: 0, totalRuns: 0 },
    }));

    const passed = results.filter(r => r.verdict.status === 'pass').length;
    toast({
      title: 'Test Suite Complete',
      description: `${passed}/${results.length} tests passed`,
      variant: passed === results.length ? 'default' : 'destructive',
    });

    return results;
  }, [currentWorkspace?.id, createAgentExecutor, toast]);

  // Run behavioral tests for an agent type
  const runBehavioralTests = useCallback(async (
    agentType: string,
    sampleInputs: Record<string, unknown>[]
  ): Promise<TestRun[]> => {
    const contract = AGENT_CONTRACTS[`${agentType}_agent`];
    if (!contract) {
      toast({
        title: 'Error',
        description: `No behavioral contract found for ${agentType}`,
        variant: 'destructive',
      });
      return [];
    }

    // Generate test cases from contract
    const testCases: AgentTestCase[] = [];
    for (let i = 0; i < sampleInputs.length; i++) {
      testCases.push({
        id: `behavioral_${agentType}_${i}`,
        name: `Behavioral Test ${i + 1}`,
        description: `Tests behavioral contract for ${agentType}`,
        agentType,
        category: 'behavioral',
        severity: 'high',
        input: {
          entityType: agentType,
          entityData: sampleInputs[i],
        },
        expectations: [
          { type: 'output_exists', operator: 'equals', value: true },
          { type: 'confidence_level', operator: 'greater_than', value: 0.3 },
          { type: 'recommendation_valid', operator: 'equals', value: true },
        ],
        config: {
          runs: 5,
          timeoutMs: 30000,
          retryOnFailure: false,
        },
        tags: ['behavioral', agentType],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    const suite: TestSuite = {
      id: `behavioral_suite_${agentType}`,
      name: `Behavioral Tests: ${agentType}`,
      description: `Behavioral contract tests for ${agentType} agent`,
      workspaceId: currentWorkspace?.id || '',
      testCaseIds: testCases.map(tc => tc.id),
      config: {
        parallelExecution: false,
        stopOnFirstFailure: false,
        maxConcurrentTests: 1,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return runTestSuite(suite, testCases);
  }, [currentWorkspace?.id, runTestSuite, toast]);

  // Run adversarial tests for an agent type
  const runAdversarialTests = useCallback(async (
    agentType: string,
    sampleInputs: Record<string, unknown>[]
  ): Promise<TestRun[]> => {
    const testCases = generateAdversarialTests(agentType, sampleInputs);

    const suite: TestSuite = {
      id: `adversarial_suite_${agentType}`,
      name: `Adversarial Tests: ${agentType}`,
      description: `Adversarial robustness tests for ${agentType} agent`,
      workspaceId: currentWorkspace?.id || '',
      testCaseIds: testCases.map(tc => tc.id),
      config: {
        parallelExecution: false,
        stopOnFirstFailure: false,
        maxConcurrentTests: 1,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const results = await runTestSuite(suite, testCases);

    // Calculate robustness score
    const robustnessResults = results.map(r => ({
      attackType: (testCases.find(tc => tc.id === r.testCaseId) as any)?.attackType,
      passed: r.verdict.status === 'pass',
    })).filter(r => r.attackType);

    const robustnessScore = calculateRobustnessScore(robustnessResults);
    setState(prev => ({ ...prev, robustnessScore }));

    return results;
  }, [currentWorkspace?.id, runTestSuite]);

  // Calculate reliability metrics
  const calculateMetrics = useCallback(async (
    agentType: string,
    daysBack: number = 7
  ): Promise<ReliabilityMetrics | null> => {
    if (!currentWorkspace?.id) return null;

    const periodEnd = new Date();
    const periodStart = new Date(periodEnd.getTime() - daysBack * 24 * 60 * 60 * 1000);

    // For now, use test results from state
    // In production, this would fetch from database
    const metrics = calculateReliabilityMetrics(
      agentType,
      currentWorkspace.id,
      { testRuns: state.results.filter(r => r.testCaseId.includes(agentType)) },
      periodStart,
      periodEnd
    );

    return metrics;
  }, [currentWorkspace?.id, state.results]);

  // Get health score
  const getHealthScore = useCallback(async (agentType: string): Promise<HealthScore | null> => {
    const metrics = await calculateMetrics(agentType);
    if (!metrics) return null;

    const healthScore = calculateHealthScore(metrics);
    setState(prev => ({ ...prev, healthScore }));
    
    return healthScore;
  }, [calculateMetrics]);

  // Get recent results
  const getRecentResults = useCallback(async (
    agentType: string,
    limit: number = 10
  ): Promise<TestRun[]> => {
    return state.results
      .filter(r => r.testCaseId.includes(agentType))
      .slice(-limit);
  }, [state.results]);

  // Clear results
  const clearResults = useCallback(() => {
    setState(prev => ({
      ...prev,
      results: [],
      healthScore: null,
      robustnessScore: null,
    }));
  }, []);

  // Validate agent contract
  const validateAgentContract = useCallback((
    agentType: string,
    input: Record<string, unknown>,
    output: Record<string, unknown>
  ) => {
    const contract = AGENT_CONTRACTS[`${agentType}_agent`];
    if (!contract) {
      throw new Error(`No contract found for ${agentType}`);
    }
    return validateContract(contract, input, output);
  }, []);

  return {
    state,
    runTest,
    runTestSuite,
    runBehavioralTests,
    runAdversarialTests,
    calculateMetrics,
    getHealthScore,
    getRecentResults,
    clearResults,
    validateAgentContract,
  };
}

export default useAgentEvaluation;
