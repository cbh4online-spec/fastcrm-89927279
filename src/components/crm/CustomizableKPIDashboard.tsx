import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MessageSquare,
  Clock,
  CheckSquare,
  TrendingUp,
  DollarSign,
  Calendar,
  Megaphone,
  Share2,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  Lightbulb,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEntityKPIs, useEntityAIInsights } from "@/hooks/useEntityInsights";
import { 
  useLayoutConfig, 
  WidgetConfig, 
  WidgetType,
  LayoutConfig,
} from "@/hooks/useLayoutConfig";
import { UnifiedLayoutCustomizer } from "./UnifiedLayoutCustomizer";
import { useUserRole } from "@/hooks/useUserRole";

interface WidgetProps {
  settings: Record<string, unknown>;
  kpis: ReturnType<typeof useEntityKPIs>["data"];
  insights?: ReturnType<typeof useEntityAIInsights>["data"];
}

// Individual widget components
function MessagesWidget({ settings, kpis }: WidgetProps) {
  const timeWindow = (settings.timeWindow as number) || 30;
  return (
    <KPICard
      label={`Mensagens (${timeWindow}d)`}
      value={kpis?.messagesLast30Days || 0}
      icon={<MessageSquare className="w-4 h-4" />}
      iconColor="text-blue-600"
      subValue={`${kpis?.messagesCount || 0} total`}
    />
  );
}

function LastInteractionWidget({ kpis }: WidgetProps) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Nunca";
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Hoje";
    if (diffDays === 1) return "Ontem";
    if (diffDays < 7) return `Há ${diffDays} dias`;
    if (diffDays < 30) return `Há ${Math.floor(diffDays / 7)} sem`;
    return date.toLocaleDateString("pt-PT", { day: "2-digit", month: "short" });
  };

  return (
    <KPICard
      label="Última Interação"
      value={formatDate(kpis?.lastInteractionDate || null)}
      icon={<Clock className="w-4 h-4" />}
      iconColor="text-amber-600"
    />
  );
}

function OpenActivitiesWidget({ kpis }: WidgetProps) {
  return (
    <KPICard
      label="Atividades Abertas"
      value={kpis?.openActivitiesCount || 0}
      icon={<CheckSquare className="w-4 h-4" />}
      iconColor="text-orange-600"
      highlight={kpis?.openActivitiesCount ? kpis.openActivitiesCount > 5 : false}
    />
  );
}

function OpportunitiesWidget({ kpis }: WidgetProps) {
  const formatCurrency = (value: number) => {
    if (value === 0) return "€0";
    if (value >= 1000000) return `€${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `€${(value / 1000).toFixed(1)}K`;
    return `€${value.toLocaleString()}`;
  };

  return (
    <KPICard
      label="Oportunidades"
      value={kpis?.opportunitiesCount || 0}
      icon={<TrendingUp className="w-4 h-4" />}
      iconColor="text-emerald-600"
      subValue={kpis?.totalOpenDealValue ? formatCurrency(kpis.totalOpenDealValue) : undefined}
    />
  );
}

function MeetingsWidget({ settings, kpis }: WidgetProps) {
  const timeWindow = (settings.timeWindow as number) || 30;
  return (
    <KPICard
      label={`Reuniões (${timeWindow}d)`}
      value={kpis?.meetingsHeld || 0}
      icon={<Calendar className="w-4 h-4" />}
      iconColor="text-purple-600"
    />
  );
}

function CampaignsWidget({ kpis }: WidgetProps) {
  return (
    <KPICard
      label="Campanhas"
      value={kpis?.campaignInteractions || 0}
      icon={<Megaphone className="w-4 h-4" />}
      iconColor="text-pink-600"
    />
  );
}

function SocialInteractionsWidget({ kpis }: WidgetProps) {
  return (
    <KPICard
      label="Interações Sociais"
      value={kpis?.socialInteractionsCount || 0}
      icon={<Share2 className="w-4 h-4" />}
      iconColor="text-indigo-600"
    />
  );
}

function PaymentsWidget({ kpis }: WidgetProps) {
  const formatCurrency = (value: number) => {
    if (value === 0) return "€0";
    if (value >= 1000000) return `€${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `€${(value / 1000).toFixed(1)}K`;
    return `€${value.toLocaleString()}`;
  };

  return (
    <KPICard
      label="Pagamentos"
      value={kpis?.paymentsCount || 0}
      icon={<DollarSign className="w-4 h-4" />}
      iconColor="text-teal-600"
      subValue={kpis?.totalPaymentsValue ? formatCurrency(kpis.totalPaymentsValue) : undefined}
    />
  );
}

function AIInsightsWidget({ insights }: WidgetProps) {
  if (!insights) {
    return (
      <Card className="col-span-full border-primary/20 bg-gradient-to-r from-primary/5 via-background to-amber-500/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm">A carregar insights...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-full border-primary/20 bg-gradient-to-r from-primary/5 via-background to-amber-500/5">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-amber-500/20">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0 space-y-2.5">
            <h4 className="text-sm font-medium">Insights IA</h4>

            {insights.summary && (
              <p className="text-sm text-muted-foreground">{insights.summary}</p>
            )}

            {insights.nextAction && (
              <div className="flex items-center gap-2 p-2 rounded-md bg-primary/10 text-primary">
                <Lightbulb className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm font-medium">{insights.nextAction}</span>
                <ArrowRight className="w-3.5 h-3.5 ml-auto flex-shrink-0" />
              </div>
            )}

            {insights.warnings.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {insights.warnings.map((warning, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="bg-amber-500/10 text-amber-700 border-amber-500/30 text-xs"
                  >
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    {warning}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// KPI Card component
interface KPICardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  iconColor?: string;
  subValue?: string;
  highlight?: boolean;
}

function KPICard({ label, value, icon, iconColor, subValue, highlight }: KPICardProps) {
  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border/50",
      highlight && "border-amber-500/50 bg-amber-500/5"
    )}>
      <div className={cn("p-2 rounded-md bg-background", iconColor)}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className="text-lg font-semibold tabular-nums">{value}</p>
        {subValue && (
          <p className="text-xs text-muted-foreground">{subValue}</p>
        )}
      </div>
    </div>
  );
}

// Widget renderer mapping
const WIDGET_COMPONENTS: Record<WidgetType, React.FC<WidgetProps>> = {
  messages_count: MessagesWidget,
  last_interaction: LastInteractionWidget,
  open_activities: OpenActivitiesWidget,
  opportunities: OpportunitiesWidget,
  meetings: MeetingsWidget,
  campaigns: CampaignsWidget,
  social_interactions: SocialInteractionsWidget,
  payments: PaymentsWidget,
  ai_insights: AIInsightsWidget,
};

interface CustomizableKPIDashboardProps {
  entityType: "lead" | "contact";
  entityId: string | undefined;
  entityData: {
    name: string;
    status?: string;
    source?: string;
    tags?: string[];
    notes?: string;
  } | null;
  onCustomizeClick?: () => void;
  showCustomizeButton?: boolean;
}

export function CustomizableKPIDashboard({
  entityType,
  entityId,
  entityData,
  onCustomizeClick,
  showCustomizeButton = true,
}: CustomizableKPIDashboardProps) {
  const [customizerOpen, setCustomizerOpen] = useState(false);
  
  const { data: layoutData, isLoading: layoutLoading } = useLayoutConfig(entityType);
  const { data: kpis, isLoading: kpisLoading } = useEntityKPIs(entityType, entityId);
  const { data: insights } = useEntityAIInsights(entityType, entityId, entityData);
  const { isAdmin } = useUserRole();

  if (layoutLoading || kpisLoading) {
    return <DashboardSkeleton />;
  }

  const { layout, source, layoutId } = layoutData || { 
    layout: { widgets: [], sidebar: [] } as LayoutConfig, 
    source: "default" as const, 
    layoutId: null 
  };
  
  const enabledWidgets = layout.widgets.filter(w => w.enabled).sort((a, b) => a.position - b.position);

  // Separate AI insights widget (always full width) from KPI widgets
  const kpiWidgets = enabledWidgets.filter(w => w.type !== "ai_insights");
  const aiInsightsWidget = enabledWidgets.find(w => w.type === "ai_insights");

  const handleCustomizeClick = () => {
    if (onCustomizeClick) {
      onCustomizeClick();
    } else {
      setCustomizerOpen(true);
    }
  };

  return (
    <div className="space-y-4">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {kpiWidgets.map((widget) => {
          const WidgetComponent = WIDGET_COMPONENTS[widget.type];
          if (!WidgetComponent) return null;
          
          return (
            <WidgetComponent
              key={widget.id}
              settings={widget.settings}
              kpis={kpis}
              insights={insights}
            />
          );
        })}
      </div>

      {/* AI Insights (full width) */}
      {aiInsightsWidget && (
        <AIInsightsWidget
          settings={aiInsightsWidget.settings}
          kpis={kpis}
          insights={insights}
        />
      )}

      {/* Customize button */}
      {showCustomizeButton && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCustomizeClick}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            <Settings2 className="w-3.5 h-3.5 mr-1" />
            Personalizar
          </Button>
        </div>
      )}

      {/* Unified customizer dialog (only when using internal state) */}
      {!onCustomizeClick && (
        <UnifiedLayoutCustomizer
          open={customizerOpen}
          onOpenChange={setCustomizerOpen}
          entityType={entityType}
          entityId={entityId}
          currentLayout={layout}
          layoutSource={source}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="p-3 rounded-lg bg-muted/40 border border-border/50">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-md" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-12" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <Card className="border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-full max-w-md" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Export for use in other components
export { useLayoutConfig };
