import { LucideIcon } from "lucide-react";
import {
  LayoutDashboard, TrendingUp, Target, Users, Calendar,
  BarChart3, Settings, Building2, UserCheck, GitBranch,
  Phone, Gauge, Brain,
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
  minAge?: number;
  maxAge?: number;
}

export interface QuickAction {
  label: string;
  icon: LucideIcon;
  href: string;
  color: string;
}

// ── Core CRM items (shared across all roles) ──
const crmItems: AdaptiveNavItem[] = [
  { name: "Leads", href: "/dashboard/leads", icon: Users, badgeKey: "new_leads" },
  { name: "Contactos", href: "/dashboard/contacts", icon: UserCheck },
  { name: "Empresas", href: "/dashboard/companies", icon: Building2 },
  { name: "Pipeline", href: "/dashboard/opportunities", icon: TrendingUp },
  { name: "Ciclo de Vida", href: "/dashboard/lifecycle", icon: GitBranch },
];

// ── Core sections — universal for ALL roles ──
const coreSections: AdaptiveNavSection[] = [
  {
    label: "Principal",
    icon: LayoutDashboard,
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, end: true },
    ],
  },
  {
    label: "CRM",
    icon: Users,
    collapsible: true,
    items: crmItems,
  },
  {
    label: "Atividades",
    icon: Calendar,
    collapsible: true,
    items: [
      { name: "Calendário", href: "/dashboard/scheduling", icon: Calendar, badgeKey: "activities_today" },
      { name: "Follow-ups", href: "/dashboard/scheduling?view=followups", icon: Phone },
    ],
  },
];

// ── Role-specific extras (only items NOT covered by modules) ──
const roleExtras: Record<SalesFunction, AdaptiveNavSection[]> = {
  vendedor: [
    {
      label: "Performance",
      icon: Target,
      collapsible: true,
      items: [
        { name: "Metas", href: "/dashboard/performance/goals", icon: Target },
        { name: "Histórico", href: "/dashboard/reports", icon: BarChart3 },
      ],
    },
  ],
  gestor: [
    {
      label: "Performance",
      icon: BarChart3,
      collapsible: true,
      items: [
        { name: "Revenue Control", href: "/dashboard/revenue-flight-control", icon: Gauge },
        { name: "Equipa", href: "/dashboard/performance", icon: BarChart3 },
        { name: "KPIs", href: "/dashboard/kpis", icon: Gauge },
        { name: "Coaching", href: "/dashboard/strategy", icon: Brain },
      ],
    },
  ],
  diretor: [
    {
      label: "Estratégia",
      icon: Brain,
      collapsible: true,
      items: [
        { name: "Revenue Control", href: "/dashboard/revenue-flight-control", icon: Gauge },
        { name: "KPIs", href: "/dashboard/kpis", icon: Gauge },
        { name: "Previsões", href: "/dashboard/reports/forecasts", icon: TrendingUp },
        { name: "Equipas", href: "/dashboard/performance", icon: Users },
      ],
    },
  ],
  ceo: [
    {
      label: "Executivo",
      icon: Gauge,
      collapsible: true,
      items: [
        { name: "Revenue Control", href: "/dashboard/revenue-flight-control", icon: Gauge },
        { name: "KPIs", href: "/dashboard/kpis", icon: Gauge },
        { name: "Context OS", href: "/dashboard/context-os", icon: Brain },
        { name: "Performance", href: "/dashboard/performance", icon: BarChart3 },
      ],
    },
  ],
};

// ── Exports ──

export function getAdaptiveSections(role: SalesFunction): AdaptiveNavSection[] {
  return [...coreSections, ...(roleExtras[role] || [])];
}

export function getQuickActions(_role: SalesFunction): QuickAction[] {
  return []; // Quick actions moved to TopBar / Command Palette
}

// Gamification data — kept for dashboard use, removed from sidebar
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
