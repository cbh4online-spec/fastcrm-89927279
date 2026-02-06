import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  Eye,
  EyeOff,
  Info,
  Video,
  Monitor,
  CheckCircle2,
  Unplug,
  ExternalLink,
} from "lucide-react";
import { useWorkspaceVideoConfig, type SaveVideoConfigInput } from "@/hooks/useWorkspaceVideoConfig";
import { toast } from "sonner";

export function WorkspaceVideoSettings() {
  const {
    config,
    isLoading,
    isZoomConnected,
    isGoogleMeetConnected,
    isZoomConfigured,
    hasZoomCredentials,
    saveConfig,
    saveConfigAsync,
    isSaving,
    connectOAuth,
    isConnecting,
    disconnect,
    isDisconnecting,
    testConnection,
    isTesting,
  } = useWorkspaceVideoConfig();

  const [searchParams, setSearchParams] = useSearchParams();

  // Zoom fields
  const [zoomClientId, setZoomClientId] = useState("");
  const [zoomClientSecret, setZoomClientSecret] = useState("");
  const [showZoomSecret, setShowZoomSecret] = useState(false);

  // Handle OAuth callback params
  useEffect(() => {
    const oauthResult = searchParams.get("video_oauth");
    const oauthProvider = searchParams.get("video_provider");
    const oauthError = searchParams.get("video_error");

    if (oauthResult === "success") {
      toast.success(
        oauthProvider === "zoom"
          ? "Zoom conectado com sucesso!"
          : "Google Meet conectado com sucesso!"
      );
      // Clean URL params
      searchParams.delete("video_oauth");
      searchParams.delete("video_provider");
      setSearchParams(searchParams, { replace: true });
    } else if (oauthResult === "error") {
      toast.error(oauthError || "Erro na autenticação");
      searchParams.delete("video_oauth");
      searchParams.delete("video_error");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Sync form with config
  useEffect(() => {
    if (config) {
      setZoomClientId(config.zoom_client_id || "");
    }
  }, [config]);

  const handleSaveZoom = async () => {
    if (!zoomClientId.trim()) {
      toast.error("Preencha o Client ID do Zoom");
      return;
    }
    if (!hasZoomCredentials && !zoomClientSecret.trim()) {
      toast.error("Insira o Client Secret do Zoom");
      return;
    }

    const input: SaveVideoConfigInput = {
      zoom_client_id: zoomClientId.trim(),
      zoom_enabled: config?.zoom_enabled ?? false,
      google_client_id: config?.google_client_id || undefined,
      google_calendar_email: config?.google_calendar_email || undefined,
      google_meet_enabled: config?.google_meet_enabled ?? false,
    };

    if (zoomClientSecret.trim()) {
      input.zoom_client_secret = zoomClientSecret.trim();
    }

    await saveConfigAsync(input);
    setZoomClientSecret("");
  };

  const handleConnectZoom = async () => {
    if (!isZoomConfigured) {
      if (!zoomClientId.trim() || !zoomClientSecret.trim()) {
        toast.error("Preencha Client ID e Client Secret antes de conectar");
        return;
      }
      await handleSaveZoom();
    }
    connectOAuth("zoom");
  };

  const handleConnectGoogle = () => {
    connectOAuth("google_meet");
  };

  const callbackUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/video-oauth-callback`;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Video className="h-5 w-5 text-blue-500" />
          <span className="font-medium">Videoconferência</span>
        </div>
        <div className="flex gap-2">
          {isZoomConnected && (
            <Badge className="bg-blue-500 text-white">Zoom conectado</Badge>
          )}
          {isGoogleMeetConnected && (
            <Badge className="bg-emerald-500 text-white">Meet conectado</Badge>
          )}
          {!isZoomConnected && !isGoogleMeetConnected && (
            <Badge variant="outline">Não configurado</Badge>
          )}
        </div>
      </div>

      {/* Zoom Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Monitor className="h-4 w-4 text-blue-500" />
              Zoom
            </CardTitle>
            {isZoomConnected && (
              <div className="flex items-center gap-1 text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-xs font-medium">Conectado</span>
              </div>
            )}
          </div>
          <CardDescription>
            Conecte a sua conta Zoom para criar reuniões automaticamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs space-y-1">
              <p>1. Crie uma app OAuth em{" "}
                <a href="https://marketplace.zoom.us" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  marketplace.zoom.us
                </a>
              </p>
              <p>2. Adicione o scope: <code className="bg-muted px-1 rounded">meeting:write</code></p>
              <p>3. Configure o Redirect URL: <code className="bg-muted px-1 rounded text-[10px] break-all">{callbackUrl}</code></p>
              <p>4. Cole o Client ID e Client Secret abaixo e clique "Conectar"</p>
            </AlertDescription>
          </Alert>

          {!isZoomConnected ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="zoom-client-id">Client ID</Label>
                <Input
                  id="zoom-client-id"
                  placeholder="Ex: xyz789..."
                  value={zoomClientId}
                  onChange={(e) => setZoomClientId(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="zoom-client-secret">
                  Client Secret{" "}
                  {hasZoomCredentials && (
                    <span className="text-muted-foreground">(já configurado)</span>
                  )}
                </Label>
                <div className="relative">
                  <Input
                    id="zoom-client-secret"
                    type={showZoomSecret ? "text" : "password"}
                    placeholder={hasZoomCredentials ? "••••••••••••••••" : "Insira o Client Secret"}
                    value={zoomClientSecret}
                    onChange={(e) => setZoomClientSecret(e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowZoomSecret(!showZoomSecret)}
                  >
                    {showZoomSecret ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                onClick={handleConnectZoom}
                disabled={isConnecting || isSaving}
                className="w-full"
              >
                {(isConnecting || isSaving) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <ExternalLink className="mr-2 h-4 w-4" />
                Conectar com Zoom
              </Button>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="text-sm font-medium">Zoom ligado com sucesso</p>
                  <p className="text-xs text-muted-foreground">
                    As reuniões Zoom serão criadas automaticamente
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testConnection("zoom")}
                  disabled={isTesting}
                >
                  {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Testar Conexão
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => disconnect("zoom")}
                  disabled={isDisconnecting}
                >
                  {isDisconnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Unplug className="mr-2 h-4 w-4" />
                  Desligar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Google Meet Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Video className="h-4 w-4 text-emerald-500" />
              Google Meet
            </CardTitle>
            {isGoogleMeetConnected && (
              <div className="flex items-center gap-1 text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-xs font-medium">Conectado</span>
              </div>
            )}
          </div>
          <CardDescription>
            Conecte a sua conta Google para criar reuniões Meet automaticamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isGoogleMeetConnected ? (
            <>
              <p className="text-sm text-muted-foreground">
                Clique no botão abaixo para autorizar o FastCRM a criar reuniões no seu Google Calendar.
              </p>
              <Button
                onClick={handleConnectGoogle}
                disabled={isConnecting}
                className="w-full"
              >
                {isConnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <ExternalLink className="mr-2 h-4 w-4" />
                Conectar com Google
              </Button>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="text-sm font-medium">Google Meet ligado com sucesso</p>
                  <p className="text-xs text-muted-foreground">
                    As reuniões Meet serão criadas automaticamente
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testConnection("google_meet")}
                  disabled={isTesting}
                >
                  {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Testar Conexão
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => disconnect("google_meet")}
                  disabled={isDisconnecting}
                >
                  {isDisconnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Unplug className="mr-2 h-4 w-4" />
                  Desligar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
