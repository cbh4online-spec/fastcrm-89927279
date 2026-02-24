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
import { DealIntelligence, HealthLabel, RiskSeverity } from "@/hooks/useDealIntelligence";
import { CreateTaskFromIntelligence } from "./CreateTaskFromIntelligence";

interface DealIntelligencePanelProps {
  intelligence: DealIntelligence | null;
  dealId: string;
}

const STORAGE_KEY = "deal-intelligence-panel-open";

const healthConfig: Record<HealthLabel, { label: string; color: string; icon: typeof CheckCircle2; bg: string }> = {
  healthy: { label: "Healthy", color: "text-green-600", icon: CheckCircle2, bg: "bg-green-500/10 border-green-500/20" },
  watch: { label: "Watch", color: "text-amber-600", icon: Eye, bg: "bg-amber-500/10 border-amber-500/20" },
  at_risk: { label: "At Risk", color: "text-red-600", icon: AlertTriangle, bg: "bg-red-500/10 border-red-500/20" },
};

const severityConfig: Record<RiskSeverity, { label: string; className: string }> = {
  high: { label: "High", className: "bg-red-100 text-red-700 border-red-200" },
  medium: { label: "Medium", className: "bg-amber-100 text-amber-700 border-amber-200" },
  low: { label: "Low", className: "bg-blue-100 text-blue-700 border-blue-200" },
};

export function DealIntelligencePanel({ intelligence, dealId }: DealIntelligencePanelProps) {
  const [isOpen, setIsOpen] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored !== null ? stored === "true" : true;
  });
  const [showTaskForm, setShowTaskForm] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(isOpen));
  }, [isOpen]);

  if (!intelligence) return null;

  const { healthScore, healthLabel, riskDrivers, nextBestAction, dataCompleteness } = intelligence;
  const config = healthConfig[healthLabel];
  const HealthIcon = config.icon;

  const showCreateTask = nextBestAction.type === "follow_up" || nextBestAction.type === "create_task";

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
                  {healthScore} · {config.label}
                </Badge>
                {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="px-4 pb-4 pt-0 space-y-4">
            {/* A) Health Summary */}
            {intelligence.topRiskReason && (
              <p className="text-xs text-muted-foreground">
                {healthLabel === "healthy" ? "Deal saudável" : intelligence.topRiskReason}
              </p>
            )}

            {/* B) Risk Drivers */}
            {riskDrivers.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Riscos</p>
                {riskDrivers.map((risk, i) => {
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

            {/* C) Next Best Action */}
            <div className="space-y-2">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Próxima Ação</p>
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-xs text-foreground">{nextBestAction.title}</span>
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
                  prefilledTitle={nextBestAction.title}
                  onClose={() => setShowTaskForm(false)}
                />
              )}
            </div>

            {/* D) Data Completeness */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Dados</p>
                <span className="text-[11px] text-muted-foreground">{dataCompleteness.percent}%</span>
              </div>
              <Progress value={dataCompleteness.percent} className="h-1.5" />
              {dataCompleteness.missingFields.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {dataCompleteness.missingFields.map((field) => (
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
