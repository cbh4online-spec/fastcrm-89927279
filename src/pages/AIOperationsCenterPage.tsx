import { useNavigate } from "react-router-dom";
import { useAIOperationsCenter, SystemState, SystemStatus } from "@/hooks/useAIOperationsCenter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import {
  RefreshCw,
  Bot,
  TrendingUp,
  Volume2,
  Brain,
  Timer,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ExternalLink,
  Loader2,
  Activity,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

const statusConfig: Record<SystemStatus, { color: string; icon: typeof CheckCircle2; label: string }> = {
  operational: { color: "text-success", icon: CheckCircle2, label: "Operacional" },
  degraded: { color: "text-warning", icon: AlertTriangle, label: "Degradado" },
  down: { color: "text-destructive", icon: XCircle, label: "Inactivo" },
  unknown: { color: "text-muted-foreground", icon: HelpCircle, label: "Sem dados" },
};

const systemIcons: Record<string, typeof Bot> = {
  agents: Bot,
  imo: TrendingUp,
  voice: Volume2,
  claude: Brain,
  trigger: Timer,
};

const systemLinks: Record<string, { path: string; label: string }> = {
  agents: { path: "/dashboard/ai-agents", label: "AI Agents" },
  imo: { path: "/dashboard/imo-ai", label: "IMO AI" },
  voice: { path: "/dashboard/settings", label: "Voice Settings" },
  claude: { path: "/dashboard/ai-usage", label: "AI Usage" },
  trigger: { path: "/dashboard/background-jobs", label: "Background Jobs" },
};

function StatusDot({ status }: { status: SystemStatus }) {
  const cfg = statusConfig[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", cfg.color)}>
      <span className={cn(
        "h-2 w-2 rounded-full",
        status === "operational" && "bg-success",
        status === "degraded" && "bg-warning",
        status === "down" && "bg-destructive",
        status === "unknown" && "bg-muted-foreground",
      )} />
      {cfg.label}
    </span>
  );
}

function SystemKPICard({ sysKey, state }: { sysKey: string; state: SystemState }) {
  const navigate = useNavigate();
  const Icon = systemIcons[sysKey] ?? Activity;
  const link = systemLinks[sysKey];
  const primaryMetric = Object.entries(state.metrics)[0];

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="pb-2 flex flex-row items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-medium">{state.label}</CardTitle>
            <StatusDot status={state.status} />
          </div>
        </div>
        {link && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => navigate(link.path)}
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {primaryMetric && (
          <p className="text-2xl font-bold">{primaryMetric[1]}</p>
        )}
        {primaryMetric && (
          <p className="text-xs text-muted-foreground mt-0.5">{primaryMetric[0]}</p>
        )}
        {state.lastActivity && (
          <p className="text-xs text-muted-foreground mt-2">
            Última: {formatDistanceToNow(new Date(state.lastActivity), { addSuffix: true, locale: pt })}
          </p>
        )}
        {state.alerts.length > 0 && (
          <div className="mt-2">
            {state.alerts.map((a, i) => (
              <Badge key={i} variant="destructive" className="text-[10px]">{a}</Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MetricsTable({ metrics }: { metrics: Record<string, string | number> }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {Object.entries(metrics).map(([key, val]) => (
        <div key={key} className="bg-muted/50 rounded-lg px-3 py-2">
          <p className="text-xs text-muted-foreground">{key}</p>
          <p className="text-sm font-semibold">{val}</p>
        </div>
      ))}
    </div>
  );
}

function SystemDetailTab({ sysKey, state }: { sysKey: string; state: SystemState }) {
  const navigate = useNavigate();
  const link = systemLinks[sysKey];
  const cfg = statusConfig[state.status];
  const StatusIcon = cfg.icon;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <StatusIcon className={cn("h-5 w-5", cfg.color)} />
          <div>
            <h3 className="font-semibold">{state.label}</h3>
            <StatusDot status={state.status} />
          </div>
        </div>
        {link && (
          <Button variant="outline" size="sm" onClick={() => navigate(link.path)}>
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
            {link.label}
          </Button>
        )}
      </div>

      <MetricsTable metrics={state.metrics} />

      {state.alerts.length > 0 && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="py-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
              <div className="space-y-1">
                {state.alerts.map((a, i) => (
                  <p key={i} className="text-sm text-warning">{a}</p>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {state.lastActivity && (
        <p className="text-sm text-muted-foreground">
          Última actividade: {formatDistanceToNow(new Date(state.lastActivity), { addSuffix: true, locale: pt })}
        </p>
      )}
    </div>
  );
}

export default function AIOperationsCenterPage() {
  const ops = useAIOperationsCenter();
  const systems = [
    { key: "agents", state: ops.agents },
    { key: "imo", state: ops.imo },
    { key: "voice", state: ops.voice },
    { key: "claude", state: ops.claude },
    { key: "trigger", state: ops.trigger },
  ];

  const totalAlerts = systems.reduce((s, sys) => s + sys.state.alerts.length, 0);
  const allOperational = systems.every(s => s.state.status === "operational");

  const navigate = useNavigate();

  return (
    <DashboardLayout>
    <div className="space-y-6 p-6">
      {/* Voltar */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/dashboard")}
        className="gap-2 -ml-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Button>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            AI Operations Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Estado em tempo real dos 5 sistemas de IA
          </p>
        </div>
        <div className="flex items-center gap-3">
          {totalAlerts > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              {totalAlerts} alerta{totalAlerts > 1 ? "s" : ""}
            </Badge>
          )}
          {allOperational && (
            <Badge variant="outline" className="text-success border-success/30 gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Todos operacionais
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={ops.refetchAll}
            disabled={ops.isLoading}
          >
            {ops.isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1.5" />
            )}
            Actualizar
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {systems.map(({ key, state }) => (
          <SystemKPICard key={key} sysKey={key} state={state} />
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="imo">IMO</TabsTrigger>
          <TabsTrigger value="voice">Voice</TabsTrigger>
          <TabsTrigger value="claude">Claude</TabsTrigger>
          <TabsTrigger value="trigger">Trigger.dev</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Visão Geral</CardTitle>
              <CardDescription>Estado agregado de todos os sistemas de IA</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[500px]">
                <div className="space-y-6">
                  {systems.map(({ key, state }) => (
                    <SystemDetailTab key={key} sysKey={key} state={state} />
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {systems.map(({ key, state }) => (
          <TabsContent key={key} value={key}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{state.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <SystemDetailTab sysKey={key} state={state} />
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
    </DashboardLayout>
  );
}
