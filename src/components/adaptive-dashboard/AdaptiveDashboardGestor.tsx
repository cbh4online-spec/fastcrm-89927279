import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdaptiveMetricCard } from "./AdaptiveMetricCard";
import { GoalProgressList } from "./GoalProgressBar";
import { AlertBannerList } from "./AlertBanner";
import { BenchmarkCard } from "./BenchmarkCard";
import { ArrowRight, TrendingUp, TrendingDown, Phone, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import type { AdaptiveLayoutConfig } from "@/hooks/useAdaptiveDashboard";
import {
  mockMetrics,
  mockAlerts,
  mockGoals,
  mockBenchmarks,
  mockWeeklyComparison,
  mockPriorityActions,
  type WeeklyComparison,
  type PriorityAction,
} from "@/data/adaptiveDashboardMock";

interface AdaptiveDashboardGestorProps {
  layoutConfig: AdaptiveLayoutConfig;
}

const priorityTypeIcons: Record<string, React.ElementType> = {
  follow_up: Phone,
  close: Target,
  rescue: TrendingDown,
  upsell: TrendingUp,
};

function formatCurrency(v: number) {
  return `€${v.toLocaleString('pt-PT')}`;
}

function WeeklyComparisonCard({ comparisons, textSizeClass }: { comparisons: WeeklyComparison[]; textSizeClass: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className={cn("text-sm font-semibold", textSizeClass === 'text-lg' && 'text-base')}>
          Comparativo Semanal
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {comparisons.map(c => {
            const change = c.current - c.previous;
            const pctChange = c.previous > 0 ? ((change / c.previous) * 100) : 0;
            const isUp = change >= 0;
            const fmt = (v: number) => c.format === 'currency' ? formatCurrency(v) : v.toLocaleString('pt-PT');
            return (
              <div key={c.label} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{c.label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold">{fmt(c.current)}</span>
                  <span className={cn(
                    "text-xs font-medium px-1.5 py-0.5 rounded-full",
                    isUp ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                  )}>
                    {isUp ? '+' : ''}{pctChange.toFixed(1)}%
                  </span>
                  <span className="text-xs text-muted-foreground">vs {fmt(c.previous)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function PriorityActionsCard({ actions, textSizeClass }: { actions: PriorityAction[]; textSizeClass: string }) {
  const navigate = useNavigate();
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className={cn("text-sm font-semibold", textSizeClass === 'text-lg' && 'text-base')}>
            Ações Prioritárias
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => navigate('/dashboard/opportunities')}>
            Ver todas <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {actions.map(action => {
            const Icon = priorityTypeIcons[action.type] || Target;
            return (
              <div key={action.id} className={cn(
                "flex items-center gap-3 p-2.5 rounded-lg border",
                action.priority === 'high' ? 'border-destructive/20 bg-destructive/5' :
                action.priority === 'medium' ? 'border-warning/20 bg-warning/5' :
                'border-border bg-muted/30'
              )}>
                <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{action.entityName}</p>
                  <p className="text-xs text-muted-foreground">{action.label}</p>
                </div>
                {action.value && (
                  <span className="text-sm font-semibold text-foreground shrink-0">
                    {formatCurrency(action.value)}
                  </span>
                )}
                <span className="text-xs text-muted-foreground shrink-0">{action.dueLabel}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export function AdaptiveDashboardGestor({ layoutConfig }: AdaptiveDashboardGestorProps) {
  const { textSizeClass, maxAlerts, showBenchmarks } = layoutConfig;
  const gridCols = layoutConfig.metricsColumns === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';

  return (
    <div className="space-y-6">
      {/* Alerts */}
      <AlertBannerList alerts={mockAlerts} maxAlerts={maxAlerts} textSizeClass={textSizeClass} />

      {/* Metric Cards */}
      <div className={cn("grid gap-4", gridCols)}>
        {mockMetrics.map(m => (
          <AdaptiveMetricCard key={m.id} metric={m} textSizeClass={textSizeClass} />
        ))}
      </div>

      {/* Goals */}
      <div>
        <h3 className={cn("font-semibold mb-3 text-foreground", textSizeClass === 'text-lg' ? 'text-lg' : 'text-base')}>
          Metas do Trimestre
        </h3>
        <GoalProgressList goals={mockGoals} textSizeClass={textSizeClass} />
      </div>

      {/* Weekly Comparison + Priority Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <WeeklyComparisonCard comparisons={mockWeeklyComparison} textSizeClass={textSizeClass} />
        <PriorityActionsCard actions={mockPriorityActions} textSizeClass={textSizeClass} />
      </div>

      {/* Benchmarking */}
      {showBenchmarks && (
        <BenchmarkCard benchmarks={mockBenchmarks} textSizeClass={textSizeClass} />
      )}
    </div>
  );
}
