import { useState, useEffect } from "react";
import { useWhatsAppConnection, useDisconnectWhatsApp } from "@/hooks/useWhatsAppConnection";
import { useWhatsAppSettings, useSaveWhatsAppSettings } from "@/hooks/useWhatsAppSettings";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Phone, Loader2, ExternalLink, Unplug, UserPlus, Bot, Shield, MessageSquare, Settings, BellRing, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function WhatsAppConfigPanel() {
  const { data: connection, isLoading } = useWhatsAppConnection();
  const { data: settings, isLoading: isLoadingSettings } = useWhatsAppSettings();
  const saveMutation = useSaveWhatsAppSettings();
  const disconnectMutation = useDisconnectWhatsApp();
  const { currentWorkspace } = useWorkspace();
  const [isConnecting, setIsConnecting] = useState(false);

  // Local form state
  const [autopilotEnabled, setAutopilotEnabled] = useState(false);
  const [aiPersona, setAiPersona] = useState("");
  const [businessHoursOnly, setBusinessHoursOnly] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [awayMessage, setAwayMessage] = useState("");
  const [autoCreateLeads, setAutoCreateLeads] = useState(true);
  const [notifyOnNew, setNotifyOnNew] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync settings to local state
  useEffect(() => {
    if (settings) {
      setAutopilotEnabled(settings.autopilot_enabled ?? false);
      setAiPersona(settings.ai_persona ?? "");
      setBusinessHoursOnly(settings.business_hours_only ?? false);
      setWelcomeMessage(settings.welcome_message ?? "");
      setAwayMessage(settings.away_message ?? "");
      setAutoCreateLeads(settings.auto_create_leads ?? true);
      setNotifyOnNew(settings.notify_on_new_message ?? true);
      setHasChanges(false);
    }
  }, [settings]);

  const markChanged = () => setHasChanges(true);

  const handleSave = () => {
    saveMutation.mutate({
      autopilot_enabled: autopilotEnabled,
      ai_persona: aiPersona,
      business_hours_only: businessHoursOnly,
      welcome_message: welcomeMessage,
      away_message: awayMessage,
      auto_create_leads: autoCreateLeads,
      notify_on_new_message: notifyOnNew,
    });
    setHasChanges(false);
  };

  const handleConnect = async () => {
    if (!currentWorkspace?.id) return;
    setIsConnecting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.functions.invoke("whatsapp-auth-url", {
        body: { workspaceId: currentWorkspace.id, userId: user?.id },
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isConnected = connection?.is_active;
  const tokenExpiry = connection?.token_expires_at ? new Date(connection.token_expires_at) : null;
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
              <p className="text-sm text-muted-foreground">{connection.display_phone_number}</p>
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
            {isConnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
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

      {/* Settings tabs (only when connected) */}
      {isConnected && !isLoadingSettings && (
        <>
          <Separator />

          <Tabs defaultValue="autopilot" className="w-full">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="autopilot" className="gap-1.5 text-xs">
                <Bot className="h-3.5 w-3.5" />
                Auto-Piloto IA
              </TabsTrigger>
              <TabsTrigger value="messages" className="gap-1.5 text-xs">
                <MessageSquare className="h-3.5 w-3.5" />
                Mensagens
              </TabsTrigger>
              <TabsTrigger value="general" className="gap-1.5 text-xs">
                <Settings className="h-3.5 w-3.5" />
                Definições
              </TabsTrigger>
            </TabsList>

            {/* Auto-Pilot Tab */}
            <TabsContent value="autopilot" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Ativar Auto-Piloto</Label>
                  <p className="text-xs text-muted-foreground">
                    A IA responde automaticamente às mensagens WhatsApp
                  </p>
                </div>
                <Switch
                  checked={autopilotEnabled}
                  onCheckedChange={(v) => { setAutopilotEnabled(v); markChanged(); }}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Personalidade da IA</Label>
                <Textarea
                  placeholder="Ex: Sou a assistente virtual da empresa X. Respondo de forma simpática e profissional, sempre em português..."
                  value={aiPersona}
                  onChange={(e) => { setAiPersona(e.target.value); markChanged(); }}
                  rows={4}
                  className="resize-none text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Descreva como a IA deve se comportar e comunicar com os clientes.
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Apenas em horário comercial</Label>
                  <p className="text-xs text-muted-foreground">
                    Auto-Piloto ativo só durante o horário de trabalho
                  </p>
                </div>
                <Switch
                  checked={businessHoursOnly}
                  onCheckedChange={(v) => { setBusinessHoursOnly(v); markChanged(); }}
                />
              </div>
            </TabsContent>

            {/* Messages Tab */}
            <TabsContent value="messages" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Mensagem de Boas-Vindas</Label>
                <Textarea
                  placeholder="Ex: Olá! 👋 Bem-vindo ao nosso atendimento. Como posso ajudá-lo?"
                  value={welcomeMessage}
                  onChange={(e) => { setWelcomeMessage(e.target.value); markChanged(); }}
                  rows={3}
                  className="resize-none text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Enviada automaticamente na primeira mensagem de um contacto novo.
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-sm font-medium">Mensagem de Ausência</Label>
                <Textarea
                  placeholder="Ex: Obrigado pela mensagem! De momento estamos fora do horário de atendimento. Responderemos assim que possível."
                  value={awayMessage}
                  onChange={(e) => { setAwayMessage(e.target.value); markChanged(); }}
                  rows={3}
                  className="resize-none text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Enviada fora do horário comercial quando o Auto-Piloto está desativado.
                </p>
              </div>
            </TabsContent>

            {/* General Settings Tab */}
            <TabsContent value="general" className="space-y-4 mt-4">
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
                  checked={autoCreateLeads}
                  onCheckedChange={(v) => { setAutoCreateLeads(v); markChanged(); }}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BellRing className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label className="text-sm font-medium">Notificações</Label>
                    <p className="text-xs text-muted-foreground">
                      Receber notificação quando chega uma nova mensagem WhatsApp
                    </p>
                  </div>
                </div>
                <Switch
                  checked={notifyOnNew}
                  onCheckedChange={(v) => { setNotifyOnNew(v); markChanged(); }}
                />
              </div>

              {/* Technical details */}
              <Separator />
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
            </TabsContent>
          </Tabs>

          {/* Save button */}
          {hasChanges && (
            <div className="flex justify-end pt-2">
              <Button onClick={handleSave} disabled={saveMutation.isPending} size="sm" className="gap-1.5">
                {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Guardar Definições
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
