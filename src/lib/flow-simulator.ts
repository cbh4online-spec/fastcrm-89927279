import { FlowStep, FlowVariable, FlowConditionOperator } from '@/types/conversational-flows';

export type SimStatus = 'idle' | 'waiting_input' | 'completed' | 'handed_off' | 'error';

export interface SimResponse {
  role: 'bot' | 'user' | 'system';
  content: string;
  stepId?: string;
  stepName?: string;
  stepType?: string;
}

export interface SimResult {
  responses: SimResponse[];
  currentStepId: string | null;
  status: SimStatus;
  collectedVars: Record<string, unknown>;
}

export class FlowSimulator {
  private steps: FlowStep[];
  private variables: FlowVariable[];
  private currentStepId: string | null = null;
  private collectedVars: Record<string, unknown> = {};
  private responses: SimResponse[] = [];
  private status: SimStatus = 'idle';
  private pendingVariableId: string | null = null;
  private maxIterations = 50; // safety guard

  constructor(steps: FlowStep[], variables: FlowVariable[]) {
    this.steps = steps;
    this.variables = variables;
  }

  start(): SimResult {
    this.reset();
    const entryStep = this.steps.find(s => s.isEntryPoint);
    if (!entryStep) {
      this.responses.push({ role: 'system', content: '⚠️ Nenhum ponto de entrada definido. Adiciona um step como entry point.' });
      this.status = 'error';
      return this.getResult();
    }
    this.currentStepId = entryStep.id;
    this.processUntilStop();
    return this.getResult();
  }

  sendMessage(msg: string): SimResult {
    if (this.status !== 'waiting_input') return this.getResult();

    this.responses.push({ role: 'user', content: msg });

    // Store variable if pending
    if (this.pendingVariableId) {
      const variable = this.variables.find(v => v.id === this.pendingVariableId);
      if (variable) {
        this.collectedVars[variable.name] = msg;
      }
      this.pendingVariableId = null;
    }

    // Advance to next step
    const currentStep = this.steps.find(s => s.id === this.currentStepId);
    if (currentStep?.nextStepId) {
      this.currentStepId = currentStep.nextStepId;
      this.status = 'idle';
      this.processUntilStop();
    } else {
      this.responses.push({ role: 'system', content: '✅ Flow terminado (sem próximo step).' });
      this.status = 'completed';
      this.currentStepId = null;
    }

    return this.getResult();
  }

  reset(): void {
    this.currentStepId = null;
    this.collectedVars = {};
    this.responses = [];
    this.status = 'idle';
    this.pendingVariableId = null;
  }

  getResult(): SimResult {
    return {
      responses: [...this.responses],
      currentStepId: this.currentStepId,
      status: this.status,
      collectedVars: { ...this.collectedVars }
    };
  }

  private processUntilStop(): void {
    let iterations = 0;
    while (this.currentStepId && this.status !== 'waiting_input' && this.status !== 'completed' && this.status !== 'handed_off' && this.status !== 'error') {
      if (iterations++ > this.maxIterations) {
        this.responses.push({ role: 'system', content: '⚠️ Loop infinito detetado. Verifica as ligações entre steps.' });
        this.status = 'error';
        return;
      }
      this.processStep(this.currentStepId);
    }
  }

  private processStep(stepId: string): void {
    const step = this.steps.find(s => s.id === stepId);
    if (!step) {
      this.responses.push({ role: 'system', content: `⚠️ Step não encontrado: ${stepId}` });
      this.status = 'error';
      return;
    }

    switch (step.stepType) {
      case 'message':
        this.processMessage(step);
        break;
      case 'question':
        this.processQuestion(step);
        break;
      case 'condition':
        this.processCondition(step);
        break;
      case 'action':
        this.processAction(step);
        break;
      case 'goal':
        this.processGoal(step);
        break;
      case 'handoff':
        this.processHandoff(step);
        break;
    }
  }

  private processMessage(step: FlowStep): void {
    const content = step.messageContent || '(mensagem vazia)';
    this.responses.push({
      role: 'bot',
      content: this.interpolateVars(content),
      stepId: step.id,
      stepName: step.name,
      stepType: 'message'
    });
    this.advanceToNext(step);
  }

  private processQuestion(step: FlowStep): void {
    const content = step.messageContent || '(pergunta vazia)';
    this.responses.push({
      role: 'bot',
      content: this.interpolateVars(content),
      stepId: step.id,
      stepName: step.name,
      stepType: 'question'
    });
    if (step.variableId) {
      this.pendingVariableId = step.variableId;
    }
    this.status = 'waiting_input';
  }

  private processCondition(step: FlowStep): void {
    const result = this.evaluateCondition(step);
    this.responses.push({
      role: 'system',
      content: `🔀 Condição "${step.name}": ${result ? 'Verdadeiro' : 'Falso'}`,
      stepId: step.id,
      stepName: step.name,
      stepType: 'condition'
    });

    const nextId = result ? step.conditionTrueStepId : step.conditionFalseStepId;
    if (nextId) {
      this.currentStepId = nextId;
    } else {
      this.responses.push({ role: 'system', content: `⚠️ Sem branch ${result ? 'verdadeiro' : 'falso'} definido.` });
      this.status = 'completed';
      this.currentStepId = null;
    }
  }

  private processAction(step: FlowStep): void {
    this.responses.push({
      role: 'system',
      content: `⚡ Ação simulada: "${step.name}" (${step.actionType || 'sem tipo'})`,
      stepId: step.id,
      stepName: step.name,
      stepType: 'action'
    });
    this.advanceToNext(step);
  }

  private processGoal(step: FlowStep): void {
    this.responses.push({
      role: 'system',
      content: `🎯 Objetivo alcançado: "${step.goalName || step.name}"`,
      stepId: step.id,
      stepName: step.name,
      stepType: 'goal'
    });
    this.status = 'completed';
    this.currentStepId = null;
  }

  private processHandoff(step: FlowStep): void {
    this.responses.push({
      role: 'system',
      content: `👤 Handoff: Conversa transferida para agente humano ("${step.name}")`,
      stepId: step.id,
      stepName: step.name,
      stepType: 'handoff'
    });
    this.status = 'handed_off';
    this.currentStepId = null;
  }

  private advanceToNext(step: FlowStep): void {
    if (step.nextStepId) {
      this.currentStepId = step.nextStepId;
    } else {
      this.status = 'completed';
      this.currentStepId = null;
    }
  }

  private evaluateCondition(step: FlowStep): boolean {
    const fieldName = step.conditionField;
    const operator = step.conditionOperator;
    const expectedValue = step.conditionValue;

    if (!fieldName || !operator) return false;

    const actualValue = String(this.collectedVars[fieldName] ?? '');

    return this.compareValues(actualValue, operator, expectedValue || '');
  }

  private compareValues(actual: string, operator: FlowConditionOperator, expected: string): boolean {
    const actualLower = actual.toLowerCase();
    const expectedLower = expected.toLowerCase();

    switch (operator) {
      case 'equals':
        return actualLower === expectedLower;
      case 'not_equals':
        return actualLower !== expectedLower;
      case 'contains':
        return actualLower.includes(expectedLower);
      case 'not_contains':
        return !actualLower.includes(expectedLower);
      case 'greater_than':
        return parseFloat(actual) > parseFloat(expected);
      case 'less_than':
        return parseFloat(actual) < parseFloat(expected);
      case 'is_empty':
        return actual.trim() === '';
      case 'is_not_empty':
        return actual.trim() !== '';
      case 'matches_intent':
        // In simulation, just do contains match
        return actualLower.includes(expectedLower);
      default:
        return false;
    }
  }

  private interpolateVars(text: string): string {
    return text.replace(/\{\{(\w+)\}\}/g, (_, varName) => {
      return String(this.collectedVars[varName] ?? `{{${varName}}}`);
    });
  }
}
