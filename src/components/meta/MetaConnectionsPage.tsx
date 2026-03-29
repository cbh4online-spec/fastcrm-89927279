import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  useMetaConnections,
  useMetaAssets,
  useToggleAsset,
  useMetaOAuthStart,
  useInstagramOAuthStart,
  useSyncAssets,
  useDeleteConnection,
} from "@/hooks/useMetaConnections";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Link2, RefreshCw, Trash2, ExternalLink, Facebook, Instagram, FileText,
  CheckCircle2, AlertTriangle, XCircle, Loader2, ChevronDown, ShieldAlert,
} from "lucide-react";

const ERROR_MESSAGES: Record<string, { title: string; description: string }> = {
  token_exchange_failed: {
    title: "Falha na troca de token",
    description: "Não foi possível completar a autenticação com o Facebook. Isto pode acontecer se a sessão expirou ou se as permissões foram recusadas. Tente ligar novamente.",
  },
  db_error: {
    title: "Erro ao guardar a ligação",
    description: "A autenticação com o Facebook foi bem-sucedida, mas ocorreu um erro ao guardar os dados. Tente ligar a conta novamente.",
  },
  OAuthException: {
    title: "O Facebook recusou o acesso",
    description: "O Facebook devolveu um erro de autorização. Verifique se a aplicação Meta tem as permissões corretas e se o Redirect URI está configurado.",
  },
  unexpected: {
    title: "Erro inesperado",
    description: "Ocorreu um erro inesperado durante a autenticação. Se o problema persistir, contacte o suporte.",
  },
  ig_token_exchange_failed: {
    title: "Falha na troca de token Instagram",
    description: "Não foi possível completar a autenticação com o Instagram. Verifique se a app Instagram está corretamente configurada no Meta Developers Portal.",
  },
  ig_db_error: {
    title: "Erro ao guardar a ligação Instagram",
    description: "A autenticação com o Instagram foi bem-sucedida, mas ocorreu um erro ao guardar os dados. Tente ligar novamente.",
  },
  ig_unexpected: {
    title: "Erro inesperado (Instagram)",
    description: "Ocorreu um erro inesperado durante a autenticação Instagram. Se o problema persistir, contacte o suporte.",
  },
};

const assetIcons: Record<string, React.ElementType> = {
  page: Facebook,
  instagram_account: Instagram,
  lead_form: FileText,
  ad_account: FileText,
  pixel: FileText,
};

const statusBadge: Record<string, { variant: "default" | "destructive" | "outline" | "secondary"; label: string }> = {
  active: { variant: "default", label: "Ativo" },
  warning: { variant: "secondary", label: "Aviso" },
  error: { variant: "destructive", label: "Erro" },
  expired: { variant: "destructive", label: "Expirado" },
  revoked: { variant: "destructive", label: "Revogado" },
};

export function MetaConnectionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const { data: connections = [], isLoading } = useMetaConnections();
  const { data: assets = [] } = useMetaAssets();
  const oauthStart = useMetaOAuthStart();
  const igOauthStart = useInstagramOAuthStart();
  const syncAssets = useSyncAssets();
  const deleteConnection = useDeleteConnection();
  const toggleAsset = useToggleAsset();
  const [expandedConn, setExpandedConn] = useState<string | null>(null);

  const errorCode = searchParams.get("error");
  const errorInfo = errorCode
    ? ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.unexpected
    : null;

  const dismissError = () => {
    searchParams.delete("error");
    setSearchParams(searchParams, { replace: true });
  };

  const handleConnect = async () => {
    if (!currentWorkspace?.id || !user?.id) return;
    try {
      const data = await oauthStart.mutateAsync({
        workspaceId: currentWorkspace.id,
        userId: user.id,
      });
      if (data?.auth_url) {
        window.location.href = data.auth_url;
      }
    } catch (err) {
      toast.error("Falha ao iniciar autenticação Meta");
    }
  };

  const handleConnectInstagram = async () => {
    if (!currentWorkspace?.id || !user?.id) return;
    try {
      const data = await igOauthStart.mutateAsync({
        workspaceId: currentWorkspace.id,
        userId: user.id,
      });
      if (data?.auth_url) {
        window.location.href = data.auth_url;
      }
    } catch (err) {
      toast.error("Falha ao iniciar autenticação Instagram");
    }
  };

  const handleSync = (connectionId: string) => {
    if (!currentWorkspace?.id) return;
    syncAssets.mutate({ connectionId, workspaceId: currentWorkspace.id });
  };

  const handleDelete = (connectionId: string) => {
    if (confirm("Tem certeza que deseja remover esta ligação? Todos os ativos associados serão removidos.")) {
      deleteConnection.mutate(connectionId);
    }
  };

  const connectionAssets = (connectionId: string) =>
    assets.filter((a: any) => a.connection_id === connectionId);

  return (
    <div className="space-y-6">
      {/* OAuth error banner */}
      {errorInfo && errorCode && (
        <Alert variant="destructive" className="border-destructive/50 bg-destructive/5">
          <ShieldAlert className="h-5 w-5" />
          <AlertTitle className="text-base font-semibold">{errorInfo.title}</AlertTitle>
          <AlertDescription className="mt-2 space-y-3">
            <p className="text-sm">{errorInfo.description}</p>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleConnect} disabled={oauthStart.isPending}>
                {oauthStart.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Link2 className="w-4 h-4 mr-2" />}
                Tentar novamente
              </Button>
              <Button size="sm" variant="outline" onClick={dismissError}>
                Dispensar
              </Button>
            </div>
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground px-0 h-auto">
                  <ChevronDown className="w-3 h-3 mr-1" />
                  Detalhes técnicos
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 p-3 rounded-md bg-muted/50 text-xs text-muted-foreground space-y-1">
                <p><strong>Código:</strong> {errorCode}</p>
                <p>Verifique no portal Meta Developers:</p>
                <ul className="list-disc ml-4 space-y-0.5">
                  <li>Facebook Login → Settings → Valid OAuth Redirect URIs</li>
                  <li>Permissões da app (pages_show_list, instagram_basic, leads_retrieval, ads_read)</li>
                  <li>Client OAuth Login e Web OAuth Login estão ativados</li>
                </ul>
              </CollapsibleContent>
            </Collapsible>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Ligações Meta</h2>
          <p className="text-sm text-muted-foreground">Gerir contas Facebook e Instagram ligadas</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleConnect} disabled={oauthStart.isPending}>
            {oauthStart.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Facebook className="w-4 h-4 mr-2" />}
            Ligar Conta Meta
          </Button>
          <Button variant="outline" onClick={handleConnectInstagram} disabled={igOauthStart.isPending}>
            {igOauthStart.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Instagram className="w-4 h-4 mr-2" />}
            Ligar Conta Instagram
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && connections.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Facebook className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold">Sem contas ligadas</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              Clique em "Ligar Conta Meta" para autenticar com Facebook e descobrir as suas Pages, contas Instagram e formulários de Lead Ads.
            </p>
          </CardContent>
        </Card>
      )}

      {connections.map((conn: any) => {
        const connAssets = connectionAssets(conn.id);
        const isExpanded = expandedConn === conn.id;
        const badge = statusBadge[conn.status] || statusBadge.active;

        return (
          <Card key={conn.id}>
            <CardHeader className="cursor-pointer" onClick={() => setExpandedConn(isExpanded ? null : conn.id)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${conn.status === "active" ? "bg-green-500" : conn.status === "warning" ? "bg-yellow-500" : "bg-red-500"}`} />
                  <div>
                    <CardTitle className="text-base">{conn.connection_name || "Meta Connection"}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {conn.provider} · Última verificação: {conn.last_healthcheck_at ? new Date(conn.last_healthcheck_at).toLocaleDateString("pt-PT") : "Nunca"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleSync(conn.id); }} disabled={syncAssets.isPending}>
                    <RefreshCw className={`w-4 h-4 ${syncAssets.isPending ? "animate-spin" : ""}`} />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDelete(conn.id); }}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            {isExpanded && (
              <CardContent>
                {/* Health details */}
                {conn.health_details_json && (
                  <div className="mb-4 p-3 rounded-lg bg-muted/30 text-sm space-y-1">
                    <div className="flex items-center gap-2">
                      {conn.health_details_json.token_valid ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-destructive" />
                      )}
                      <span>Token: {conn.health_details_json.token_valid ? "Válido" : "Inválido"}</span>
                      {conn.health_details_json.token_expires_in_days != null && (
                        <span className="text-muted-foreground">
                          (expira em {conn.health_details_json.token_expires_in_days} dias)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {conn.health_details_json.permissions_ok ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                      )}
                      <span>Permissões: {conn.health_details_json.permissions_ok ? "OK" : "Incompletas"}</span>
                    </div>
                    {conn.health_details_json.missing_scopes?.length > 0 && (
                      <div className="text-xs text-yellow-600 ml-6">
                        Em falta: {conn.health_details_json.missing_scopes.join(", ")}
                      </div>
                    )}
                  </div>
                )}

                {/* Assets */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Ativos descobertos ({connAssets.length})</h4>
                  {connAssets.length === 0 && (
                    <p className="text-sm text-muted-foreground">Nenhum ativo encontrado. Tente sincronizar.</p>
                  )}
                  {connAssets.map((asset: any) => {
                    const Icon = assetIcons[asset.asset_type] || FileText;
                    return (
                      <div
                        key={asset.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-border bg-background"
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{asset.asset_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {asset.asset_type.replace("_", " ")} · {asset.asset_id_external}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">
                            {asset.selected_for_use ? "Ativo" : "Inativo"}
                          </span>
                          <Switch
                            checked={asset.selected_for_use}
                            onCheckedChange={(checked) =>
                              toggleAsset.mutate({ assetId: asset.id, selected: checked })
                            }
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
