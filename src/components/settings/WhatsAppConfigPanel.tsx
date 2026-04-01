import { useState, useEffect } from "react";
import { useWhatsAppQRConnection, useDisconnectWhatsAppQR, useSyncWhatsAppQR, type WhatsAppQRStatus } from "@/hooks/useWhatsAppQRConnection";
import { useWhatsAppSettings, useSaveWhatsAppSettings } from "@/hooks/useWhatsAppSettings";
import { useWorkspace } from "@/contexts/WorkspaceContext";
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
import { Phone, Loader2, Unplug, UserPlus, Bot, Shield, MessageSquare, Settings, BellRing, Save, QrCode, RefreshCw, AlertCircle, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { WhatsAppQRDialog } from "./WhatsAppQRDialog";

const STATUS_CONFIG: Record<WhatsAppQRStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Wifi }> = {
  not_configured: { label: "Não configurado", variant: "secondary", icon: WifiOff },
  creating_instance: { label: "A criar...", variant: "outline", icon: Loader2 },
  qr_pending: { label: "QR pendente", variant: "outline", icon: QrCode },
  waiting_for_scan: { label: "A aguardar scan", variant: "outline", icon: QrCode },
  authenticating: { label: "A autenticar...", variant: "outline", icon: Loader2 },
  connected: { label: "Conectado", variant: "default", icon: Wifi },
  disconnected: { label: "Desconectado", variant: "secondary", icon: WifiOff },
  qr_expired: { label: "QR expirado", variant: "secondary", icon: QrCode },
  reconnecting: { label: "A reconectar...", variant: "outline", icon: RefreshCw },
  error: { label: "Erro", variant: "destructive", icon: AlertCircle },
};

export function WhatsAppConfigPanel() {
  const { data: qrConnection, isLoading } = useWhatsAppQRConnection();
  const { data: settings, isLoading: isLoadingSettings } = useWhatsAppSettings();
  const saveMutation = useSaveWhatsAppSettings();
  const disconnectMutation = useDisconnectWhatsAppQR();
  const syncMutation = useSyncWhatsAppQR();
  const { currentWorkspace } = useWorkspace();
  const [showQRDialog, setShowQRDialog] = useState(false);

  // Local form state
  const [autopilotEnabled, setAutopilotEnabled] = useState(false);
  const [aiPersona, setAiPersona] = useState("");
  const [businessHoursOnly, setBusinessHoursOnly] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [awayMessage, setAwayMessage] = useState("");
  const [autoCreateLeads, setAutoCreateLeads] = useState(true);
  const [notifyOnNew, setNotifyOnNew] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

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

  const handleDisconnect = async () => {
    try {
      await disconnectMutation.mutateAsync();
    } catch { /* handled in hook */ }
  };

  const handleSync = async () => {
    try {
      await syncMutation.mutateAsync();
      toast.success("Estado sincronizado com sucesso");
    } catch {
      toast.error("Erro ao sincronizar estado");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const status: WhatsAppQRStatus = (qrConnection?.status as WhatsAppQRStatus) || "not_configured";
  const isConnected = status === "connected";
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.not_configured;
  const StatusIcon = statusConfig.icon;

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <div className="flex items-center justify-between p-4 border border-border rounded-lg">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isConnected ? "bg-green-500/10" : "bg-muted"}`}>
            <Phone className={`h-5 w-5 ${isConnected ? "text-green-600" : "text-muted-foreground"}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium">WhatsApp (Evolution QR)</p>
              <Badge
                variant={statusConfig.variant}
                className={`text-[10px] gap-1 ${isConnected ? "bg-emerald-500 text-white" : ""}`}
              >
                <StatusIcon className="h-3 w-3" />
                {statusConfig.label}
              </Badge>
            </div>
            {isConnected && qrConnection?.phone_number && (
              <p className="text-sm text-muted-foreground">+{qrConnection.phone_number}</p>
            )}
            {qrConnection?.last_seen_at && (
              <p className="text-xs text-muted-foreground">
                Última verificação: {new Date(qrConnection.last_seen_at).toLocaleString("pt-PT")}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Sync button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleSync}
            disabled={syncMutation.isPending}
            title="Sincronizar estado"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncMutation.isPending ? "animate-spin" : ""}`} />
          </Button>

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
                    O Auto-Pilot e as mensagens automáticas serão interrompidos. A instância será removida. Poderá reconectar a qualquer momento.
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
            <Button onClick={() => setShowQRDialog(true)} size="sm" className="gap-1.5">
              <QrCode className="h-3.5 w-3.5" />
              {status === "disconnected" || status === "error" ? "Reconectar via QR" : "Conectar via QR"}
            </Button>
          )}
        </div>
      </div>

      {/* Error display */}
      {status === "error" && qrConnection?.last_error && (
        <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5">
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{qrConnection.last_error}</span>
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

            <TabsContent value="autopilot" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Ativar Auto-Piloto</Label>
                  <p className="text-xs text-muted-foreground">A IA responde automaticamente às mensagens WhatsApp</p>
                </div>
                <Switch checked={autopilotEnabled} onCheckedChange={(v) => { setAutopilotEnabled(v); markChanged(); }} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Personalidade da IA</Label>
                <Textarea
                  placeholder="Ex: Sou a assistente virtual da empresa X..."
                  value={aiPersona}
                  onChange={(e) => { setAiPersona(e.target.value); markChanged(); }}
                  rows={4}
                  className="resize-none text-sm"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Apenas em horário comercial</Label>
                  <p className="text-xs text-muted-foreground">Auto-Piloto ativo só durante o horário de trabalho</p>
                </div>
                <Switch checked={businessHoursOnly} onCheckedChange={(v) => { setBusinessHoursOnly(v); markChanged(); }} />
              </div>
            </TabsContent>

            <TabsContent value="messages" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Mensagem de Boas-Vindas</Label>
                <Textarea
                  placeholder="Ex: Olá! 👋 Bem-vindo ao nosso atendimento."
                  value={welcomeMessage}
                  onChange={(e) => { setWelcomeMessage(e.target.value); markChanged(); }}
                  rows={3}
                  className="resize-none text-sm"
                />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label className="text-sm font-medium">Mensagem de Ausência</Label>
                <Textarea
                  placeholder="Ex: Obrigado pela mensagem! Responderemos assim que possível."
                  value={awayMessage}
                  onChange={(e) => { setAwayMessage(e.target.value); markChanged(); }}
                  rows={3}
                  className="resize-none text-sm"
                />
              </div>
            </TabsContent>

            <TabsContent value="general" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <UserPlus className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label className="text-sm font-medium">Criar leads automaticamente</Label>
                    <p className="text-xs text-muted-foreground">Criar lead quando recebe mensagem de número novo</p>
                  </div>
                </div>
                <Switch checked={autoCreateLeads} onCheckedChange={(v) => { setAutoCreateLeads(v); markChanged(); }} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BellRing className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label className="text-sm font-medium">Notificações</Label>
                    <p className="text-xs text-muted-foreground">Notificação quando chega nova mensagem WhatsApp</p>
                  </div>
                </div>
                <Switch checked={notifyOnNew} onCheckedChange={(v) => { setNotifyOnNew(v); markChanged(); }} />
              </div>

              <Separator />
              <div className="space-y-2 text-xs text-muted-foreground">
                {qrConnection?.instance_name && (
                  <div className="flex justify-between">
                    <span>Instância</span>
                    <span className="font-mono">{qrConnection.instance_name}</span>
                  </div>
                )}
                {qrConnection?.connected_at && (
                  <div className="flex justify-between">
                    <span>Conectado desde</span>
                    <span>{new Date(qrConnection.connected_at).toLocaleString("pt-PT")}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Provider</span>
                  <span className="font-mono">{qrConnection?.provider || "evolution_qr"}</span>
                </div>
              </div>
            </TabsContent>
          </Tabs>

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

      <WhatsAppQRDialog open={showQRDialog} onOpenChange={setShowQRDialog} />
    </div>
  );
}
