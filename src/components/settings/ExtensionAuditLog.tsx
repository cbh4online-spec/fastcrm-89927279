import { useExtensionAuditLog } from "@/hooks/useExtensionAuditLog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink, Shield } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

export function ExtensionAuditLog() {
  const { data: logs, isLoading } = useExtensionAuditLog();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-muted-foreground" />
                Extensões — Registo de Atividade
              </CardTitle>
              <CardDescription>
                Histórico de ativação e desativação de extensões no workspace.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate("/marketplace")} className="gap-1.5">
              <ExternalLink className="h-3.5 w-3.5" />
              Marketplace
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !logs || logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma atividade de extensões registada.
            </p>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg border border-border/50 bg-muted/20"
                >
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={log.action === "enable" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {log.action === "enable" ? "Ativada" : "Desativada"}
                    </Badge>
                    <span className="text-sm font-medium">
                      {(log.metadata as any)?.module_name || log.extension_key}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(log.created_at), "d MMM yyyy, HH:mm", { locale: pt })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
