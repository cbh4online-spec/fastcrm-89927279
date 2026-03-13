import { useDependencyHealth } from "@/hooks/useDependencyHealth";
import { DependencyGraph } from "@/components/system/DependencyGraph";
import { DependencyHealthIndicator } from "@/components/system/DependencyHealthIndicator";
import { CircuitBreakerBadge } from "@/components/system/CircuitBreakerBadge";
import { circuitBreaker } from "@/services/circuit-breaker";
import { dependencyCache } from "@/services/dependency-cache";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Trash2, Activity, Database, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function DependenciesPage() {
  const { overallHealth, modules, totalCacheSize } = useDependencyHealth();
  const cacheMetrics = dependencyCache.getAllMetrics();

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="h-6 w-6" />
            Resiliência de Dependências
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Monitorização de circuit breakers, cache e saúde dos módulos
          </p>
        </div>
        <DependencyHealthIndicator />
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Activity className="h-4 w-4" /> Estado Geral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge
              variant={overallHealth === "healthy" ? "default" : overallHealth === "degraded" ? "secondary" : "destructive"}
              className="text-sm"
            >
              {overallHealth === "healthy" ? "✅ Saudável" : overallHealth === "degraded" ? "⚠️ Degradado" : "🔴 Crítico"}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Database className="h-4 w-4" /> Cache
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{totalCacheSize}</p>
            <p className="text-xs text-muted-foreground">entradas em cache</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Módulos Monitorizados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{modules.length}</p>
            <p className="text-xs text-muted-foreground">
              {modules.filter((m) => m.state !== "CLOSED").length} com problemas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Dependency Graph */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Grafo de Dependências</CardTitle>
        </CardHeader>
        <CardContent>
          <DependencyGraph />
        </CardContent>
      </Card>

      {/* Circuit Breakers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Circuit Breakers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {modules.map((m) => (
              <div
                key={m.moduleId}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3">
                  <CircuitBreakerBadge state={m.state} moduleId={m.moduleId} />
                  <div>
                    <p className="font-medium text-sm text-foreground">{m.displayName}</p>
                    <p className="text-xs text-muted-foreground">{m.failureCount} falhas</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    circuitBreaker.reset(m.moduleId);
                    toast.success(`Circuit breaker "${m.displayName}" resetado`);
                  }}
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1" /> Reset
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cache Metrics */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Métricas de Cache</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              dependencyCache.clearAll();
              toast.success("Cache limpo");
            }}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Limpar Cache
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground text-left">
                  <th className="py-2 pr-4">Módulo</th>
                  <th className="py-2 pr-4">Hits</th>
                  <th className="py-2 pr-4">Misses</th>
                  <th className="py-2 pr-4">Hit Rate</th>
                  <th className="py-2">Entradas</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(cacheMetrics).map(([moduleId, m]) => {
                  const total = m.hits + m.misses;
                  const hitRate = total > 0 ? ((m.hits / total) * 100).toFixed(1) : "—";
                  return (
                    <tr key={moduleId} className="border-b border-border/50">
                      <td className="py-2 pr-4 font-medium text-foreground">{moduleId}</td>
                      <td className="py-2 pr-4 text-green-600">{m.hits}</td>
                      <td className="py-2 pr-4 text-amber-600">{m.misses}</td>
                      <td className="py-2 pr-4">{hitRate}%</td>
                      <td className="py-2">{m.entryCount}</td>
                    </tr>
                  );
                })}
                {Object.keys(cacheMetrics).length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-muted-foreground">
                      Sem dados de cache ainda
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
