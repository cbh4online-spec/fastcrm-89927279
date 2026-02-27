import {
  LayoutDashboard,
  Box,
  Inbox,
  Sparkles,
  Zap,
  Brain,
  TrendingUp,
  BarChart3,
  Layers,
  Settings,
  FileText,
} from "lucide-react";

export const NAV_V2_ITEMS = [
  { name: "Home", href: "/dashboard", icon: LayoutDashboard, end: true },
  { name: "Objects", href: "/objects", icon: Box, featureFlag: "objects" },
  { name: "Inbox", href: "/dashboard/inbox", icon: Inbox },
  { name: "Ask", href: "/dashboard/ask", icon: Sparkles },
  { name: "Automations", href: "/dashboard/automations", icon: Zap },
  { name: "Intelligence", href: "/dashboard/intelligence", icon: Brain, featureFlag: "intelligence" },
  { name: "Revenue", href: "/dashboard/revenue", icon: TrendingUp },
  { name: "Notas Encomenda", href: "/dashboard/order-notes", icon: FileText },
  { name: "Reports", href: "/dashboard/reports", icon: BarChart3 },
  { name: "Marketplace", href: "/dashboard/marketplace", icon: Layers, featureFlag: "marketplace" },
  { name: "Settings", href: "/settings", icon: Settings },
] as const;
