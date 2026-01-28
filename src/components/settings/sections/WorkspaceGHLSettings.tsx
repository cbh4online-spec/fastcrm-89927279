import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Eye, EyeOff, Copy, Check, ExternalLink, Info, Zap } from "lucide-react";
import { useWorkspaceGHLConfig, SaveGHLConfigInput } from "@/hooks/useWorkspaceGHLConfig";
import { toast } from "sonner";

export function WorkspaceGHLSettings() {
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
