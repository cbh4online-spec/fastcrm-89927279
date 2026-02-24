import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Brain,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Zap,
  Plus,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CreateTaskFromIntelligence } from "./CreateTaskFromIntelligence";
import type { DealIntelligencePayload, APIHealthLabel, APIRiskSeverity } from "@/types/dealIntelligence";

interface DealIntelligencePanelProps {
  intelligence: DealIntelligencePayload | null | undefined;
  dealId: string;
  isLoading?: boolean;
}

const STORAGE_KEY = "deal-intelligence-panel-open";

const healthConfig: Record<APIHealthLabel, { label: string; color: string; icon: typeof CheckCircle2; bg: string }> = {
  HEALTHY: { label: "Healthy", color: "text-green-600", icon: CheckCircle2, bg: "bg-green-500/10 border-green-500/20" },
  WATCH: { label: "Watch", color: "text-amber-600", icon: Eye, bg: "bg-amber-500/10 border-amber-500/20" },
  AT_RISK: { label: "At Risk", color: "text-red-600", icon: AlertTriangle, bg: "bg-red-500/10 border-red-500/20" },
};

const severityConfig: Record<APIRiskSeverity, { label: string; className: string }> = {
  HIGH: { label: "High", className: "bg-red-100 text-red-700 border-red-200" },
  MEDIUM: { label: "Medium", className: "bg-amber-100 text-amber-700 border-amber-200" },
  LOW: { label: "Low", className: "bg-blue-100 text-blue-700 border-blue-200" },
};

export function DealIntelligencePanel({ intelligence, dealId, isLoading }: DealIntelligencePanelProps) {
  const [isOpen, setIsOpen] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored !== null ? stored === "true" : true;
  });
  const [showTaskForm, setShowTaskForm] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(isOpen));
  }, [isOpen]);

  if (isLoading) {
    return (
      <Card className="border">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary animate-pulse" />
            Intelligence
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (!intelligence) return null;

  const { health_score, health_label, risk_drivers, next_best_action, data_completeness } = intelligence;
  const config = healthConfig[health_label];
  const HealthIcon = config.icon;

  const showCreateTask = next_best_action.type === "FOLLOW_UP" || next_best_action.type === "CREATE_TASK";

  return (
    <Card className="border">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer py-3 px-4 hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary" />
                Intelligence
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={cn("text-[10px] h-5 px-1.5 font-semibold", config.bg, config.color)}>
                  <HealthIcon className="w-3 h-3 mr-1" />
                  {health_score} · {config.label}
                </Badge>
                {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="px-4 pb-4 pt-0 space-y-4">
            {/* Risk Drivers */}
            {risk_drivers.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Riscos</p>
                {risk_drivers.map((risk, i) => {
                  const sev = severityConfig[risk.severity];
                  return (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <Badge variant="outline" className={cn("text-[9px] h-4 px-1 shrink-0 mt-0.5", sev.className)}>
                        {sev.label}
                      </Badge>
                      <span className="text-foreground/80">{risk.reason}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Next Best Action */}
            <div className="space-y-2">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Próxima Ação</p>
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-xs text-foreground">{next_best_action.title}</span>
              </div>
              {showCreateTask && !showTaskForm && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1 w-full"
                  onClick={() => setShowTaskForm(true)}
                >
                  <Plus className="w-3 h-3" />
                  Criar tarefa
                </Button>
              )}
              {!showCreateTask && (
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1 w-full">
                  <ArrowRight className="w-3 h-3" />
                  Executar
                </Button>
              )}
              {showTaskForm && (
                <CreateTaskFromIntelligence
                  dealId={dealId}
                  prefilledTitle={next_best_action.payload?.suggested_title || next_best_action.title}
                  suggestedDueDays={next_best_action.payload?.suggested_due_days}
                  onClose={() => setShowTaskForm(false)}
                />
              )}
            </div>

            {/* Data Completeness */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Dados</p>
                <span className="text-[11px] text-muted-foreground">{data_completeness.percent}%</span>
              </div>
              <Progress value={data_completeness.percent} className="h-1.5" />
              {data_completeness.missing_fields.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {data_completeness.missing_fields.map((field) => (
                    <Badge key={field} variant="outline" className="text-[10px] h-4 px-1.5 text-muted-foreground">
                      + {field}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
