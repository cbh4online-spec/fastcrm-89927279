/**
 * Agent Evaluation Panel
 * 
 * UI component for running and viewing agent evaluations.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Play,
  Square,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Activity,
  Shield,
  FileCheck,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useAgentEvaluation } from '@/hooks/useAgentEvaluation';
import type { TestRun, TestVerdict } from '@/types/agentEvaluation';

// ============================================
// Main Component
// ============================================

export function AgentEvaluationPanel() {
  const [selectedAgent, setSelectedAgent] = useState<string>('lead');
  const {
    state,
    runBehavioralTests,
    runAdversarialTests,
    getHealthScore,
    clearResults,
  } = useAgentEvaluation();

  const agentTypes = [
    { value: 'lead', label: 'Lead Agent' },
    { value: 'opportunity', label: 'Opportunity Agent' },
    { value: 'client', label: 'Client Agent' },
  ];

  // Sample inputs for testing
  const sampleInputs = [
    {
      id: 'sample-1',
      name: 'John Smith',
      email: 'john@example.com',
      phone: '+1-555-0100',
      company: 'Acme Corp',
      value: 50000,
      status: 'new',
      tags: ['enterprise', 'inbound'],
      notes: 'Interested in premium plan',
    },
    {
      id: 'sample-2',
      name: 'Jane Doe',
      email: 'jane@techstartup.io',
      company: 'TechStartup',
      value: 15000,
      status: 'contacted',
      tags: ['startup', 'referral'],
    },
  ];

  const handleRunBehavioral = async () => {
    await runBehavioralTests(selectedAgent, sampleInputs);
  };

  const handleRunAdversarial = async () => {
    await runAdversarialTests(selectedAgent, sampleInputs);
  };

  const handleHealthCheck = async () => {
    await getHealthScore(selectedAgent);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Agent Evaluation</h2>
          <p className="text-muted-foreground">
            Test and benchmark AI agent behavior
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedAgent} onValueChange={setSelectedAgent}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select agent" />
            </SelectTrigger>
            <SelectContent>
              {agentTypes.map(agent => (
                <SelectItem key={agent.value} value={agent.value}>
                  {agent.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={clearResults}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Clear Results
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      {state.isRunning && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">
                    Running: {state.currentTest}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {state.progress.completed}/{state.progress.total} tests
                  </span>
                </div>
                <Progress 
                  value={(state.progress.completed / Math.max(1, state.progress.total)) * 100} 
                />
                <div className="text-xs text-muted-foreground mt-1">
                  Run {state.progress.currentRun}/{state.progress.totalRuns}
                </div>
              </div>
              <Button variant="destructive" size="sm" disabled>
                <Square className="w-4 h-4 mr-2" />
                Stop
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-blue-500" />
              Behavioral Tests
            </CardTitle>
            <CardDescription>
              Test agent behavior contracts and invariants
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleRunBehavioral}
              disabled={state.isRunning}
              className="w-full"
            >
              <Play className="w-4 h-4 mr-2" />
              Run Behavioral Tests
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="w-5 h-5 text-red-500" />
              Adversarial Tests
            </CardTitle>
            <CardDescription>
              Test agent robustness against attacks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleRunAdversarial}
              disabled={state.isRunning}
              variant="destructive"
              className="w-full"
            >
              <Play className="w-4 h-4 mr-2" />
              Run Adversarial Tests
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-500" />
              Health Check
            </CardTitle>
            <CardDescription>
              Calculate agent health score
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleHealthCheck}
              disabled={state.isRunning}
              variant="outline"
              className="w-full"
            >
              <Activity className="w-4 h-4 mr-2" />
              Check Health
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Health Score */}
      {state.healthScore && (
        <HealthScoreCard healthScore={state.healthScore} />
      )}

      {/* Robustness Score */}
      {state.robustnessScore && (
        <RobustnessScoreCard robustnessScore={state.robustnessScore} />
      )}

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle>Test Results</CardTitle>
          <CardDescription>
            {state.results.length} test runs completed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="passed">
                Passed ({state.results.filter(r => r.verdict.status === 'pass').length})
              </TabsTrigger>
              <TabsTrigger value="failed">
                Failed ({state.results.filter(r => r.verdict.status === 'fail').length})
              </TabsTrigger>
              <TabsTrigger value="flaky">
                Flaky ({state.results.filter(r => r.verdict.status === 'flaky').length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <TestResultsList results={state.results} />
            </TabsContent>
            <TabsContent value="passed">
              <TestResultsList results={state.results.filter(r => r.verdict.status === 'pass')} />
            </TabsContent>
            <TabsContent value="failed">
              <TestResultsList results={state.results.filter(r => r.verdict.status === 'fail')} />
            </TabsContent>
            <TabsContent value="flaky">
              <TestResultsList results={state.results.filter(r => r.verdict.status === 'flaky')} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// Sub-components
// ============================================

function HealthScoreCard({ healthScore }: { healthScore: NonNullable<ReturnType<typeof useAgentEvaluation>['state']['healthScore']> }) {
  const categoryColors = {
    healthy: 'text-green-500',
    degraded: 'text-yellow-500',
    critical: 'text-red-500',
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Health Score
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Overall Score */}
          <div className="flex flex-col items-center justify-center p-6 bg-muted rounded-lg">
            <div className={`text-4xl font-bold ${categoryColors[healthScore.category]}`}>
              {healthScore.overall.toFixed(0)}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Overall Score
            </div>
            <Badge 
              variant={healthScore.category === 'healthy' ? 'default' : 'destructive'}
              className="mt-2"
            >
              {healthScore.category.toUpperCase()}
            </Badge>
          </div>

          {/* Components */}
          <div className="col-span-2">
            <div className="grid grid-cols-2 gap-2">
              {healthScore.components.map(comp => (
                <div key={comp.name} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <span className="text-sm">{comp.name}</span>
                  <div className="flex items-center gap-2">
                    <Progress value={comp.score} className="w-20 h-2" />
                    <span className="text-sm font-medium w-10 text-right">
                      {comp.score.toFixed(0)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Issues */}
            {healthScore.issues.length > 0 && (
              <div className="mt-4">
                <div className="text-sm font-medium mb-2">Issues:</div>
                <div className="flex flex-wrap gap-2">
                  {healthScore.issues.map((issue, i) => (
                    <Badge key={i} variant="outline" className="text-yellow-600">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      {issue}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RobustnessScoreCard({ robustnessScore }: { robustnessScore: NonNullable<ReturnType<typeof useAgentEvaluation>['state']['robustnessScore']> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Robustness Score
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Overall Score */}
          <div className="flex flex-col items-center justify-center p-6 bg-muted rounded-lg">
            <div className={`text-4xl font-bold ${
              robustnessScore.overall >= 80 ? 'text-green-500' :
              robustnessScore.overall >= 50 ? 'text-yellow-500' : 'text-red-500'
            }`}>
              {robustnessScore.overall.toFixed(0)}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Robustness Score
            </div>
          </div>

          {/* By Attack Type */}
          <div className="col-span-2">
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(robustnessScore.byAttackType).map(([type, score]) => (
                <div key={type} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <span className="text-sm">{type.replace(/_/g, ' ')}</span>
                  <div className="flex items-center gap-2">
                    <Progress 
                      value={score} 
                      className={`w-20 h-2 ${score < 50 ? '[&>div]:bg-red-500' : ''}`}
                    />
                    <span className="text-sm font-medium w-10 text-right">
                      {score.toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Weaknesses */}
            {robustnessScore.weaknesses.length > 0 && (
              <div className="mt-4">
                <div className="text-sm font-medium mb-2">Weaknesses:</div>
                <div className="space-y-1">
                  {robustnessScore.weaknesses.map((weakness, i) => (
                    <div key={i} className="text-sm text-red-600 flex items-center gap-1">
                      <XCircle className="w-3 h-3" />
                      {weakness}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {robustnessScore.recommendations.length > 0 && (
              <div className="mt-4">
                <div className="text-sm font-medium mb-2">Recommendations:</div>
                <div className="space-y-1">
                  {robustnessScore.recommendations.map((rec, i) => (
                    <div key={i} className="text-sm text-muted-foreground flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {rec}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TestResultsList({ results }: { results: TestRun[] }) {
  if (results.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        No test results yet. Run some tests to see results here.
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="space-y-3">
        {results.map(result => (
          <TestResultCard key={result.id} result={result} />
        ))}
      </div>
    </ScrollArea>
  );
}

function TestResultCard({ result }: { result: TestRun }) {
  const verdictIcons: Record<TestVerdict['status'], React.ReactNode> = {
    pass: <CheckCircle2 className="w-5 h-5 text-green-500" />,
    fail: <XCircle className="w-5 h-5 text-red-500" />,
    flaky: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
    inconclusive: <Minus className="w-5 h-5 text-gray-500" />,
  };

  const trendIcon = result.statistics.passRate >= 0.9 
    ? <TrendingUp className="w-4 h-4 text-green-500" />
    : result.statistics.passRate <= 0.5
    ? <TrendingDown className="w-4 h-4 text-red-500" />
    : <Minus className="w-4 h-4 text-gray-500" />;

  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {verdictIcons[result.verdict.status]}
          <div>
            <div className="font-medium">{result.testCaseId}</div>
            <div className="text-sm text-muted-foreground">
              {result.verdict.summary}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            {trendIcon}
            <span>{(result.statistics.passRate * 100).toFixed(0)}%</span>
          </div>
          <Badge variant="outline">
            {result.statistics.totalRuns} runs
          </Badge>
          <span className="text-muted-foreground">
            {result.statistics.avgLatencyMs.toFixed(0)}ms avg
          </span>
        </div>
      </div>

      {/* Flaky warning */}
      {result.verdict.isFlaky && (
        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
          <AlertTriangle className="w-4 h-4 inline-block mr-1" />
          This test is flaky (inconsistent results). 
          {result.verdict.flakyExpectations && (
            <span> Flaky expectations: {result.verdict.flakyExpectations.join(', ')}</span>
          )}
        </div>
      )}

      {/* Recommendations */}
      {result.verdict.recommendations && result.verdict.recommendations.length > 0 && (
        <div className="mt-3 text-sm text-muted-foreground">
          <strong>Recommendations:</strong>
          <ul className="list-disc list-inside mt-1">
            {result.verdict.recommendations.map((rec, i) => (
              <li key={i}>{rec}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default AgentEvaluationPanel;
