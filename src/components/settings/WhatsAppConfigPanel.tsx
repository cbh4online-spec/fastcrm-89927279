import { useState } from "react";
import { useWhatsAppConnection, useDisconnectWhatsApp } from "@/hooks/useWhatsAppConnection";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Phone, Loader2, ExternalLink, Unplug, UserPlus, Bot, Shield } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

export function WhatsAppConfigPanel() {
  const { data: connection, isLoading } = useWhatsAppConnection();
  const disconnectMutation = useDisconnectWhatsApp();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTogglingLeads, setIsTogglingLeads] = useState(false);

  const handleConnect = async () => {
    if (!currentWorkspace?.id) return;
    setIsConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-auth-url", {
        body: { workspace_id: currentWorkspace.id },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
        toast.info("Complete a autorização na janela aberta");
      }
    } catch (err: any) {
      toast.error("Erro ao iniciar conexão: " + err.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!connection?.id) return;
    try {
      await disconnectMutation.mutateAsync(connection.id);
      toast.success("WhatsApp desconectado");
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    }
  };

  const handleToggleAutoLeads = async (enabled: boolean) => {
    if (!connection?.id) return;
    setIsTogglingLeads(true);
    try {
      const { error } = await workspaceClient
        .from("whatsapp_connections")
        .update({ auto_create_leads: enabled })
        .eq("id", connection.id);
      if (error) throw error;
      toast.success(enabled ? "Criação automática de leads ativada" : "Criação automática de leads desativada");
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    } finally {
      setIsTogglingLeads(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isConnected = connection?.is_active;
  const tokenExpiry = connection?.token_expires_at
    ? new Date(connection.token_expires_at)
    : null;
  const isTokenExpired = tokenExpiry && tokenExpiry < new Date();

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <div className="flex items-center justify-between p-4 border border-border rounded-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-500/10">
            <Phone className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium">WhatsApp Business API</p>
              {isConnected ? (
                <Badge className="bg-emerald-500 text-white text-[10px]">Conectado</Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px]">Desconectado</Badge>
              )}
            </div>
            {isConnected && connection?.display_phone_number && (
              <p className="text-sm text-muted-foreground">
                {connection.display_phone_number}
              </p>
            )}
          </div>
        </div>

        {isConnected ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive">
                <Unplug className="h-3.5 w-3.5" />
                Desconectar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Desconectar WhatsApp?</AlertDialogTitle>
                <AlertDialogDescription>
                  O Auto-Pilot e as mensagens automáticas serão interrompidos. Poderá reconectar a qualquer momento.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDisconnect} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Desconectar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <Button onClick={handleConnect} disabled={isConnecting} size="sm" className="gap-1.5">
            {isConnecting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ExternalLink className="h-3.5 w-3.5" />
            )}
            Conectar via Meta
          </Button>
        )}
      </div>

      {/* Token warning */}
      {isConnected && isTokenExpired && (
        <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center gap-2 text-sm text-amber-600">
            <Shield className="h-4 w-4 flex-shrink-0" />
            <span>Token expirado. Reconecte para renovar o acesso.</span>
          </div>
        </div>
      )}

      {/* Settings (only when connected) */}
      {isConnected && (
        <>
          <Separator />

          <div className="space-y-4">
            {/* Auto-create leads toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <UserPlus className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-sm font-medium">Criar leads automaticamente</Label>
                  <p className="text-xs text-muted-foreground">
                    Criar lead no CRM quando recebe mensagem de número novo
                  </p>
                </div>
              </div>
              <Switch
                checked={(connection as any)?.auto_create_leads !== false}
                onCheckedChange={handleToggleAutoLeads}
                disabled={isTogglingLeads}
              />
            </div>

            {/* Autopilot link */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bot className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-sm font-medium">Auto-Pilot IA</Label>
                  <p className="text-xs text-muted-foreground">
                    Respostas automáticas por IA nas conversas WhatsApp
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/dashboard/conversational-engine">
                  Configurar
                </Link>
              </Button>
            </div>
          </div>

          <Separator />

          {/* Technical details */}
          <div className="space-y-2 text-xs text-muted-foreground">
            {connection?.phone_number_id && (
              <div className="flex justify-between">
                <span>Phone Number ID</span>
                <span className="font-mono">{connection.phone_number_id}</span>
              </div>
            )}
            {connection?.waba_id && (
              <div className="flex justify-between">
                <span>WABA ID</span>
                <span className="font-mono">{connection.waba_id}</span>
              </div>
            )}
            {tokenExpiry && !isTokenExpired && (
              <div className="flex justify-between">
                <span>Token expira em</span>
                <span>{tokenExpiry.toLocaleDateString("pt-PT")}</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
