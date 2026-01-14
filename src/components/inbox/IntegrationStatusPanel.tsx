import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CheckCircle,
  AlertTriangle,
  Shield,
  FileText,
  Zap,
  Bot,
  Info,
  Inbox,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  INTEGRATION_REQUIREMENTS,
  checkIntegrationHealth,
} from "@/lib/integrationRules";
interface Props {
  className?: string;
  compact?: boolean;
}

const REQUIREMENT_ICONS: Record<string, typeof Shield> = {
  inbox_entry_point: Inbox,
  templates_mandatory: FileText,
  automations_visible: Zap,
  ai_assists_only: Bot,
  full_audit_trail: Activity,
};

export function IntegrationStatusPanel({ className, compact = false }: Props) {
  const health = checkIntegrationHealth();

  const statusColors = {
    healthy: "text-green-600 bg-green-500/10",
    degraded: "text-yellow-600 bg-yellow-500/10",
    critical: "text-red-600 bg-red-500/10",
  };

  const statusLabels = {
    healthy: "Sistema Integrado",
    degraded: "Atenção Necessária",
    critical: "Problemas Críticos",
  };

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn("flex items-center gap-2 cursor-help", className)}>
              <div className={cn("p-1.5 rounded-full", statusColors[health.status])}>
                {health.status === "healthy" ? (
                  <CheckCircle className="w-4 h-4" />
                ) : health.status === "degraded" ? (
                  <AlertTriangle className="w-4 h-4" />
                ) : (
                  <Shield className="w-4 h-4" />
                )}
              </div>
              <span className="text-xs font-medium">{statusLabels[health.status]}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="space-y-2">
              <p className="font-medium text-sm">{statusLabels[health.status]}</p>
              <ul className="space-y-1">
                {health.checks.slice(0, 3).map((check) => (
                  <li key={check.id} className="flex items-center gap-2 text-xs">
                    {check.passed ? (
                      <CheckCircle className="w-3 h-3 text-green-500" />
                    ) : (
                      <AlertTriangle className="w-3 h-3 text-yellow-500" />
                    )}
                    {check.name}
                  </li>
                ))}
              </ul>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">Estado do Sistema</CardTitle>
          </div>
          <Badge
            variant="outline"
            className={cn("gap-1", statusColors[health.status])}
          >
            {health.status === "healthy" ? (
              <CheckCircle className="w-3 h-3" />
            ) : (
              <AlertTriangle className="w-3 h-3" />
            )}
            {statusLabels[health.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Requirements list */}
        <div className="space-y-2">
          {INTEGRATION_REQUIREMENTS.map((req) => {
            const Icon = REQUIREMENT_ICONS[req.id] || Shield;
            const check = health.checks.find((c) => c.id === req.id);

            return (
              <div
                key={req.id}
                className="flex items-start gap-3 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className={cn(
                  "p-1.5 rounded-full flex-shrink-0",
                  check?.passed ? "bg-green-500/10 text-green-600" : "bg-yellow-500/10 text-yellow-600"
                )}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{req.name}</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] px-1.5 py-0",
                        req.status === "enforced" && "border-green-500/30 text-green-600",
                        req.status === "optional" && "border-gray-500/30 text-gray-600",
                        req.status === "warning" && "border-yellow-500/30 text-yellow-600"
                      )}
                    >
                      {req.status === "enforced" ? "Obrigatório" : 
                       req.status === "optional" ? "Opcional" : "Aviso"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {req.description}
                  </p>
                </div>
                {check?.passed ? (
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>

        <Separator />

        {/* Summary */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
          <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              <strong>Inbox:</strong> Ponto de entrada único para todas as conversas.
            </p>
            <p>
              <strong>Templates:</strong> Mensagens automáticas usam apenas templates validados.
            </p>
            <p>
              <strong>AI:</strong> Sugere e personaliza, mas nunca envia sem confirmação.
            </p>
            <p>
              <strong>Auditoria:</strong> Cada ação é registada com contexto completo.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
