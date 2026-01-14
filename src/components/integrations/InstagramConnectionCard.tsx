import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Instagram, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface InstagramConnection {
  id: string;
  instagram_username: string | null;
  is_active: boolean;
  token_expires_at: string | null;
  created_at: string;
}

export function InstagramConnectionCard() {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();
  const { user } = useAuth();
  const [connection, setConnection] = useState<InstagramConnection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Check URL params for connection result
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("instagram_connected") === "true") {
      toast.success("Instagram conectado com sucesso!");
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
    }
    if (params.get("instagram_error")) {
      toast.error("Erro ao conectar Instagram: " + params.get("instagram_error"));
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Fetch connection status
  useEffect(() => {
    async function fetchConnection() {
      if (!currentWorkspace) return;

      try {
        const { data, error } = await workspaceClient
          .from("instagram_connections")
          .select("id, instagram_username, is_active, token_expires_at, created_at")
          .eq("workspace_id", currentWorkspace.id)
          .maybeSingle();

        if (error) throw error;
        setConnection(data);
      } catch (error) {
        console.error("Error fetching Instagram connection:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchConnection();
  }, [currentWorkspace, workspaceClient]);

  const handleConnect = async () => {
    if (!currentWorkspace || !user) return;
    setIsConnecting(true);

    try {
      // Call edge function to get the OAuth URL
      const { data, error } = await supabase.functions.invoke("instagram-auth-url", {
        body: {
          workspaceId: currentWorkspace.id,
          userId: user.id,
        },
      });

      if (error) throw error;
      if (data?.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error("Error getting auth URL:", error);
      toast.error("Erro ao iniciar conexão com Instagram");
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!connection || !currentWorkspace) return;
    setIsDisconnecting(true);

    try {
      const { error } = await workspaceClient
        .from("instagram_connections")
        .update({ is_active: false })
        .eq("id", connection.id);

      if (error) throw error;

      setConnection((prev) => prev ? { ...prev, is_active: false } : null);
      toast.success("Instagram desconectado");
    } catch (error) {
      console.error("Error disconnecting Instagram:", error);
      toast.error("Erro ao desconectar Instagram");
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleReconnect = () => {
    handleConnect();
  };

  const isTokenExpired = connection?.token_expires_at
    ? new Date(connection.token_expires_at) < new Date()
    : false;

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
          <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
            <Instagram className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">Instagram Direct Messages</CardTitle>
            <CardDescription>
              Receba e envie mensagens do Instagram diretamente no inbox
            </CardDescription>
          </div>
          {connection?.is_active && !isTokenExpired && (
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
        {connection?.is_active && !isTokenExpired ? (
          <>
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Conta conectada:</span>
                <span className="text-sm font-medium">
                  @{connection.instagram_username || "Instagram User"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Token expira em:</span>
                <span className="text-sm">
                  {connection.token_expires_at
                    ? new Date(connection.token_expires_at).toLocaleDateString("pt-PT")
                    : "N/A"}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleReconnect}
                disabled={isConnecting}
              >
                {isConnecting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Reconectar
              </Button>
              <Button
                variant="destructive"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
              >
                {isDisconnecting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Desconectar
              </Button>
            </div>
          </>
        ) : isTokenExpired ? (
          <div className="space-y-4">
            <p className="text-sm text-destructive">
              O token de acesso expirou. Reconecte para continuar a receber mensagens.
            </p>
            <Button onClick={handleReconnect} disabled={isConnecting}>
              {isConnecting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Reconectar Instagram
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground space-y-2">
              <p>Ao conectar, você poderá:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Receber mensagens do Instagram no inbox</li>
                <li>Responder a clientes diretamente</li>
                <li>Ver histórico de conversas</li>
              </ul>
            </div>
            <Button onClick={handleConnect} disabled={isConnecting}>
              {isConnecting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Instagram className="h-4 w-4 mr-2" />
              Conectar Instagram
            </Button>
            <p className="text-xs text-muted-foreground">
              Requer uma conta Instagram Business ou Creator conectada a uma Página Facebook.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
