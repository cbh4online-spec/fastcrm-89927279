// Mock data for the Adaptive Sales Dashboard

export type SalesFunction = 'vendedor' | 'gestor' | 'diretor' | 'ceo';
export type AgeGroup = 'young' | 'standard' | 'senior';
export type AlertLevel = 'critical' | 'attention' | 'opportunity';
export type GoalStatus = 'on_track' | 'at_risk' | 'behind' | 'exceeded';

export interface AdaptiveMetric {
  id: string;
  label: string;
  value: number;
  format: 'currency' | 'number' | 'percentage' | 'time';
  changeWeek: number;
  changeMonth: number;
  projection: number;
  projectionLabel: string;
  icon: string;
}

export interface AdaptiveAlert {
  id: string;
  level: AlertLevel;
  title: string;
  description: string;
  actionLabel?: string;
  actionRoute?: string;
  metric?: string;
  timestamp: string;
}

export interface AdaptiveGoal {
  id: string;
  label: string;
  current: number;
  target: number;
  format: 'currency' | 'number' | 'percentage';
  status: GoalStatus;
  projectedEnd: number;
  requiredPace: number;
  daysRemaining: number;
  periodLabel: string;
}

export interface BenchmarkAxis {
  label: string;
  individual: number;
  team: number;
  topPerformer: number;
  industry: number;
}

export interface WeeklyComparison {
  label: string;
  current: number;
  previous: number;
  format: 'currency' | 'number' | 'percentage';
}

export interface PriorityAction {
  id: string;
  label: string;
  type: 'follow_up' | 'close' | 'rescue' | 'upsell';
  entityName: string;
  value?: number;
  dueLabel: string;
  priority: 'high' | 'medium' | 'low';
}

// ---- MOCK DATA ----

export const mockMetrics: AdaptiveMetric[] = [
  {
    id: 'revenue',
    label: 'Vendas do Mês',
    value: 47500,
    format: 'currency',
    changeWeek: 12.5,
    changeMonth: 8.3,
    projection: 62000,
    projectionLabel: 'Projeção mensal',
    icon: 'TrendingUp',
  },
  {
    id: 'leads',
    label: 'Leads Novos',
    value: 34,
    format: 'number',
    changeWeek: -5.2,
    changeMonth: 15.1,
    projection: 48,
    projectionLabel: 'Projeção mensal',
    icon: 'Users',
  },
  {
    id: 'pipeline',
    label: 'Pipeline Ativo',
    value: 185000,
    format: 'currency',
    changeWeek: 3.8,
    changeMonth: -2.1,
    projection: 195000,
    projectionLabel: 'Valor projetado',
    icon: 'BarChart3',
  },
  {
    id: 'meetings',
    label: 'Reuniões',
    value: 12,
    format: 'number',
    changeWeek: 20.0,
    changeMonth: 5.5,
    projection: 18,
    projectionLabel: 'Projeção mensal',
    icon: 'Calendar',
  },
];

export const mockAlerts: AdaptiveAlert[] = [
  {
    id: 'alert-1',
    level: 'critical',
    title: '3 oportunidades sem follow-up há +7 dias',
    description: 'Total de €42.000 em risco. Agende contacto urgente.',
    actionLabel: 'Ver oportunidades',
    actionRoute: '/dashboard/opportunities',
    metric: '€42.000',
    timestamp: new Date().toISOString(),
  },
  {
    id: 'alert-2',
    level: 'attention',
    title: 'Taxa de conversão caiu 15% esta semana',
    description: 'De 28% para 23.8%. Reveja a qualificação de leads.',
    actionLabel: 'Analisar funil',
    actionRoute: '/dashboard/leads',
    timestamp: new Date().toISOString(),
  },
  {
    id: 'alert-3',
    level: 'opportunity',
    title: '5 leads quentes sem proposta enviada',
    description: 'Leads com score >80 aguardam proposta. Potencial: €28.500.',
    actionLabel: 'Criar propostas',
    actionRoute: '/dashboard/proposals',
    metric: '€28.500',
    timestamp: new Date().toISOString(),
  },
];

export const mockGoals: AdaptiveGoal[] = [
  {
    id: 'goal-revenue',
    label: 'Receita Trimestral',
    current: 142500,
    target: 200000,
    format: 'currency',
    status: 'at_risk',
    projectedEnd: 178000,
    requiredPace: 57500,
    daysRemaining: 32,
    periodLabel: 'Q1 2026',
  },
  {
    id: 'goal-deals',
    label: 'Negócios Fechados',
    current: 18,
    target: 25,
    format: 'number',
    status: 'on_track',
    projectedEnd: 26,
    requiredPace: 7,
    daysRemaining: 32,
    periodLabel: 'Q1 2026',
  },
  {
    id: 'goal-conversion',
    label: 'Taxa de Conversão',
    current: 23.8,
    target: 30,
    format: 'percentage',
    status: 'behind',
    projectedEnd: 25,
    requiredPace: 35,
    daysRemaining: 32,
    periodLabel: 'Q1 2026',
  },
];

export const mockBenchmarks: BenchmarkAxis[] = [
  { label: 'Receita', individual: 47500, team: 42000, topPerformer: 68000, industry: 45000 },
  { label: 'Conversão', individual: 23.8, team: 21.5, topPerformer: 32.0, industry: 22.0 },
  { label: 'Ticket Médio', individual: 2638, team: 2100, topPerformer: 3200, industry: 2400 },
  { label: 'Tempo Fecho', individual: 14, team: 18, topPerformer: 10, industry: 16 },
];

export const mockWeeklyComparison: WeeklyComparison[] = [
  { label: 'Vendas', current: 12500, previous: 11100, format: 'currency' },
  { label: 'Leads', current: 9, previous: 11, format: 'number' },
  { label: 'Propostas', current: 6, previous: 4, format: 'number' },
  { label: 'Reuniões', current: 5, previous: 3, format: 'number' },
];

export const mockPriorityActions: PriorityAction[] = [
  { id: 'act-1', label: 'Follow-up urgente', type: 'follow_up', entityName: 'TechSolutions Lda', value: 18000, dueLabel: 'Hoje', priority: 'high' },
  { id: 'act-2', label: 'Fechar negócio', type: 'close', entityName: 'MediaGroup SA', value: 24000, dueLabel: 'Amanhã', priority: 'high' },
  { id: 'act-3', label: 'Resgatar oportunidade', type: 'rescue', entityName: 'StartUp ABC', value: 8500, dueLabel: 'Esta semana', priority: 'medium' },
  { id: 'act-4', label: 'Proposta de upsell', type: 'upsell', entityName: 'RetailMax', value: 12000, dueLabel: 'Esta semana', priority: 'medium' },
  { id: 'act-5', label: 'Follow-up proposta', type: 'follow_up', entityName: 'ConsultPro', value: 6500, dueLabel: 'Sexta', priority: 'low' },
];
