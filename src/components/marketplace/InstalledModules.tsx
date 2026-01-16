import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { WorkspaceModule, MarketplaceModule, SAMPLE_MODULES } from "@/types/marketplace";
import { getIconByName } from "@/lib/icons";
import { 
  ExternalLink, 
  Settings, 
  BarChart3, 
  CreditCard,
  AlertCircle,
  TrendingUp,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";

interface InstalledModuleCardProps {
  moduleId: string;
  onOpen: (module: MarketplaceModule) => void;
  onSettings: (module: MarketplaceModule) => void;
}

export function InstalledModuleCard({ moduleId, onOpen, onSettings }: InstalledModuleCardProps) {
  const module = SAMPLE_MODULES.find(m => m.id === moduleId);
  if (!module) return null;

  const Icon = getIconByName(module.icon);

  // Simulated usage data
  const usagePercent = Math.floor(Math.random() * 80) + 10;
  const creditsUsed = module.pricing.credits_included 
    ? Math.floor((module.pricing.credits_included * usagePercent) / 100)
    : 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{module.name}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{module.publisher}</p>
            </div>
          </div>
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
            Ativo
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Usage stats */}
        {module.pricing.type === "credits" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Créditos usados</span>
              <span className="font-medium">{creditsUsed} / {module.pricing.credits_included}</span>
            </div>
            <Progress value={usagePercent} className="h-2" />
          </div>
        )}

        {module.pricing.type === "usage_based" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Uso este mês</span>
              <span className="font-medium">{Math.floor(Math.random() * 150) + 50} {module.pricing.usage_unit}s</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="w-3 h-3 text-emerald-500" />
              <span>+12% vs mês anterior</span>
            </div>
          </div>
        )}

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <BarChart3 className="w-3 h-3" />
              Ações
            </div>
            <p className="font-semibold">{Math.floor(Math.random() * 500) + 100}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Clock className="w-3 h-3" />
              Última ação
            </div>
            <p className="font-semibold text-sm">Há 2h</p>
          </div>
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex gap-2">
          <Button 
            variant="default" 
            size="sm" 
            className="flex-1"
            onClick={() => onOpen(module)}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Abrir
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onSettings(module)}
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface ModuleUsageSummaryProps {
  installedModuleIds: string[];
}

export function ModuleUsageSummary({ installedModuleIds }: ModuleUsageSummaryProps) {
  const totalSpend = installedModuleIds.reduce((acc, id) => {
    const module = SAMPLE_MODULES.find(m => m.id === id);
    return acc + (module?.pricing.base_price || 0);
  }, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CreditCard className="w-4 h-4" />
          Resumo Mensal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Módulos ativos</span>
          <span className="font-semibold">{installedModuleIds.length}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Custo base</span>
          <span className="font-semibold">{totalSpend}€/mês</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Consumo variável</span>
          <span className="font-semibold">~15€</span>
        </div>
        <Separator />
        <div className="flex items-center justify-between text-lg">
          <span className="font-medium">Total estimado</span>
          <span className="font-bold text-primary">{totalSpend + 15}€</span>
        </div>
      </CardContent>
    </Card>
  );
}

interface ModuleAlertsProps {
  installedModuleIds: string[];
}

export function ModuleAlerts({ installedModuleIds }: ModuleAlertsProps) {
  // Simulated alerts
  const alerts = [
    { type: "warning", message: "Lead Enricher Pro: 85% dos créditos usados" },
    { type: "info", message: "IMO AI: Nova versão 2.2 disponível" },
  ];

  if (alerts.length === 0) return null;

  return (
    <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-2">
            {alerts.map((alert, idx) => (
              <p key={idx} className={cn(
                "text-sm",
                alert.type === "warning" ? "text-amber-800 dark:text-amber-200" : "text-muted-foreground"
              )}>
                {alert.message}
              </p>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
