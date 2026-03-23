export type AnthropicModel = 'claude-sonnet-4-5' | 'claude-haiku-4-5-20251001'

export interface AISettings {
  workspace_id: string
  default_model: string
  max_tokens_default: number
  max_tokens_analysis: number
  max_tokens_generation: number
  max_tokens_agents: number
  monthly_token_budget: number
  current_month_tokens: number
  current_month_cost_usd: number
  budget_reset_date: string
  budget_alert_threshold: number
  budget_alert_sent: boolean
  ai_copilot_enabled: boolean
  ai_inbox_reply_enabled: boolean
  ai_suggestions_enabled: boolean
  ai_employees_enabled: boolean
  ai_agents_enabled: boolean
  ai_sales_coach_enabled: boolean
  ai_imo_enabled: boolean
  temperature_creative: number
  temperature_analytical: number
  temperature_balanced: number
  response_language: string
  created_at: string
  updated_at: string
}

export interface AIUsageLog {
  id: string
  workspace_id: string
  feature: string
  model: string
  provider: string
  tokens_input: number
  tokens_output: number
  tokens_total: number
  cost_usd: number
  request_type?: string
  latency_ms?: number
  was_cached: boolean
  entity_type?: string
  entity_id?: string
  job_id?: string
  was_error: boolean
  error_type?: string
  user_id?: string
  created_at: string
}

export interface AIUsageSummaryRow {
  feature: string
  call_count: number
  tokens_total: number
  cost_usd_total: number
  error_count: number
  avg_latency_ms: number
}

export interface AIDailyTrend {
  day: string
  tokens_total: number
  cost_usd: number
  call_count: number
}

export interface AIUsageDashboardData {
  summary_by_feature: AIUsageSummaryRow[]
  daily_trend: AIDailyTrend[]
  total_tokens: number
  total_cost_usd: number
  total_calls: number
  error_rate: number
  budget_used_percent: number | null
}

export const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-5': { input: 3.0, output: 15.0 },
  'claude-haiku-4-5-20251001': { input: 0.80, output: 4.0 },
  'google/gemini-3-flash-preview': { input: 0.15, output: 0.6 },
  'google/gemini-2.5-flash': { input: 0.15, output: 0.6 },
  'google/gemini-2.5-pro': { input: 1.25, output: 5.0 },
  'openai/gpt-5': { input: 2.5, output: 10.0 },
  'openai/gpt-5-mini': { input: 0.4, output: 1.6 },
}

export function estimateCost(
  model: string,
  tokensInput: number,
  tokensOutput: number
): number {
  const costs = MODEL_COSTS[model] ?? { input: 0.15, output: 0.6 }
  return (tokensInput / 1_000_000) * costs.input + (tokensOutput / 1_000_000) * costs.output
}

// Feature labels for UI
export const AI_FEATURE_LABELS: Record<string, string> = {
  'ai-copilot': 'AI Copilot',
  'ai-inbox-reply': 'Respostas Inbox',
  'ai-inbox-actions': 'Acções Inbox',
  'ai-field-suggestions': 'Sugestões de Campos',
  'ai-auto-tags': 'Auto Tags',
  'ai-automation-suggestions': 'Sugestões de Automação',
  'ai-employee-executor': 'AI Employees',
  'ai-agent-processor': 'AI Agents',
  'ai-opportunity-coach': 'Sales Coach',
  'deal-intelligence': 'Deal Intelligence',
  'ai-pipeline-risk': 'Pipeline Risk',
  'ai-growth-insights': 'IMO AI',
  'generate-proposal-copy': 'Geração de Propostas',
  'ai-proposal-assistant': 'Assistente de Propostas',
  'landing-page-copy': 'Landing Pages',
  'generate-template': 'Geração de Templates',
  'ai-template-copilot': 'Template Copilot',
  'classify-conversation': 'Classificação',
  'conversation-intelligence': 'Inteligência Conversacional',
  'conversation-summary': 'Resumos',
  'contact-insights': 'Insights de Contactos',
  'contact-enrich': 'Enriquecimento',
  'company-insights': 'Insights de Empresas',
  'ai-analyze-lead': 'Análise de Leads',
  'ask-fastcrm': 'Ask FastCRM',
  'strategic-intelligence-brief': 'Brief Estratégico',
  'daily-revenue-brief': 'Revenue Brief',
  'productivity-coach': 'Productivity Coach',
  'knowledge-query': 'Knowledge Base',
  'bio-ai-builder': 'Bio Builder',
  'generate-seo-content': 'SEO Content',
}

export function formatFeatureName(feature: string): string {
  return AI_FEATURE_LABELS[feature] ?? feature
    .replace(/^ai-/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
}

export function formatTokenCount(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`
  return tokens.toString()
}
