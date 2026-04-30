import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw, Loader2, Cloud } from "lucide-react";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";

type HealthState = "checking" | "healthy" | "degraded" | "unhealthy";

interface HealthResult {
  state: HealthState;
  latencyMs: number | null;
  message: string;
  checkedAt: Date | null;
}

/**
 * Valida automaticamente a Supabase resolvida pelo Control Plane (via WorkspaceInstanceContext)
 * para o workspace ativo, e mostra um badge com o estado de saúde + latência.
 */
export function WorkspaceInstanceHealthBadge() {
  const {
    workspaceClient,
    instanceData,
    workspaceStatus,
    isLoading,
    error,
    isUsingControlPlane,
    refreshInstance,
  } = useWorkspaceInstance();

  const [health, setHealth] = useState<HealthResult>({
    state: "checking",
    latencyMs: null,
    message: "A validar instância...",
    checkedAt: null,
  });

  const runHealthCheck = async () => {
    setHealth((h) => ({ ...h, state: "checking", message: "A validar instância..." }));
    const start = performance.now();
    try {
      // Ping leve: select 1 linha de uma tabela pública pequena
      const { error: pingErr } = await workspaceClient
        .from("workspace_members")
        .select("id", { head: true, count: "exact" })
        .limit(1);

      const latency = Math.round(performance.now() - start);

      if (pingErr) {
        setHealth({
          state: "unhealthy",
          latencyMs: latency,
          message: pingErr.message,
          checkedAt: new Date(),
        });
        return;
      }

      const state: HealthState = latency > 1500 ? "degraded" : "healthy";
      setHealth({
        state,
        latencyMs: latency,
        message: state === "healthy" ? "Instância saudável" : "Latência elevada",
        checkedAt: new Date(),
      });
    } catch (e: any) {
      setHealth({
        state: "unhealthy",
        latencyMs: Math.round(performance.now() - start),
        message: e?.message ?? "Falha desconhecida",
        checkedAt: new Date(),
      });
    }
  };

  useEffect(() => {
    if (isLoading) return;
    runHealthCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, instanceData?.id, workspaceClient]);

  const variant = (() => {
    if (isLoading || health.state === "checking") return { cls: "bg-muted text-muted-foreground", Icon: Loader2, spin: true, label: "A validar..." };
    if (error) return { cls: "bg-destructive/10 text-destructive border-destructive/30", Icon: XCircle, spin: false, label: "Control Plane: erro" };
    if (health.state === "unhealthy") return { cls: "bg-destructive/10 text-destructive border-destructive/30", Icon: XCircle, spin: false, label: "Instância indisponível" };
    if (health.state === "degraded") return { cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30", Icon: AlertTriangle, spin: false, label: "Instância degradada" };
    return { cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30", Icon: CheckCircle2, spin: false, label: "Instância saudável" };
  })();

  const Icon = variant.Icon;
  const sourceLabel = isUsingControlPlane ? "Control Plane" : "Supabase principal";
  const host = (() => {
    try {
      const url = instanceData?.supabase_url ?? import.meta.env.VITE_SUPABASE_URL;
      return url ? new URL(url).host : "—";
    } catch { return "—"; }
  })();

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className={`gap-1.5 px-2.5 py-1 ${variant.cls}`}>
              <Icon className={`h-3.5 w-3.5 ${variant.spin ? "animate-spin" : ""}`} />
              <span className="text-xs font-medium">{variant.label}</span>
              {health.latencyMs != null && health.state !== "checking" && (
                <span className="text-[10px] opacity-70">· {health.latencyMs}ms</span>
              )}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-1 font-semibold">
                <Cloud className="h-3 w-3" /> {sourceLabel}
              </div>
              <div><span className="text-muted-foreground">Host:</span> {host}</div>
              <div><span className="text-muted-foreground">Estado workspace:</span> {workspaceStatus ?? "—"}</div>
              <div><span className="text-muted-foreground">Mensagem:</span> {health.message}</div>
              {health.checkedAt && (
                <div className="text-muted-foreground">
                  Verificado às {health.checkedAt.toLocaleTimeString("pt-PT")}
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2"
          onClick={async () => { await refreshInstance(); runHealthCheck(); }}
          title="Revalidar instância"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>
    </TooltipProvider>
  );
}
