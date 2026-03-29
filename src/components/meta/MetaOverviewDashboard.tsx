import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMetaConnections, useMetaAssets } from "@/hooks/useMetaConnections";
import { useMetaLeadStats } from "@/hooks/useMetaLeads";
import { Link2, Users, MessageSquare, Activity, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

const healthColors: Record<string, string> = {
  healthy: "text-green-500",
  degraded: "text-yellow-500",
  unhealthy: "text-red-500",
  unknown: "text-muted-foreground",
};

const healthLabels: Record<string, string> = {
  healthy: "Saudável",
  degraded: "Degradado",
  unhealthy: "Com problemas",
  unknown: "Desconhecido",
};

export function MetaOverviewDashboard() {
  const { data: connections = [], isLoading: loadingConns } = useMetaConnections();
  const { data: assets = [] } = useMetaAssets();
  const { data: leadStats } = useMetaLeadStats();

  const activeConnections = connections.filter((c: any) => c.status === "active");
  const activeAssets = assets.filter((a: any) => a.selected_for_use);
  const healthyCount = connections.filter((c: any) => c.health_status === "healthy").length;
  const warningCount = connections.filter((c: any) => ["warning", "degraded"].includes(c.health_status)).length;
  const errorCount = connections.filter((c: any) => ["error", "unhealthy", "expired", "revoked"].includes(c.health_status || c.status)).length;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ligações Ativas</CardTitle>
            <Link2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeConnections.length}</div>
            <p className="text-xs text-muted-foreground">{activeAssets.length} ativos selecionados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Leads Recebidos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leadStats?.total || 0}</div>
            <div className="flex gap-2 mt-1">
              {(leadStats?.pending || 0) > 0 && (
                <Badge variant="outline" className="text-xs">
                  {leadStats?.pending} pendentes
                </Badge>
              )}
              {(leadStats?.failed || 0) > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {leadStats?.failed} falhados
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Processados</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{leadStats?.processed || 0}</div>
            <p className="text-xs text-muted-foreground">contactos criados/atualizados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saúde Global</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {errorCount > 0 ? (
                <XCircle className="h-5 w-5 text-destructive" />
              ) : warningCount > 0 ? (
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              )}
              <span className="text-lg font-semibold">
                {errorCount > 0 ? "Atenção" : warningCount > 0 ? "Avisos" : "OK"}
              </span>
            </div>
            <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
              <span className="text-green-500">{healthyCount} ok</span>
              {warningCount > 0 && <span className="text-yellow-500">{warningCount} avisos</span>}
              {errorCount > 0 && <span className="text-destructive">{errorCount} erros</span>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status overview */}
      {connections.length === 0 && !loadingConns && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Link2 className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold">Nenhuma conta Meta ligada</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              Ligue a sua conta Facebook/Instagram para começar a receber leads, mensagens e gerir o seu engagement social.
            </p>
            <a
              href="/dashboard/meta/connections"
              className="mt-4 inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Ligar Conta Meta
            </a>
          </CardContent>
        </Card>
      )}

      {connections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ligações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {connections.map((conn: any) => (
                <div key={conn.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${conn.status === "active" ? "bg-green-500" : conn.status === "warning" ? "bg-yellow-500" : "bg-red-500"}`} />
                    <div>
                      <p className="text-sm font-medium">{conn.connection_name || "Meta Connection"}</p>
                      <p className="text-xs text-muted-foreground">
                        {conn.provider} · {healthLabels[conn.health_status] || "Desconhecido"}
                      </p>
                    </div>
                  </div>
                  <Badge variant={conn.status === "active" ? "default" : "destructive"} className="text-xs">
                    {conn.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
