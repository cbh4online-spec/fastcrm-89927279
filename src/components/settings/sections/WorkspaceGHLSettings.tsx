import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Loader2, Eye, EyeOff, Copy, Check, ExternalLink, Info, Zap, RefreshCw, Users, ArrowRight, MessageSquare, Instagram, Facebook, Phone, Share2 } from "lucide-react";
import { useWorkspaceGHLConfig, SaveGHLConfigInput } from "@/hooks/useWorkspaceGHLConfig";
import { useGHLContactSync } from "@/hooks/useGHLContactSync";
import { useGHLConversationSync } from "@/hooks/useGHLConversationSync";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface SocialChannelInfo {
  id: string;
  label: string;
  icon: React.ElementType;
  channels: string[];
  color: string;
  setupGuide: string;
}

const SOCIAL_CHANNELS: SocialChannelInfo[] = [
  {
    id: "instagram",
    label: "Instagram DM",
    icon: Instagram,
    channels: ["instagram"],
    color: "text-pink-500",
    setupGuide: "No GHL, vá a Settings → Integrations → Instagram e conecte a sua conta profissional do Instagram. Depois, as mensagens de DM serão sincronizadas automaticamente.",
  },
  {
    id: "messenger",
    label: "Facebook Messenger",
    icon: Facebook,
    channels: ["messenger"],
    color: "text-blue-600",
    setupGuide: "No GHL, vá a Settings → Integrations → Facebook e conecte a sua página do Facebook. As mensagens do Messenger serão recebidas automaticamente.",
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    icon: Phone,
    channels: ["whatsapp"],
    color: "text-green-500",
    setupGuide: "No GHL, vá a Settings → Integrations → WhatsApp e configure a sua conta WhatsApp Business. As mensagens serão sincronizadas via webhook.",
  },
];

function useSocialChannelCounts(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["social-channel-counts", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return {};
      const { data, error } = await supabase
        .from("conversations")
        .select("channel")
        .eq("workspace_id", workspaceId)
        .in("channel", ["instagram", "messenger", "whatsapp"]);

      if (error) throw error;

      const counts: Record<string, number> = { instagram: 0, messenger: 0, whatsapp: 0 };
      for (const row of data || []) {
        if (row.channel && counts[row.channel] !== undefined) {
          counts[row.channel]++;
        }
      }
      return counts;
    },
    enabled: !!workspaceId,
  });
}

export function WorkspaceGHLSettings() {
  return <WorkspaceGHLSettingsInner />;
}

function SocialChannelsViaGHL() {
  const { currentWorkspace } = useWorkspace();
  const { data: channelCounts = {}, isLoading } = useSocialChannelCounts(currentWorkspace?.id);

  return (
    <Card className="border-purple-200 dark:border-purple-900/30 bg-purple-50/50 dark:bg-purple-950/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Share2 className="h-4 w-4 text-purple-500" />
          Canais Sociais via GHL
        </CardTitle>
        <CardDescription>
          Instagram, Facebook Messenger e WhatsApp conectados via GoHighLevel
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-3">
            {SOCIAL_CHANNELS.map((ch) => {
              const Icon = ch.icon;
              const count = channelCounts[ch.id] || 0;
              return (
                <div key={ch.id} className="border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-lg bg-muted">
                        <Icon className={`h-4 w-4 ${ch.color}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{ch.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {count > 0 ? `${count} conversa${count !== 1 ? "s" : ""}` : "Sem conversas ainda"}
                        </p>
                      </div>
                    </div>
                    {count > 0 ? (
                      <Badge className="bg-emerald-500 text-white text-[10px]">Ativo</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">Pendente</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="setup-guide" className="border-0">
            <AccordionTrigger className="text-xs text-muted-foreground py-2 hover:no-underline">
              Como ativar canais sociais no GHL?
            </AccordionTrigger>
            <AccordionContent className="space-y-3 text-xs text-muted-foreground">
              {SOCIAL_CHANNELS.map((ch) => {
                const Icon = ch.icon;
                return (
                  <div key={ch.id} className="flex gap-2">
                    <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${ch.color}`} />
                    <div>
                      <p className="font-medium text-foreground">{ch.label}</p>
                      <p>{ch.setupGuide}</p>
                    </div>
                  </div>
                );
              })}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}

function WorkspaceGHLSettingsInner() {
  const {
    config,
    isLoading,
    isConfigured,
    hasApiKey,
    saveConfig,
    isSaving,
    testConnection,
    isTesting,
  } = useWorkspaceGHLConfig();

  const { syncContacts: triggerSync, isSyncing, lastResult, progress } = useGHLContactSync();
  const { 
    syncConversations: triggerConversationSync, 
    isSyncing: isSyncingConversations, 
    lastResult: lastConversationResult, 
    progress: conversationProgress 
  } = useGHLConversationSync();
  const [locationId, setLocationId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [syncContacts, setSyncContacts] = useState(true);
  const [syncMessages, setSyncMessages] = useState(true);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Sync form with config
  useEffect(() => {
    if (config) {
      setLocationId(config.ghl_location_id || "");
      setIsActive(config.is_active);
      setSyncContacts(config.sync_contacts);
      setSyncMessages(config.sync_messages);
    }
  }, [config]);

  const handleSave = () => {
    if (!locationId.trim()) {
      toast.error("Location ID é obrigatório");
      return;
    }

    if (!hasApiKey && !apiKey.trim()) {
      toast.error("API Key é obrigatória");
      return;
    }

    const input: SaveGHLConfigInput = {
      ghl_location_id: locationId.trim(),
      is_active: isActive,
      sync_contacts: syncContacts,
      sync_messages: syncMessages,
    };

    if (apiKey.trim()) {
      input.ghl_api_key = apiKey.trim();
    }

    saveConfig(input);
    setApiKey(""); // Clear API key after save
  };

  const handleTestConnection = () => {
    const keyToTest = apiKey.trim() || config?.ghl_api_key_encrypted;
    if (!keyToTest) {
      toast.error("Insira uma API Key primeiro");
      return;
    }
    testConnection(keyToTest);
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedUrl(label);
      toast.success(`${label} copiado!`);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch {
      toast.error("Erro ao copiar");
    }
  };

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const webhookContactUrl = `${supabaseUrl}/functions/v1/ghl-webhook-contact`;
  const webhookMessageUrl = `${supabaseUrl}/functions/v1/ghl-webhook-message`;

  // Calculate progress percentage
  const progressPercent = progress && progress.estimatedTotal > 0 
    ? Math.min(100, Math.round((progress.processed / progress.estimatedTotal) * 100))
    : undefined;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-orange-500" />
          <span className="font-medium">GoHighLevel</span>
        </div>
        {isConfigured ? (
          <Badge className="bg-emerald-500 text-white">Conectado</Badge>
        ) : hasApiKey ? (
          <Badge variant="secondary">Configurado (Inativo)</Badge>
        ) : (
          <Badge variant="outline">Não configurado</Badge>
        )}
      </div>

      {/* Configuration Form */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="ghl-location-id">Location ID</Label>
          <Input
            id="ghl-location-id"
            placeholder="Ex: abc123xyz"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            O ID da sua Location no GoHighLevel
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ghl-api-key">
            API Key {hasApiKey && <span className="text-muted-foreground">(já configurada)</span>}
          </Label>
          <div className="relative">
            <Input
              id="ghl-api-key"
              type={showApiKey ? "text" : "password"}
              placeholder={hasApiKey ? "••••••••••••••••" : "Insira a sua API Key do GHL"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              onClick={() => setShowApiKey(!showApiKey)}
            >
              {showApiKey ? (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Eye className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {hasApiKey 
              ? "Deixe em branco para manter a API Key atual, ou insira uma nova para substituir"
              : "Token de API obtido no GHL → Settings → API Keys"}
          </p>
        </div>

        <div className="flex flex-col gap-4 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="sync-contacts">Sincronizar Contactos</Label>
              <p className="text-xs text-muted-foreground">
                Receber contactos do GHL como leads
              </p>
            </div>
            <Switch
              id="sync-contacts"
              checked={syncContacts}
              onCheckedChange={setSyncContacts}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="sync-messages">Sincronizar Mensagens</Label>
              <p className="text-xs text-muted-foreground">
                Receber mensagens do GHL na inbox
              </p>
            </div>
            <Switch
              id="sync-messages"
              checked={syncMessages}
              onCheckedChange={setSyncMessages}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="is-active">Integração Ativa</Label>
              <p className="text-xs text-muted-foreground">
                Ativar/desativar a sincronização
              </p>
            </div>
            <Switch
              id="is-active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="flex-1"
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Configuração
          </Button>
          <Button
            variant="outline"
            onClick={handleTestConnection}
            disabled={isTesting || (!apiKey && !hasApiKey)}
          >
            {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Testar
          </Button>
        </div>
      </div>

      {/* Sync Contacts Section */}
      {isConfigured && (
        <Card className="border-orange-200 dark:border-orange-900/30 bg-orange-50/50 dark:bg-orange-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-orange-500" />
              Sincronizar Contactos do GHL
            </CardTitle>
            <CardDescription>
              Importar todos os contactos existentes na location como leads
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Real-time progress */}
            {isSyncing && progress && (
              <div className="space-y-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/50">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="font-medium">A sincronizar contactos...</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Página {progress.page}
                  </span>
                </div>
                
                <Progress 
                  value={progressPercent} 
                  className="h-2 bg-orange-100 dark:bg-orange-900/30"
                />
                
                <div className="grid grid-cols-3 gap-2 text-xs text-center">
                  <div className="p-2 bg-white dark:bg-background rounded-md shadow-sm">
                    <span className="block text-lg font-bold text-orange-600">{progress.processed}</span>
                    <span className="text-muted-foreground">Processados</span>
                    {progress.estimatedTotal > 0 && (
                      <span className="block text-muted-foreground text-[10px]">
                        de ~{progress.estimatedTotal}
                      </span>
                    )}
                  </div>
                  <div className="p-2 bg-white dark:bg-background rounded-md shadow-sm">
                    <span className="block text-lg font-bold text-green-600">{progress.created}</span>
                    <span className="text-muted-foreground">Criados</span>
                  </div>
                  <div className="p-2 bg-white dark:bg-background rounded-md shadow-sm">
                    <span className="block text-lg font-bold text-gray-500">{progress.skipped}</span>
                    <span className="text-muted-foreground">Existentes</span>
                  </div>
                </div>
              </div>
            )}

            {/* Syncing without progress data yet */}
            {isSyncing && !progress && (
              <div className="space-y-2 p-3 rounded-lg bg-muted">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  A iniciar sincronização...
                </div>
                <Progress className="h-2" />
              </div>
            )}

            {/* Last result */}
            {lastResult && !isSyncing && (
              <div className="rounded-lg bg-muted p-3 space-y-3">
                <p className="text-sm font-medium">Última sincronização:</p>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="text-center p-2 bg-green-100 dark:bg-green-900/30 rounded">
                    <span className="block text-lg font-bold text-green-600">{lastResult.created}</span>
                    Criados
                  </div>
                  <div className="text-center p-2 bg-blue-100 dark:bg-blue-900/30 rounded">
                    <span className="block text-lg font-bold text-blue-600">{lastResult.updated}</span>
                    Actualizados
                  </div>
                  <div className="text-center p-2 bg-gray-100 dark:bg-gray-800 rounded">
                    <span className="block text-lg font-bold text-muted-foreground">{lastResult.skipped}</span>
                    Ignorados
                  </div>
                </div>
                
                {lastResult.created > 0 && (
                  <Link 
                    to="/dashboard/leads" 
                    className="flex items-center justify-center gap-2 w-full py-2 text-sm text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950/30 rounded-md transition-colors"
                  >
                    Ver {lastResult.created} leads importados
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
                
                {lastResult.errors.length > 0 && (
                  <p className="text-xs text-destructive mt-2">
                    {lastResult.errors.length} erro(s) durante a sincronização
                  </p>
                )}
              </div>
            )}

            <Button
              onClick={triggerSync}
              disabled={isSyncing}
              className="w-full bg-orange-500 hover:bg-orange-600"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A Sincronizar...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sincronizar Contactos Agora
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Isto irá importar todos os contactos do GHL como leads.
              Contactos existentes serão ignorados.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Sync Conversations Section */}
      {isConfigured && (
        <Card className="border-blue-200 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-500" />
              Sincronizar Conversas do GHL
            </CardTitle>
            <CardDescription>
              Importar conversas e mensagens existentes para o inbox
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Real-time progress */}
            {isSyncingConversations && conversationProgress && (
              <div className="space-y-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="font-medium">A sincronizar conversas...</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Página {conversationProgress.page}
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-xs text-center">
                  <div className="p-2 bg-white dark:bg-background rounded-md shadow-sm">
                    <span className="block text-lg font-bold text-blue-600">{conversationProgress.processed}</span>
                    <span className="text-muted-foreground">Processados</span>
                  </div>
                  <div className="p-2 bg-white dark:bg-background rounded-md shadow-sm">
                    <span className="block text-lg font-bold text-green-600">{conversationProgress.conversations_created}</span>
                    <span className="text-muted-foreground">Conversas</span>
                  </div>
                  <div className="p-2 bg-white dark:bg-background rounded-md shadow-sm">
                    <span className="block text-lg font-bold text-purple-600">{conversationProgress.messages_created}</span>
                    <span className="text-muted-foreground">Mensagens</span>
                  </div>
                </div>
              </div>
            )}

            {/* Syncing without progress data yet */}
            {isSyncingConversations && !conversationProgress && (
              <div className="space-y-2 p-3 rounded-lg bg-muted">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  A iniciar sincronização de conversas...
                </div>
                <Progress className="h-2" />
              </div>
            )}

            {/* Last result */}
            {lastConversationResult && !isSyncingConversations && (
              <div className="rounded-lg bg-muted p-3 space-y-3">
                <p className="text-sm font-medium">Última sincronização:</p>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="text-center p-2 bg-green-100 dark:bg-green-900/30 rounded">
                    <span className="block text-lg font-bold text-green-600">{lastConversationResult.conversations_created}</span>
                    Conversas
                  </div>
                  <div className="text-center p-2 bg-purple-100 dark:bg-purple-900/30 rounded">
                    <span className="block text-lg font-bold text-purple-600">{lastConversationResult.messages_created}</span>
                    Mensagens
                  </div>
                  <div className="text-center p-2 bg-gray-100 dark:bg-gray-800 rounded">
                    <span className="block text-lg font-bold text-muted-foreground">{lastConversationResult.messages_skipped}</span>
                    Ignoradas
                  </div>
                </div>
                
                {lastConversationResult.conversations_created > 0 && (
                  <Link 
                    to="/dashboard/inbox" 
                    className="flex items-center justify-center gap-2 w-full py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-md transition-colors"
                  >
                    Ver {lastConversationResult.conversations_created} conversas importadas
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
                
                {lastConversationResult.errors.length > 0 && (
                  <p className="text-xs text-destructive mt-2">
                    {lastConversationResult.errors.length} erro(s) durante a sincronização
                  </p>
                )}
              </div>
            )}

            <Button
              onClick={() => triggerConversationSync(true, 30)}
              disabled={isSyncingConversations}
              className="w-full bg-blue-500 hover:bg-blue-600"
            >
              {isSyncingConversations ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A Sincronizar...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sincronizar Conversas Agora
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Isto irá importar conversas e mensagens dos últimos 30 dias.
              Requer que os contactos já estejam sincronizados.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Social Channels via GHL */}
      {isConfigured && <SocialChannelsViaGHL />}

      {/* Webhook URLs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="h-4 w-4" />
            URLs dos Webhooks
          </CardTitle>
          <CardDescription>
            Configure estes webhooks no GoHighLevel para receber dados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">
              Webhook de Contactos
            </Label>
            <div className="flex gap-2">
              <code className="flex-1 rounded bg-muted px-3 py-2 text-xs break-all">
                {webhookContactUrl}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(webhookContactUrl, "Contact URL")}
              >
                {copiedUrl === "Contact URL" ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">
              Webhook de Mensagens
            </Label>
            <div className="flex gap-2">
              <code className="flex-1 rounded bg-muted px-3 py-2 text-xs break-all">
                {webhookMessageUrl}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(webhookMessageUrl, "Message URL")}
              >
                {copiedUrl === "Message URL" ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Headers obrigatórios:</strong><br />
              <code className="bg-muted px-1 rounded">X-GHL-Location-Id: {locationId || "{seu_location_id}"}</code><br />
              <code className="bg-muted px-1 rounded">Content-Type: application/json</code>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Last Sync Info */}
      {config?.last_sync_at && (
        <p className="text-xs text-muted-foreground text-center">
          Última sincronização: {new Date(config.last_sync_at).toLocaleString("pt-PT")}
        </p>
      )}

      {/* Documentation Link */}
      <Button variant="link" className="w-full text-muted-foreground" asChild>
        <a 
          href="https://highlevel.stoplight.io/docs/integrations" 
          target="_blank" 
          rel="noopener noreferrer"
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Documentação da API do GoHighLevel
        </a>
      </Button>
    </div>
  );
}
