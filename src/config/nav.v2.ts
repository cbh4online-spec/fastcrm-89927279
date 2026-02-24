import {
  LayoutDashboard,
  Box,
  Inbox,
  Zap,
  Brain,
  BarChart3,
  Layers,
  Settings,
} from "lucide-react";

export const NAV_V2_ITEMS = [
  { name: "Home", href: "/dashboard", icon: LayoutDashboard, end: true },
  { name: "Objects", href: "/objects", icon: Box, featureFlag: "objects" },
  { name: "Inbox", href: "/dashboard/inbox", icon: Inbox },
  { name: "Automations", href: "/dashboard/automations", icon: Zap },
  { name: "Intelligence", href: "/dashboard/intelligence", icon: Brain, featureFlag: "intelligence" },
  { name: "Reports", href: "/dashboard/reports", icon: BarChart3 },
  { name: "Marketplace", href: "/dashboard/marketplace", icon: Layers, featureFlag: "marketplace" },
  { name: "Settings", href: "/settings", icon: Settings },
] as const;
