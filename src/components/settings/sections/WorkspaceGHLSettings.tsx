import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Eye, EyeOff, Copy, Check, ExternalLink, Info, Zap, RefreshCw, Users, ArrowRight, MessageSquare, Instagram, Facebook, Phone, Share2, Webhook, CheckCircle2, AlertCircle, PlayCircle, Search, Save } from "lucide-react";
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
  const workspaceId = currentWorkspace?.id;
  const { data: channelCounts = {}, isLoading: isLoadingCounts } = useSocialChannelCounts(workspaceId);
  const [isFetchingChannels, setIsFetchingChannels] = useState(false);
  const [fetchedChannels, setFetchedChannels] = useState<Array<{ channel_type: string; ghl_account_id: string; account_name: string }>>([]);
  const [hasFetched, setHasFetched] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingSelection, setPendingSelection] = useState<Record<string, boolean>>({});
  const [pendingActive, setPendingActive] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsaved, setHasUnsaved] = useState(false);

  const { data: savedChannels = [], isLoading: isLoadingSaved, refetch: refetchSaved } = useQuery({
    queryKey: ["workspace-ghl-social-channels", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("workspace_ghl_social_channels")
        .select("*")
        .eq("workspace_id", workspaceId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });

  // Initialize pending state from saved channels when data loads
  useEffect(() => {
    if (savedChannels.length > 0 && !hasUnsaved) {
      const sel: Record<string, boolean> = {};
      const act: Record<string, boolean> = {};
      for (const s of savedChannels as any[]) {
        const key = `${s.channel_type}::${s.ghl_account_id}`;
        sel[key] = true;
        act[key] = s.is_active ?? true;
      }
      setPendingSelection(sel);
      setPendingActive(act);
    }
  }, [savedChannels, hasUnsaved]);

  const handleFetchChannels = async () => {
    if (!workspaceId) return;
    setIsFetchingChannels(true);
    try {
      const { data, error } = await supabase.functions.invoke("ghl-list-social-channels", {
        body: { workspace_id: workspaceId },
      });
      if (error) throw error;
      const channels = data?.channels || [];
      setFetchedChannels(channels);
      setHasFetched(true);
      // Preserve existing selections, add new channels as unselected
      if (channels.length > 0) {
        setPendingSelection(prev => {
          const next = { ...prev };
          for (const ch of channels) {
            const key = `${ch.channel_type}::${ch.ghl_account_id}`;
            if (!(key in next)) next[key] = false;
          }
          return next;
        });
        toast.success(`${channels.length} canal(is) encontrado(s)`);
      } else {
        toast.info("Nenhum canal social encontrado nesta location do GHL");
      }
    } catch (err) {
      console.error("Fetch channels error:", err);
      toast.error("Erro ao carregar canais do GHL");
    } finally {
      setIsFetchingChannels(false);
    }
  };

  const getChannelIcon = (type: string) => {
    switch (type) {
      case "facebook": return Facebook;
      case "instagram": return Instagram;
      case "whatsapp": return Phone;
      default: return Share2;
    }
  };

  const getChannelColor = (type: string) => {
    switch (type) {
      case "facebook": return "text-blue-600";
      case "instagram": return "text-pink-500";
      case "whatsapp": return "text-green-500";
      default: return "text-muted-foreground";
    }
  };

  const getChannelLabel = (type: string) => {
    switch (type) {
      case "facebook": return "Facebook Messenger";
      case "instagram": return "Instagram DM";
      case "whatsapp": return "WhatsApp";
      default: return type;
    }
  };

  // Merge fetched + saved for display
  const allChannels = useMemo(() => {
    const map = new Map<string, { channel_type: string; ghl_account_id: string; account_name: string }>();
    for (const s of savedChannels as any[]) {
      map.set(`${s.channel_type}::${s.ghl_account_id}`, {
        channel_type: s.channel_type,
        ghl_account_id: s.ghl_account_id,
        account_name: s.account_name,
      });
    }
    for (const ch of fetchedChannels) {
      const key = `${ch.channel_type}::${ch.ghl_account_id}`;
      if (!map.has(key)) map.set(key, ch);
    }
    return Array.from(map.values());
  }, [savedChannels, fetchedChannels]);

  const filteredChannels = useMemo(() => {
    if (!searchQuery.trim()) return allChannels;
    const q = searchQuery.toLowerCase();
    return allChannels.filter(ch =>
      ch.account_name.toLowerCase().includes(q) ||
      ch.channel_type.toLowerCase().includes(q) ||
      ch.ghl_account_id.toLowerCase().includes(q)
    );
  }, [allChannels, searchQuery]);

  const toggleSelection = (key: string) => {
    setPendingSelection(prev => ({ ...prev, [key]: !prev[key] }));
    setHasUnsaved(true);
  };

  const toggleActive = (key: string, value: boolean) => {
    setPendingActive(prev => ({ ...prev, [key]: value }));
    setHasUnsaved(true);
  };

  const handleSaveSelection = async () => {
    if (!workspaceId) return;
    setIsSaving(true);
    try {
      // Delete all existing channels for this workspace, then upsert selected ones
      await supabase
        .from("workspace_ghl_social_channels")
        .delete()
        .eq("workspace_id", workspaceId);

      const toInsert = allChannels
        .filter(ch => pendingSelection[`${ch.channel_type}::${ch.ghl_account_id}`])
        .map(ch => ({
          workspace_id: workspaceId,
          channel_type: ch.channel_type,
          ghl_account_id: ch.ghl_account_id,
          account_name: ch.account_name,
          is_active: pendingActive[`${ch.channel_type}::${ch.ghl_account_id}`] ?? true,
        }));

      if (toInsert.length > 0) {
        const { error } = await supabase
          .from("workspace_ghl_social_channels")
          .insert(toInsert);
        if (error) throw error;
      }

      await refetchSaved();
      setHasUnsaved(false);
      toast.success(`${toInsert.length} canal(is) guardado(s) com sucesso`);
    } catch (err) {
      console.error("Save selection error:", err);
      toast.error("Erro ao guardar seleção de canais");
    } finally {
      setIsSaving(false);
    }
  };

  const selectedCount = Object.values(pendingSelection).filter(Boolean).length;
  const activeCount = allChannels.filter(ch => {
    const key = `${ch.channel_type}::${ch.ghl_account_id}`;
    return pendingSelection[key] && pendingActive[key];
  }).length;

  return (
    <Card className="border-purple-200 dark:border-purple-900/30 bg-purple-50/50 dark:bg-purple-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              <Share2 className="h-4 w-4 text-purple-500" />
              Canais Sociais via GHL
            </CardTitle>
            <CardDescription className="mt-1">
              Selecione quais páginas e perfis do GHL usar neste workspace
            </CardDescription>
          </div>
          {allChannels.length > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {selectedCount} selecionado{selectedCount !== 1 ? "s" : ""}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {activeCount} ativo{activeCount !== 1 ? "s" : ""}
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleFetchChannels}
          disabled={isFetchingChannels}
        >
          {isFetchingChannels ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />A carregar canais...</>
          ) : (
            <><RefreshCw className="mr-2 h-4 w-4" />{hasFetched ? "Atualizar canais do GHL" : "Carregar canais do GHL"}</>
          )}
        </Button>

        {(isLoadingSaved || isLoadingCounts) && !hasFetched ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : allChannels.length > 0 ? (
          <div className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar canais..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>

            {/* Channel list header */}
            <div className="grid grid-cols-[auto_1fr_auto_auto] gap-3 items-center px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border">
              <span className="w-5" />
              <span>Canal / Página</span>
              <span>Conexão</span>
              <span>Estado</span>
            </div>

            {/* Channel list */}
            <div className="divide-y divide-border rounded-lg border border-border overflow-hidden bg-background">
              {filteredChannels.map((ch) => {
                const key = `${ch.channel_type}::${ch.ghl_account_id}`;
                const Icon = getChannelIcon(ch.channel_type);
                const color = getChannelColor(ch.channel_type);
                const selected = !!pendingSelection[key];
                const active = pendingActive[key] ?? true;
                const count = channelCounts[ch.channel_type] || 0;

                return (
                  <div
                    key={key}
                    className={`grid grid-cols-[auto_1fr_auto_auto] gap-3 items-center px-3 py-2.5 transition-all ${
                      !selected ? "opacity-50 bg-muted/30" : active ? "bg-background" : "bg-muted/20"
                    }`}
                  >
                    {/* Checkbox */}
                    <Checkbox
                      checked={selected}
                      onCheckedChange={() => toggleSelection(key)}
                      className="h-4 w-4"
                    />

                    {/* Name & ID */}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{ch.account_name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {ch.ghl_account_id}
                        {count > 0 && <span className="ml-1.5">· {count} conversa{count !== 1 ? "s" : ""}</span>}
                      </p>
                    </div>

                    {/* Connection icon */}
                    <div className="flex items-center gap-1.5">
                      <div className="p-1 rounded bg-muted">
                        <Icon className={`h-3.5 w-3.5 ${color}`} />
                      </div>
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        {getChannelLabel(ch.channel_type)}
                      </span>
                    </div>

                    {/* Active toggle */}
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-medium ${selected && active ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                        {selected && active ? "Ativo" : "Inativo"}
                      </span>
                      <Switch
                        checked={selected && active}
                        onCheckedChange={(checked) => {
                          if (!selected) {
                            toggleSelection(key);
                            toggleActive(key, true);
                          } else {
                            toggleActive(key, checked);
                          }
                        }}
                        disabled={!selected}
                        className="scale-90"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredChannels.length === 0 && searchQuery && (
              <p className="text-xs text-muted-foreground text-center py-3">
                Nenhum canal corresponde a "{searchQuery}"
              </p>
            )}

            {/* Save button */}
            <Button
              size="sm"
              className="w-full"
              onClick={handleSaveSelection}
              disabled={isSaving || !hasUnsaved}
            >
              {isSaving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />A guardar...</>
              ) : (
                <><Save className="mr-2 h-4 w-4" />Guardar Seleção</>
              )}
            </Button>

            {hasUnsaved && (
              <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
                Tem alterações por guardar
              </p>
            )}
          </div>
        ) : hasFetched ? (
          <p className="text-xs text-muted-foreground text-center py-3">
            Nenhum canal encontrado. Verifique se a location GHL tem redes sociais configuradas.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-3">
            Clique em "Carregar canais do GHL" para ver os perfis disponíveis.
          </p>
        )}
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
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [webhookTestResult, setWebhookTestResult] = useState<"success" | "error" | null>(null);

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
  const locationIdForUrl = locationId || (config?.ghl_location_id ?? "");
  const webhookContactUrl = locationIdForUrl
    ? `${supabaseUrl}/functions/v1/ghl-webhook-contact?location_id=${locationIdForUrl}`
    : `${supabaseUrl}/functions/v1/ghl-webhook-contact`;
  const webhookMessageUrl = locationIdForUrl
    ? `${supabaseUrl}/functions/v1/ghl-webhook-message?location_id=${locationIdForUrl}`
    : `${supabaseUrl}/functions/v1/ghl-webhook-message`;

  const handleTestWebhook = async () => {
    if (!locationIdForUrl) {
      toast.error("Configure o Location ID primeiro");
      return;
    }
    setIsTestingWebhook(true);
    setWebhookTestResult(null);
    try {
      const testPayload = {
        type: "InboundMessage",
        locationId: locationIdForUrl,
        contactId: "test-contact-id",
        conversationId: "test-conversation-id",
        body: "Teste de webhook — mensagem de verificação",
        messageType: "SMS",
        direction: "inbound",
        dateAdded: new Date().toISOString(),
        messageId: `test-${Date.now()}`,
      };
      const res = await fetch(webhookMessageUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testPayload),
      });
      if (res.ok) {
        setWebhookTestResult("success");
        toast.success("Webhook respondeu corretamente! A configuração está funcional.");
      } else {
        setWebhookTestResult("error");
        toast.error(`Webhook devolveu erro: ${res.status} ${res.statusText}`);
      }
    } catch (err) {
      setWebhookTestResult("error");
      toast.error("Não foi possível contactar o endpoint de webhook");
    } finally {
      setIsTestingWebhook(false);
      setTimeout(() => setWebhookTestResult(null), 5000);
    }
  };

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
                  <div className="mt-2 rounded-md border border-destructive/20 bg-destructive/5 p-2 space-y-1">
                    <p className="text-xs font-medium text-destructive">
                      {lastResult.errors.length} erro(s) durante a sincronização
                    </p>
                    {lastResult.errors.slice(0, 3).map((error, index) => (
                      <p key={`${index}-${error}`} className="text-xs text-destructive/90">
                        {error}
                      </p>
                    ))}
                  </div>
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
                    {conversationProgress.pass && conversationProgress.pass > 1
                      ? `Continuação ${conversationProgress.pass} · Página ${conversationProgress.page}`
                      : `Página ${conversationProgress.page}`}
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
                
                {lastConversationResult.partial && lastConversationResult.errors.length === 0 && (
                  <div className="mt-2 rounded-md border border-blue-300/50 bg-blue-50 dark:bg-blue-950/20 p-2 text-xs text-blue-700 dark:text-blue-300">
                    Ainda há conversas por processar. A próxima sincronização continua automaticamente do último ponto.
                  </div>
                )}

                {lastConversationResult.errors.length > 0 && (
                  <details className="mt-2 rounded-md border border-destructive/30 bg-destructive/5 p-2">
                    <summary className="cursor-pointer text-xs font-medium text-destructive">
                      {`${lastConversationResult.errors.length} aviso(s) — ver detalhes`}
                    </summary>
                    <ul className="mt-2 space-y-1 text-xs text-destructive/90 list-disc pl-4">
                      {lastConversationResult.errors.map((error, index) => (
                        <li key={index} className="break-words">{error}</li>
                      ))}
                    </ul>
                  </details>
                )}


                {(lastConversationResult.skipped_details?.length ?? 0) > 0 && (
                  <details className="mt-2 rounded-md border border-amber-300/50 bg-amber-50 dark:bg-amber-950/20 p-2">
                    <summary className="cursor-pointer text-xs font-medium text-amber-700 dark:text-amber-400">
                      {lastConversationResult.skipped_details!.length} conversa(s) ignorada(s) — ver motivos
                    </summary>
                    <ul className="mt-2 space-y-1 text-xs text-amber-800 dark:text-amber-300 list-disc pl-4 max-h-40 overflow-y-auto">
                      {lastConversationResult.skipped_details!.slice(0, 50).map((detail, index) => (
                        <li key={index} className="break-words">{detail}</li>
                      ))}
                    </ul>
                  </details>
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

      {/* WhatsApp via GHL — diagnóstico e ativação por workspace */}
      {isConfigured && <GHLWhatsAppChannelCard />}

      {/* Social Channels via GHL */}
      {isConfigured && <SocialChannelsViaGHL />}

      {/* Webhook URLs — Tempo Real */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Webhook className="h-4 w-4 text-primary" />
            Webhooks em Tempo Real
          </CardTitle>
          <CardDescription>
            Configure o GHL para enviar mensagens imediatamente via webhook — sem esperar pelo polling
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Message webhook URL */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground">
                Webhook de Mensagens <span className="text-primary">(InboundMessage)</span>
              </Label>
              <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300">Recomendado</Badge>
            </div>
            <div className="flex gap-2">
              <code className="flex-1 rounded bg-muted px-3 py-2 text-xs break-all font-mono">
                {webhookMessageUrl}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(webhookMessageUrl, "Message URL")}
              >
                {copiedUrl === "Message URL" ? (
                  <Check className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            {locationIdForUrl && (
              <p className="text-[10px] text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Location ID incluído no URL — não é necessário configurar headers
              </p>
            )}
            {!locationIdForUrl && (
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Configure o Location ID acima para gerar o URL personalizado
              </p>
            )}
          </div>

          {/* Contact webhook URL */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Webhook de Contactos <span className="text-muted-foreground">(opcional)</span>
            </Label>
            <div className="flex gap-2">
              <code className="flex-1 rounded bg-muted px-3 py-2 text-xs break-all font-mono">
                {webhookContactUrl}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(webhookContactUrl, "Contact URL")}
              >
                {copiedUrl === "Contact URL" ? (
                  <Check className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Step-by-step guide */}
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="webhook-guide" className="border rounded-lg px-3">
              <AccordionTrigger className="text-xs font-medium py-3 hover:no-underline">
                Como configurar o webhook no GHL? (guia passo a passo)
              </AccordionTrigger>
              <AccordionContent className="pb-3">
                <ol className="space-y-3 text-xs text-muted-foreground">
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">1</span>
                    <span>No GHL, aceda a <strong className="text-foreground">Settings → Integrations → Webhooks</strong></span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">2</span>
                    <span>Clique em <strong className="text-foreground">"Add New Webhook"</strong></span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">3</span>
                    <span>Cole o <strong className="text-foreground">URL de Mensagens</strong> acima no campo "Webhook URL"</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">4</span>
                    <span>Em "Events", selecione <strong className="text-foreground">InboundMessage</strong></span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">5</span>
                    <span>Guarde e ative o webhook. As mensagens começarão a chegar <strong className="text-foreground">instantaneamente</strong>.</span>
                  </li>
                </ol>
                <Alert className="mt-3">
                  <Info className="h-3.5 w-3.5" />
                  <AlertDescription className="text-xs">
                    Com o location_id já incluído no URL, <strong>não é necessário</strong> configurar headers adicionais no GHL. Basta colar o URL e selecionar o evento.
                  </AlertDescription>
                </Alert>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Test webhook button */}
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleTestWebhook}
              disabled={isTestingWebhook || !locationIdForUrl}
            >
              {isTestingWebhook ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />A testar...</>
              ) : webhookTestResult === "success" ? (
                <><CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" />Webhook OK!</>
              ) : webhookTestResult === "error" ? (
                <><AlertCircle className="mr-2 h-4 w-4 text-destructive" />Erro no webhook</>
              ) : (
                <><PlayCircle className="mr-2 h-4 w-4" />Testar Webhook</>
              )}
            </Button>
          </div>
          {!locationIdForUrl && (
            <p className="text-[10px] text-muted-foreground text-center">Configure o Location ID para poder testar o webhook</p>
          )}
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
