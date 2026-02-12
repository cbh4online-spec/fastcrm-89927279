import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWhatsAppConnection, useDisconnectWhatsApp } from "@/hooks/useWhatsAppConnection";

export function WhatsAppConnectionCard() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const { data: connection, isLoading } = useWhatsAppConnection();
  const disconnectMutation = useDisconnectWhatsApp();
  const [isConnecting, setIsConnecting] = useState(false);

  // Check URL params for connection result
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("whatsapp_connected") === "true") {
      toast.success("WhatsApp conectado com sucesso!");
      window.history.replaceState({}, "", window.location.pathname);
    }
    if (params.get("whatsapp_error")) {
      const errorMsg = params.get("whatsapp_error");
      const messages: Record<string, string> = {
        no_waba_found: "Nenhuma conta WhatsApp Business encontrada",
        connection_failed: "Falha na conexão",
        missing_params: "Parâmetros em falta",
        invalid_state: "Estado inválido",
      };
      toast.error(messages[errorMsg || ""] || `Erro: ${errorMsg}`);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const handleConnect = async () => {
    if (!currentWorkspace || !user) return;
    setIsConnecting(true);

    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-auth-url", {
        body: { workspaceId: currentWorkspace.id, userId: user.id },
      });

      if (error) throw error;
      if (data?.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error("Error getting WhatsApp auth URL:", error);
      toast.error("Erro ao iniciar conexão com WhatsApp");
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!connection) return;
    try {
      await disconnectMutation.mutateAsync(connection.id);
      toast.success("WhatsApp desconectado");
    } catch (error) {
      toast.error("Erro ao desconectar WhatsApp");
    }
  };

  const isTokenExpired = connection?.token_expires_at
    ? new Date(connection.token_expires_at) < new Date()
    : false;

  const isActive = connection?.is_active && !isTokenExpired;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-500/10">
            <Phone className="h-6 w-6 text-green-600" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">WhatsApp Business</CardTitle>
            <CardDescription>
              Receba e envie mensagens do WhatsApp diretamente no inbox
            </CardDescription>
          </div>
          {isActive && (
            <Badge variant="default" className="bg-success text-success-foreground">
              <CheckCircle className="h-3 w-3 mr-1" />
              Conectado
            </Badge>
          )}
          {connection?.is_active && isTokenExpired && (
            <Badge variant="destructive">
              <XCircle className="h-3 w-3 mr-1" />
              Token Expirado
            </Badge>
          )}
          {connection && !connection.is_active && (
            <Badge variant="secondary">Desconectado</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isActive ? (
          <>
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Número conectado:</span>
                <span className="text-sm font-medium">
                  {connection?.display_phone_number || "N/A"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Token expira em:</span>
                <span className="text-sm">
                  {connection?.token_expires_at
                    ? new Date(connection.token_expires_at).toLocaleDateString("pt-PT")
                    : "N/A"}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleConnect} disabled={isConnecting}>
                {isConnecting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Reconectar
              </Button>
              <Button
                variant="destructive"
                onClick={handleDisconnect}
                disabled={disconnectMutation.isPending}
              >
                {disconnectMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Desconectar
              </Button>
            </div>
          </>
        ) : isTokenExpired ? (
          <div className="space-y-4">
            <p className="text-sm text-destructive">
              O token de acesso expirou. Reconecte para continuar a receber mensagens.
            </p>
            <Button onClick={handleConnect} disabled={isConnecting}>
              {isConnecting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Reconectar WhatsApp
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground space-y-2">
              <p>Ao conectar, você poderá:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Receber mensagens do WhatsApp no inbox</li>
                <li>Responder a clientes diretamente</li>
                <li>Ver histórico de conversas</li>
              </ul>
            </div>
            <Button onClick={handleConnect} disabled={isConnecting}>
              {isConnecting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Phone className="h-4 w-4 mr-2" />
              Conectar WhatsApp
            </Button>
            <p className="text-xs text-muted-foreground">
              Requer uma conta WhatsApp Business com acesso à API Cloud.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
