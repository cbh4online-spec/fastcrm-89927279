import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// ============= WIDGET TYPES =============

export type WidgetType = 
  | "messages_count"
  | "last_interaction"
  | "open_activities"
  | "opportunities"
  | "meetings"
  | "campaigns"
  | "social_interactions"
  | "payments"
  | "ai_insights";

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  enabled: boolean;
  position: number;
  settings: Record<string, unknown>;
}

export const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: "messages_count", type: "messages_count", enabled: true, position: 0, settings: { timeWindow: 30 } },
  { id: "last_interaction", type: "last_interaction", enabled: true, position: 1, settings: {} },
  { id: "open_activities", type: "open_activities", enabled: true, position: 2, settings: {} },
  { id: "opportunities", type: "opportunities", enabled: true, position: 3, settings: {} },
  { id: "meetings", type: "meetings", enabled: true, position: 4, settings: { timeWindow: 30 } },
  { id: "campaigns", type: "campaigns", enabled: false, position: 5, settings: {} },
  { id: "social_interactions", type: "social_interactions", enabled: false, position: 6, settings: {} },
  { id: "payments", type: "payments", enabled: false, position: 7, settings: {} },
  { id: "ai_insights", type: "ai_insights", enabled: true, position: 8, settings: {} },
];

export const WIDGET_DEFINITIONS: Record<WidgetType, {
  label: string;
  description: string;
  icon: string;
  hasTimeWindow?: boolean;
  timeWindowOptions?: number[];
}> = {
  messages_count: {
    label: "Mensagens",
    description: "Contagem de mensagens no período",
    icon: "MessageSquare",
    hasTimeWindow: true,
    timeWindowOptions: [7, 30, 90],
  },
  last_interaction: {
    label: "Última Interação",
    description: "Data da última interação",
    icon: "Clock",
  },
  open_activities: {
    label: "Atividades Abertas",
    description: "Número de atividades pendentes",
    icon: "CheckSquare",
  },
  opportunities: {
    label: "Oportunidades",
    description: "Contagem e valor total em aberto",
    icon: "TrendingUp",
  },
  meetings: {
    label: "Reuniões",
    description: "Reuniões realizadas no período",
    icon: "Calendar",
    hasTimeWindow: true,
    timeWindowOptions: [30, 90, 180],
  },
  campaigns: {
    label: "Campanhas",
    description: "Interações com campanhas",
    icon: "Megaphone",
  },
  social_interactions: {
    label: "Interações Sociais",
    description: "Interações via redes sociais",
    icon: "Share2",
  },
  payments: {
    label: "Pagamentos",
    description: "Histórico de pagamentos",
    icon: "DollarSign",
  },
  ai_insights: {
    label: "Insights IA",
    description: "Resumo e sugestões de IA",
    icon: "Sparkles",
  },
};

export const MAX_VISIBLE_WIDGETS = 10;

// ============= SIDEBAR MODULE TYPES =============

export type SidebarModuleType = 
  | "overview"
  | "notes"
  | "messages"
  | "open_activities"
  | "closed_activities"
  | "meetings"
  | "opportunities"
  | "campaigns"
  | "emails"
  | "social"
  | "payments"
  | "files";

export interface SidebarModuleConfig {
  id: string;
  type: SidebarModuleType;
  enabled: boolean;
  position: number;
  settings: {
    hide_if_empty?: boolean;
  };
}

export const DEFAULT_SIDEBAR_MODULES: SidebarModuleConfig[] = [
  { id: "overview", type: "overview", enabled: true, position: 0, settings: { hide_if_empty: false } },
  { id: "notes", type: "notes", enabled: true, position: 1, settings: { hide_if_empty: false } },
  { id: "messages", type: "messages", enabled: true, position: 2, settings: { hide_if_empty: false } },
  { id: "open_activities", type: "open_activities", enabled: true, position: 3, settings: { hide_if_empty: false } },
  { id: "closed_activities", type: "closed_activities", enabled: true, position: 4, settings: { hide_if_empty: true } },
  { id: "meetings", type: "meetings", enabled: true, position: 5, settings: { hide_if_empty: true } },
  { id: "opportunities", type: "opportunities", enabled: true, position: 6, settings: { hide_if_empty: false } },
  { id: "campaigns", type: "campaigns", enabled: true, position: 7, settings: { hide_if_empty: true } },
  { id: "emails", type: "emails", enabled: true, position: 8, settings: { hide_if_empty: true } },
  { id: "social", type: "social", enabled: true, position: 9, settings: { hide_if_empty: true } },
  { id: "payments", type: "payments", enabled: true, position: 10, settings: { hide_if_empty: true } },
  { id: "files", type: "files", enabled: true, position: 11, settings: { hide_if_empty: true } },
];

export const SIDEBAR_MODULE_DEFINITIONS: Record<SidebarModuleType, {
  label: string;
  description: string;
  icon: string;
  category: "context" | "activity" | "business" | "communication";
  isCore?: boolean;
}> = {
  overview: {
    label: "Visão Geral",
    description: "Informações principais do registo",
    icon: "User",
    category: "context",
    isCore: true,
  },
  notes: {
    label: "Notas",
    description: "Notas e apontamentos",
    icon: "FileText",
    category: "activity",
    isCore: true,
  },
  messages: {
    label: "Mensagens",
    description: "Histórico de mensagens",
    icon: "MessageSquare",
    category: "activity",
    isCore: true,
  },
  open_activities: {
    label: "Atividades Abertas",
    description: "Tarefas e atividades pendentes",
    icon: "CheckSquare",
    category: "activity",
    isCore: true,
  },
  closed_activities: {
    label: "Atividades Fechadas",
    description: "Tarefas e atividades concluídas",
    icon: "CheckCircle2",
    category: "activity",
  },
  meetings: {
    label: "Reuniões",
    description: "Reuniões agendadas e realizadas",
    icon: "Calendar",
    category: "activity",
  },
  opportunities: {
    label: "Oportunidades",
    description: "Oportunidades de negócio",
    icon: "TrendingUp",
    category: "business",
    isCore: true,
  },
  campaigns: {
    label: "Campanhas",
    description: "Participação em campanhas",
    icon: "Megaphone",
    category: "business",
  },
  emails: {
    label: "E-mails",
    description: "Histórico de e-mails",
    icon: "Mail",
    category: "communication",
  },
  social: {
    label: "Interações Sociais",
    description: "Interações em redes sociais",
    icon: "Share2",
    category: "communication",
  },
  payments: {
    label: "Pagamentos",
    description: "Histórico de pagamentos e faturas",
    icon: "DollarSign",
    category: "communication",
  },
  files: {
    label: "Ficheiros",
    description: "Documentos e anexos",
    icon: "Paperclip",
    category: "communication",
  },
};

export const MAX_SIDEBAR_MODULES = 12;

// ============= COMBINED LAYOUT INTERFACE =============

export interface LayoutConfig {
  widgets: WidgetConfig[];
  sidebar: SidebarModuleConfig[];
}

export interface LayoutData {
  id: string;
  workspace_id: string;
  user_id: string | null;
  entity_type: "lead" | "contact";
  layout: LayoutConfig;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// ============= HOOKS =============

export function useLayoutConfig(entityType: "lead" | "contact") {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();
  const { user } = useAuth();

  return useQuery({
    queryKey: ["layout_config", entityType, currentWorkspace?.id, user?.id],
    queryFn: async (): Promise<{
      layout: LayoutConfig;
      source: "user" | "workspace" | "default";
      layoutId: string | null;
    }> => {
      if (!currentWorkspace?.id) {
        return { 
          layout: { widgets: DEFAULT_WIDGETS, sidebar: DEFAULT_SIDEBAR_MODULES }, 
          source: "default", 
          layoutId: null 
        };
      }

      // First try to get user-specific layout
      if (user?.id) {
        const { data: userLayout } = await workspaceClient
          .from("dashboard_layouts")
          .select("*")
          .eq("workspace_id", currentWorkspace.id)
          .eq("entity_type", entityType)
          .eq("user_id", user.id)
          .maybeSingle();

        if (userLayout) {
          return {
            layout: validateLayoutConfig(userLayout.layout as unknown),
            source: "user" as const,
            layoutId: userLayout.id,
          };
        }
      }

      // Then try workspace default
      const { data: workspaceLayout } = await workspaceClient
        .from("dashboard_layouts")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .eq("entity_type", entityType)
        .is("user_id", null)
        .maybeSingle();

      if (workspaceLayout) {
        return {
          layout: validateLayoutConfig(workspaceLayout.layout as unknown),
          source: "workspace" as const,
          layoutId: workspaceLayout.id,
        };
      }

      // Fall back to default
      return { 
        layout: { widgets: DEFAULT_WIDGETS, sidebar: DEFAULT_SIDEBAR_MODULES }, 
        source: "default", 
        layoutId: null 
      };
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useSaveLayoutConfig() {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      entityType,
      layout,
      scope,
    }: {
      entityType: "lead" | "contact";
      layout: LayoutConfig;
      scope: "user" | "workspace";
    }) => {
      if (!currentWorkspace?.id) throw new Error("No workspace selected");

      // Validate layout
      const validatedLayout = validateLayoutConfig(layout);
      
      // Check widget limit
      const enabledWidgetCount = validatedLayout.widgets.filter(w => w.enabled).length;
      if (enabledWidgetCount > MAX_VISIBLE_WIDGETS) {
        throw new Error(`Máximo de ${MAX_VISIBLE_WIDGETS} widgets permitido`);
      }

      // Check sidebar module limit
      const enabledModuleCount = validatedLayout.sidebar.filter(m => m.enabled).length;
      if (enabledModuleCount > MAX_SIDEBAR_MODULES) {
        throw new Error(`Máximo de ${MAX_SIDEBAR_MODULES} módulos de sidebar permitido`);
      }

      const userId = scope === "user" ? user?.id : null;

      const layoutData = {
        workspace_id: currentWorkspace.id,
        user_id: userId,
        entity_type: entityType,
        layout: JSON.parse(JSON.stringify(validatedLayout)),
        is_default: scope === "workspace",
      };

      const { error } = await workspaceClient
        .from("dashboard_layouts")
        .upsert([layoutData] as any, {
          onConflict: "workspace_id,user_id,entity_type",
        });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["layout_config", variables.entityType, currentWorkspace?.id],
      });
      // Also invalidate old dashboard_layout queries for backwards compatibility
      queryClient.invalidateQueries({
        queryKey: ["dashboard_layout", variables.entityType, currentWorkspace?.id],
      });
      toast.success("Configuração guardada com sucesso");
    },
    onError: (error) => {
      console.error("Error saving layout config:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao guardar configuração");
    },
  });
}

export function useDeleteUserLayoutConfig() {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entityType: "lead" | "contact") => {
      if (!currentWorkspace?.id || !user?.id) throw new Error("No workspace or user");

      const { error } = await workspaceClient
        .from("dashboard_layouts")
        .delete()
        .eq("workspace_id", currentWorkspace.id)
        .eq("entity_type", entityType)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: (_, entityType) => {
      queryClient.invalidateQueries({
        queryKey: ["layout_config", entityType, currentWorkspace?.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["dashboard_layout", entityType, currentWorkspace?.id],
      });
      toast.success("Configuração pessoal removida");
    },
  });
}

// ============= VALIDATION =============

function validateLayoutConfig(input: unknown): LayoutConfig {
  const config = input as Partial<LayoutConfig> | null;
  
  // Handle old format (array of widgets only)
  if (Array.isArray(input)) {
    return {
      widgets: validateWidgets(input as WidgetConfig[]),
      sidebar: DEFAULT_SIDEBAR_MODULES,
    };
  }

  return {
    widgets: validateWidgets(config?.widgets),
    sidebar: validateSidebarModules(config?.sidebar),
  };
}

function validateWidgets(widgets?: WidgetConfig[]): WidgetConfig[] {
  if (!Array.isArray(widgets)) return DEFAULT_WIDGETS;

  const result: WidgetConfig[] = [];
  const existingTypes = new Set(widgets.map(w => w.type));

  // Add existing widgets
  widgets.forEach((widget, index) => {
    if (WIDGET_DEFINITIONS[widget.type]) {
      result.push({
        ...widget,
        position: widget.position ?? index,
      });
    }
  });

  // Add any missing widgets from defaults (disabled by default)
  DEFAULT_WIDGETS.forEach((defaultWidget, index) => {
    if (!existingTypes.has(defaultWidget.type)) {
      result.push({
        ...defaultWidget,
        enabled: false,
        position: result.length + index,
      });
    }
  });

  result.sort((a, b) => a.position - b.position);
  return result;
}

function validateSidebarModules(modules?: SidebarModuleConfig[]): SidebarModuleConfig[] {
  if (!Array.isArray(modules)) return DEFAULT_SIDEBAR_MODULES;

  const result: SidebarModuleConfig[] = [];
  const existingTypes = new Set(modules.map(m => m.type));

  // Add existing modules
  modules.forEach((module, index) => {
    if (SIDEBAR_MODULE_DEFINITIONS[module.type]) {
      result.push({
        ...module,
        position: module.position ?? index,
        settings: {
          hide_if_empty: module.settings?.hide_if_empty ?? !SIDEBAR_MODULE_DEFINITIONS[module.type].isCore,
        },
      });
    }
  });

  // Add any missing modules from defaults
  DEFAULT_SIDEBAR_MODULES.forEach((defaultModule, index) => {
    if (!existingTypes.has(defaultModule.type)) {
      result.push({
        ...defaultModule,
        enabled: true,
        position: result.length + index,
      });
    }
  });

  result.sort((a, b) => a.position - b.position);
  return result;
}

// ============= AI SUGGESTIONS =============

export function generateSuggestedLayout(kpis: {
  messagesCount: number;
  opportunitiesCount: number;
  openActivitiesCount: number;
  meetingsHeld: number;
  paymentsCount: number;
}): LayoutConfig {
  const widgets = [...DEFAULT_WIDGETS];

  // Prioritize widgets based on activity
  const priorities: { type: WidgetType; score: number }[] = [
    { type: "messages_count", score: kpis.messagesCount > 10 ? 100 : kpis.messagesCount * 10 },
    { type: "opportunities", score: kpis.opportunitiesCount > 0 ? 90 : 20 },
    { type: "open_activities", score: kpis.openActivitiesCount > 0 ? 85 : 30 },
    { type: "ai_insights", score: 80 },
    { type: "last_interaction", score: 75 },
    { type: "meetings", score: kpis.meetingsHeld > 0 ? 70 : 15 },
    { type: "payments", score: kpis.paymentsCount > 0 ? 65 : 10 },
    { type: "campaigns", score: 25 },
    { type: "social_interactions", score: 20 },
  ];

  priorities.sort((a, b) => b.score - a.score);

  const suggestedWidgets = widgets.map(widget => {
    const priorityIndex = priorities.findIndex(p => p.type === widget.type);
    return {
      ...widget,
      position: priorityIndex >= 0 ? priorityIndex : 99,
      enabled: priorityIndex < 6,
    };
  }).sort((a, b) => a.position - b.position);

  // Sidebar: enable modules with activity, disable empty non-core ones
  const suggestedSidebar = DEFAULT_SIDEBAR_MODULES.map(module => ({
    ...module,
    settings: {
      hide_if_empty: !SIDEBAR_MODULE_DEFINITIONS[module.type].isCore,
    },
  }));

  return {
    widgets: suggestedWidgets,
    sidebar: suggestedSidebar,
  };
}
