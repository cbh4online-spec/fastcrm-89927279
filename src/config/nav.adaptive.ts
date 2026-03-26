import { LucideIcon } from "lucide-react";
import {
  LayoutDashboard, TrendingUp, Target, Users, Calendar, Trophy,
  BarChart3, Brain, Zap, Settings, Inbox, FileText, Building2,
  Presentation, Receipt, Package, Megaphone, GitBranch, Search,
  Gauge, LineChart, PieChart, Bell, Briefcase, DollarSign,
  UserCheck, Award, Clock, CheckSquare, Eye, Phone,
} from "lucide-react";
import type { SalesFunction } from "@/data/adaptiveDashboardMock";

export interface AdaptiveNavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  badgeKey?: string;
  end?: boolean;
}

export interface AdaptiveNavSection {
  label: string;
  icon: LucideIcon;
  collapsible?: boolean;
  items: AdaptiveNavItem[];
  minAge?: number; // only show if user age >= this
  maxAge?: number; // only show if user age <= this
}

export interface QuickAction {
  label: string;
  icon: LucideIcon;
  href: string;
  color: string;
}

// ── VENDEDOR / SDR ──
const vendedorSections: AdaptiveNavSection[] = [
  {
    label: "Principal",
    icon: LayoutDashboard,
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, end: true },
    ],
  },
  {
    label: "Minhas Vendas",
    icon: TrendingUp,
    collapsible: true,
    items: [
      { name: "Pipeline", href: "/dashboard/opportunities", icon: TrendingUp },
      { name: "Metas", href: "/dashboard/performance/goals", icon: Target },
      { name: "Histórico", href: "/dashboard/reports", icon: BarChart3 },
    ],
  },
  {
    label: "Atividades",
    icon: Clock,
    collapsible: true,
    items: [
      { name: "Hoje", href: "/dashboard/scheduling", icon: Calendar, badgeKey: "activities_today" },
      { name: "Semana", href: "/dashboard/scheduling?view=week", icon: Calendar },
      { name: "Follow-ups", href: "/dashboard/scheduling?view=followups", icon: Phone },
    ],
  },
  {
    label: "Leads",
    icon: Users,
    collapsible: true,
    items: [
      { name: "Novos", href: "/dashboard/leads?status=new", icon: Users, badgeKey: "new_leads" },
      { name: "Prospeção", href: "/dashboard/prospecting", icon: Search },
      { name: "Qualificados", href: "/dashboard/leads?status=qualified", icon: UserCheck },
    ],
  },
  {
    label: "Reuniões",
    icon: Calendar,
    collapsible: true,
    items: [
      { name: "Próximas", href: "/dashboard/scheduling?view=upcoming", icon: Calendar },
      { name: "Agendar", href: "/dashboard/scheduling?action=new", icon: Calendar },
    ],
  },
  {
    label: "Leaderboard",
    icon: Trophy,
    maxAge: 39,
    items: [
      { name: "Ranking", href: "/dashboard/performance/leaderboard", icon: Trophy },
      { name: "Desafios", href: "/dashboard/performance/challenges", icon: Zap },
    ],
  },
];

// ── GESTOR DE VENDAS ──
const gestorSections: AdaptiveNavSection[] = [
  {
    label: "Principal",
    icon: LayoutDashboard,
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, end: true },
      { name: "Revenue Control", href: "/dashboard/revenue-flight-control", icon: Gauge },
    ],
  },
  {
    label: "Vendas",
    icon: TrendingUp,
    collapsible: true,
    items: [
      { name: "Visão Geral", href: "/dashboard/reports", icon: BarChart3 },
      { name: "Metas", href: "/dashboard/performance/goals", icon: Target },
      { name: "Pipeline Equipa", href: "/dashboard/opportunities", icon: TrendingUp },
      { name: "Histórico", href: "/dashboard/reports/goals", icon: FileText },
    ],
  },
  {
    label: "Equipa",
    icon: Users,
    collapsible: true,
    items: [
      { name: "Performance", href: "/dashboard/performance", icon: BarChart3 },
      { name: "Comparações", href: "/dashboard/performance/leaderboard", icon: Trophy },
      { name: "Coaching", href: "/dashboard/strategy", icon: Brain },
    ],
  },
  {
    label: "Analytics",
    icon: BarChart3,
    collapsible: true,
    items: [
      { name: "Relatórios", href: "/dashboard/kpis", icon: Gauge },
      { name: "Tendências", href: "/dashboard/reports/forecasts", icon: LineChart },
      { name: "Benchmarking", href: "/dashboard/reports/consumption", icon: PieChart },
    ],
  },
  {
    label: "Leads & Pipeline",
    icon: GitBranch,
    collapsible: true,
    items: [
      { name: "Equipa", href: "/dashboard/leads", icon: Users, badgeKey: "new_leads" },
      { name: "Distribuição", href: "/dashboard/leads?view=distribution", icon: GitBranch },
      { name: "Conversão", href: "/dashboard/lifecycle", icon: TrendingUp },
    ],
  },
  {
    label: "Atividades",
    icon: Calendar,
    collapsible: true,
    items: [
      { name: "Calendário", href: "/dashboard/scheduling", icon: Calendar },
      { name: "Reuniões", href: "/dashboard/scheduling?view=meetings", icon: Calendar },
      { name: "Follow-ups", href: "/dashboard/scheduling?view=followups", icon: Phone },
    ],
  },
  {
    label: "Configurações",
    icon: Settings,
    collapsible: true,
    items: [
      { name: "Metas", href: "/dashboard/performance/settings", icon: Target },
      { name: "Alertas", href: "/dashboard/context-os", icon: Bell },
      { name: "Integrações", href: "/settings/integrations", icon: Settings },
    ],
  },
];

// ── DIRETOR COMERCIAL ──
const diretorSections: AdaptiveNavSection[] = [
  {
    label: "Principal",
    icon: LayoutDashboard,
    items: [
      { name: "Dashboard Executivo", href: "/dashboard", icon: LayoutDashboard, end: true },
      { name: "Revenue Control", href: "/dashboard/revenue-flight-control", icon: Gauge },
    ],
  },
  {
    label: "Estratégia",
    icon: Brain,
    collapsible: true,
    items: [
      { name: "KPIs", href: "/dashboard/kpis", icon: Gauge },
      { name: "OKRs", href: "/dashboard/performance/goals", icon: Target },
      { name: "Previsões", href: "/dashboard/reports/forecasts", icon: LineChart },
    ],
  },
  {
    label: "Revenue",
    icon: DollarSign,
    collapsible: true,
    items: [
      { name: "Por Segmento", href: "/dashboard/reports", icon: PieChart },
      { name: "Por Região", href: "/dashboard/reports/goals", icon: BarChart3 },
      { name: "Por Produto", href: "/dashboard/reports/consumption", icon: Package },
    ],
  },
  {
    label: "Analytics Avançado",
    icon: BarChart3,
    collapsible: true,
    items: [
      { name: "Mercado", href: "/dashboard/competitors", icon: Eye },
      { name: "Competição", href: "/dashboard/account-brief", icon: Briefcase },
    ],
  },
  {
    label: "Performance",
    icon: Trophy,
    collapsible: true,
    items: [
      { name: "Equipas", href: "/dashboard/performance", icon: Users },
      { name: "Campanhas", href: "/dashboard/reports", icon: Megaphone },
    ],
  },
  {
    label: "Forecasting",
    icon: LineChart,
    collapsible: true,
    items: [
      { name: "Projeções", href: "/dashboard/reports/forecasts", icon: LineChart },
      { name: "Cenários", href: "/dashboard/strategy", icon: Brain },
    ],
  },
];

// ── CEO / FOUNDER ──
const ceoSections: AdaptiveNavSection[] = [
  {
    label: "Principal",
    icon: LayoutDashboard,
    items: [
      { name: "Dashboard Executivo", href: "/dashboard", icon: LayoutDashboard, end: true },
      { name: "Revenue Control", href: "/dashboard/revenue-flight-control", icon: Gauge },
    ],
  },
  {
    label: "Saúde do Negócio",
    icon: Gauge,
    items: [
      { name: "Visão Geral", href: "/dashboard/kpis", icon: Gauge },
      { name: "Context OS", href: "/dashboard/context-os", icon: Brain },
    ],
  },
  {
    label: "Financeiro",
    icon: DollarSign,
    items: [
      { name: "Revenue", href: "/dashboard/reports", icon: DollarSign },
      { name: "Faturas", href: "/dashboard/invoices", icon: Receipt },
    ],
  },
  {
    label: "Vendas",
    icon: TrendingUp,
    items: [
      { name: "Pipeline", href: "/dashboard/opportunities", icon: TrendingUp },
      { name: "Previsões", href: "/dashboard/reports/forecasts", icon: LineChart },
    ],
  },
  {
    label: "Equipa",
    icon: Users,
    items: [
      { name: "Performance", href: "/dashboard/performance", icon: BarChart3 },
      { name: "Leaderboard", href: "/dashboard/performance/leaderboard", icon: Trophy },
    ],
  },
  {
    label: "Decisões Pendentes",
    icon: CheckSquare,
    items: [
      { name: "Pendentes", href: "/dashboard/strategy", icon: Bell, badgeKey: "pending_decisions" },
      { name: "Propostas", href: "/dashboard/proposals", icon: Presentation },
    ],
  },
  {
    label: "Relatórios",
    icon: FileText,
    items: [
      { name: "Relatórios", href: "/dashboard/reports", icon: BarChart3 },
      { name: "Exportar", href: "/dashboard/reports/goals", icon: FileText },
    ],
  },
];

// ── Quick Actions per role ──
const vendedorQuickActions: QuickAction[] = [
  { label: "Novo Lead", icon: Users, href: "/dashboard/leads?action=new", color: "text-emerald-500" },
  { label: "Nova Atividade", icon: Calendar, href: "/dashboard/scheduling?action=new", color: "text-blue-500" },
  { label: "Proposta", icon: Presentation, href: "/dashboard/proposals?action=new", color: "text-amber-500" },
];

const gestorQuickActions: QuickAction[] = [
  { label: "Relatório", icon: BarChart3, href: "/dashboard/reports", color: "text-sky-500" },
  { label: "Pipeline", icon: TrendingUp, href: "/dashboard/opportunities", color: "text-emerald-500" },
  { label: "Equipa", icon: Users, href: "/dashboard/performance", color: "text-violet-500" },
];

const diretorQuickActions: QuickAction[] = [
  { label: "KPIs", icon: Gauge, href: "/dashboard/kpis", color: "text-sky-500" },
  { label: "Forecast", icon: LineChart, href: "/dashboard/reports/forecasts", color: "text-amber-500" },
  { label: "Estratégia", icon: Brain, href: "/dashboard/strategy", color: "text-violet-500" },
];

const ceoQuickActions: QuickAction[] = [
  { label: "Saúde", icon: Gauge, href: "/dashboard/kpis", color: "text-emerald-500" },
  { label: "Decisões", icon: Bell, href: "/dashboard/strategy", color: "text-red-500" },
  { label: "Revenue", icon: DollarSign, href: "/dashboard/reports", color: "text-amber-500" },
];

// ── Exports ──

export function getAdaptiveSections(role: SalesFunction): AdaptiveNavSection[] {
  switch (role) {
    case "vendedor": return vendedorSections;
    case "gestor": return gestorSections;
    case "diretor": return diretorSections;
    case "ceo": return ceoSections;
    default: return gestorSections;
  }
}

export function getQuickActions(role: SalesFunction): QuickAction[] {
  switch (role) {
    case "vendedor": return vendedorQuickActions;
    case "gestor": return gestorQuickActions;
    case "diretor": return diretorQuickActions;
    case "ceo": return ceoQuickActions;
    default: return gestorQuickActions;
  }
}

// Mock gamification data
export interface GamificationData {
  level: number;
  levelName: string;
  xp: number;
  xpToNext: number;
  streak: number;
  position: number;
  totalUsers: number;
}

export const mockGamification: GamificationData = {
  level: 7,
  levelName: "Sales Pro",
  xp: 2450,
  xpToNext: 3000,
  streak: 12,
  position: 3,
  totalUsers: 24,
};
