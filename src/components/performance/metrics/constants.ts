import { BarChart3, TrendingUp, Target, Clock, Zap } from "lucide-react";
import { MetricType, MetricFormula, MetricPeriod, AlertChannel } from "@/hooks/usePipelineMetrics";

export const METRIC_TYPES: { value: MetricType; label: string; icon: typeof BarChart3 }[] = [
  { value: "volume", label: "Volume", icon: BarChart3 },
  { value: "value", label: "Valor", icon: TrendingUp },
  { value: "conversion", label: "Conversão", icon: Target },
  { value: "time", label: "Tempo", icon: Clock },
  { value: "quality", label: "Qualidade", icon: Zap },
  { value: "custom", label: "Customizada", icon: BarChart3 },
];

export const FORMULAS: { value: MetricFormula; label: string; hint: string }[] = [
  { value: "count", label: "Contagem", hint: "Conta o número de registos" },
  { value: "sum", label: "Soma", hint: "Soma o valor de um campo" },
  { value: "avg", label: "Média", hint: "Média do valor de um campo" },
  { value: "percentage", label: "Percentagem", hint: "% de registos com valor > 0" },
  { value: "duration", label: "Duração", hint: "Média de duração em dias" },
  { value: "event_count", label: "Eventos", hint: "Conta eventos do Kernel" },
];

export const SOURCE_TABLES = [
  { value: "leads", label: "Leads" },
  { value: "opportunities", label: "Negócios" },
  { value: "contacts", label: "Contactos" },
  { value: "companies", label: "Empresas" },
  { value: "tasks", label: "Tarefas" },
  { value: "messages", label: "Mensagens" },
  { value: "kernel_events", label: "Eventos Kernel" },
  { value: "activity_logs", label: "Atividades" },
];

export const PERIODS: { value: MetricPeriod; label: string }[] = [
  { value: "daily", label: "Diário" },
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensal" },
  { value: "quarterly", label: "Trimestral" },
  { value: "annual", label: "Anual" },
];

export const ALERT_CHANNELS: { value: AlertChannel; label: string }[] = [
  { value: "in_app", label: "In-App" },
  { value: "email", label: "Email" },
  { value: "webhook", label: "Webhook" },
];

export const ALERT_CONDITIONS = [
  { value: "below_target", label: "Abaixo da meta" },
  { value: "above_target", label: "Acima da meta" },
  { value: "sla_breach", label: "Violação de SLA" },
  { value: "trend_down", label: "Tendência negativa" },
];

export const LEAD_STATUSES = [
  { value: "new", label: "Novo" },
  { value: "contacted", label: "Contactado" },
  { value: "qualified", label: "Qualificado" },
  { value: "proposal", label: "Proposta" },
  { value: "won", label: "Ganho" },
  { value: "lost", label: "Perdido" },
];

export const TYPE_COLORS: Record<MetricType, string> = {
  volume: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  value: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  conversion: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  time: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  quality: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  custom: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",
};
