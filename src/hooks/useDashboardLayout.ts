import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// Widget type definitions
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

export interface DashboardLayout {
  id: string;
  workspace_id: string;
  user_id: string | null;
  entity_type: "lead" | "contact";
  layout: WidgetConfig[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// Default widgets configuration
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

export function useDashboardLayout(entityType: "lead" | "contact") {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();
  const { user } = useAuth();

  return useQuery({
    queryKey: ["dashboard_layout", entityType, currentWorkspace?.id, user?.id],
    queryFn: async (): Promise<{ layout: WidgetConfig[]; source: "user" | "workspace" | "default"; layoutId: string | null }> => {
      if (!currentWorkspace?.id) {
        return { layout: DEFAULT_WIDGETS, source: "default", layoutId: null };
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
            layout: validateLayout(userLayout.layout as unknown as WidgetConfig[]),
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
          layout: validateLayout(workspaceLayout.layout as unknown as WidgetConfig[]),
          source: "workspace" as const,
          layoutId: workspaceLayout.id,
        };
      }

      // Fall back to default
      return { layout: DEFAULT_WIDGETS, source: "default", layoutId: null };
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useSaveDashboardLayout() {
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
      layout: WidgetConfig[];
      scope: "user" | "workspace";
    }) => {
      if (!currentWorkspace?.id) throw new Error("No workspace selected");

      // Validate layout
      const validatedLayout = validateLayout(layout);
      const enabledCount = validatedLayout.filter(w => w.enabled).length;
      if (enabledCount > MAX_VISIBLE_WIDGETS) {
        throw new Error(`Máximo de ${MAX_VISIBLE_WIDGETS} widgets permitido`);
      }

      const userId = scope === "user" ? user?.id : null;

      // Upsert the layout - cast to any for JSON compatibility
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
        queryKey: ["dashboard_layout", variables.entityType, currentWorkspace?.id],
      });
      toast.success("Dashboard guardado com sucesso");
    },
    onError: (error) => {
      console.error("Error saving dashboard layout:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao guardar dashboard");
    },
  });
}

export function useDeleteUserLayout() {
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
        queryKey: ["dashboard_layout", entityType, currentWorkspace?.id],
      });
      toast.success("Configuração pessoal removida");
    },
  });
}

// Validate and merge layout with defaults (in case new widgets are added)
function validateLayout(layout: WidgetConfig[]): WidgetConfig[] {
  if (!Array.isArray(layout)) return DEFAULT_WIDGETS;

  const result: WidgetConfig[] = [];
  const existingTypes = new Set(layout.map(w => w.type));

  // Add existing widgets
  layout.forEach((widget, index) => {
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

  // Sort by position
  result.sort((a, b) => a.position - b.position);

  return result;
}

// Generate AI-suggested layout based on entity data
export function generateSuggestedLayout(kpis: {
  messagesCount: number;
  opportunitiesCount: number;
  openActivitiesCount: number;
  meetingsHeld: number;
  paymentsCount: number;
}): WidgetConfig[] {
  const suggestions: WidgetConfig[] = [...DEFAULT_WIDGETS];

  // Prioritize widgets based on activity
  const priorities: { type: WidgetType; score: number }[] = [
    { type: "messages_count", score: kpis.messagesCount > 10 ? 100 : kpis.messagesCount * 10 },
    { type: "opportunities", score: kpis.opportunitiesCount > 0 ? 90 : 20 },
    { type: "open_activities", score: kpis.openActivitiesCount > 0 ? 85 : 30 },
    { type: "ai_insights", score: 80 }, // Always useful
    { type: "last_interaction", score: 75 },
    { type: "meetings", score: kpis.meetingsHeld > 0 ? 70 : 15 },
    { type: "payments", score: kpis.paymentsCount > 0 ? 65 : 10 },
    { type: "campaigns", score: 25 },
    { type: "social_interactions", score: 20 },
  ];

  // Sort by score
  priorities.sort((a, b) => b.score - a.score);

  // Update positions and enable top widgets
  return suggestions.map(widget => {
    const priorityIndex = priorities.findIndex(p => p.type === widget.type);
    return {
      ...widget,
      position: priorityIndex >= 0 ? priorityIndex : 99,
      enabled: priorityIndex < 6, // Enable top 6
    };
  }).sort((a, b) => a.position - b.position);
}
