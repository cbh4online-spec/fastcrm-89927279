import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  Eye,
  EyeOff,
  Info,
  Video,
  Monitor,
} from "lucide-react";
import { useWorkspaceVideoConfig, SaveVideoConfigInput } from "@/hooks/useWorkspaceVideoConfig";
import { toast } from "sonner";

export function WorkspaceVideoSettings() {
  const {
    config,
    isLoading,
    isZoomConfigured,
    isGoogleMeetConfigured,
    hasZoomCredentials,
    hasGoogleCredentials,
    saveConfig,
    isSaving,
    testZoom,
    isTestingZoom,
    testGoogleMeet,
    isTestingGoogle,
  } = useWorkspaceVideoConfig();

  // Zoom fields
  const [zoomAccountId, setZoomAccountId] = useState("");
  const [zoomClientId, setZoomClientId] = useState("");
  const [zoomClientSecret, setZoomClientSecret] = useState("");
  const [showZoomSecret, setShowZoomSecret] = useState(false);
  const [zoomEnabled, setZoomEnabled] = useState(false);

  // Google Meet fields
  const [googleServiceAccountJson, setGoogleServiceAccountJson] = useState("");
  const [showGoogleJson, setShowGoogleJson] = useState(false);
  const [googleCalendarEmail, setGoogleCalendarEmail] = useState("");
  const [googleMeetEnabled, setGoogleMeetEnabled] = useState(false);

  // Sync form with config
  useEffect(() => {
    if (config) {
      setZoomAccountId(config.zoom_account_id || "");
      setZoomClientId(config.zoom_client_id || "");
      setZoomEnabled(config.zoom_enabled);
      setGoogleCalendarEmail(config.google_calendar_email || "");
      setGoogleMeetEnabled(config.google_meet_enabled);
    }
  }, [config]);

  const handleSave = () => {
    const input: SaveVideoConfigInput = {
      zoom_account_id: zoomAccountId.trim(),
      zoom_client_id: zoomClientId.trim(),
      zoom_enabled: zoomEnabled,
      google_calendar_email: googleCalendarEmail.trim(),
      google_meet_enabled: googleMeetEnabled,
    };

    if (zoomClientSecret.trim()) {
      input.zoom_client_secret = zoomClientSecret.trim();
    }

    if (googleServiceAccountJson.trim()) {
      input.google_service_account_json = googleServiceAccountJson.trim();
    }

    // Validate zoom if enabled
    if (zoomEnabled) {
      if (!zoomAccountId.trim() || !zoomClientId.trim()) {
        toast.error("Preencha Account ID e Client ID do Zoom");
        return;
      }
      if (!hasZoomCredentials && !zoomClientSecret.trim()) {
        toast.error("Insira o Client Secret do Zoom");
        return;
      }
    }

    // Validate google meet if enabled
    if (googleMeetEnabled) {
      if (!googleCalendarEmail.trim()) {
        toast.error("Preencha o email do calendário Google");
        return;
      }
      if (!hasGoogleCredentials && !googleServiceAccountJson.trim()) {
        toast.error("Insira o JSON da Service Account");
        return;
      }
    }

    saveConfig(input);
    setZoomClientSecret("");
    setGoogleServiceAccountJson("");
  };

  const handleTestZoom = () => {
    const secret = zoomClientSecret.trim() || (hasZoomCredentials ? "__stored__" : "");
    if (!zoomAccountId.trim() || !zoomClientId.trim() || !secret) {
      toast.error("Preencha todos os campos do Zoom para testar");
      return;
    }
    testZoom({
      accountId: zoomAccountId.trim(),
      clientId: zoomClientId.trim(),
      clientSecret: zoomClientSecret.trim() || "__use_stored__",
    });
  };

  const handleTestGoogleMeet = () => {
    const json = googleServiceAccountJson.trim() || (hasGoogleCredentials ? "__stored__" : "");
    if (!json || !googleCalendarEmail.trim()) {
      toast.error("Preencha todos os campos do Google Meet para testar");
      return;
    }
    testGoogleMeet({
      serviceAccountJson: googleServiceAccountJson.trim() || "__use_stored__",
      calendarEmail: googleCalendarEmail.trim(),
    });
  };

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
          {isZoomConfigured && (
            <Badge className="bg-blue-500 text-white">Zoom ativo</Badge>
          )}
          {isGoogleMeetConfigured && (
            <Badge className="bg-emerald-500 text-white">Meet ativo</Badge>
          )}
          {!isZoomConfigured && !isGoogleMeetConfigured && (
            <Badge variant="outline">Não configurado</Badge>
          )}
        </div>
      </div>

      {/* Zoom Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Monitor className="h-4 w-4 text-blue-500" />
            Zoom
          </CardTitle>
          <CardDescription>
            Criar reuniões Zoom automaticamente via Server-to-Server OAuth
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Crie uma app "Server-to-Server OAuth" em{" "}
              <a
                href="https://marketplace.zoom.us"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                marketplace.zoom.us
              </a>
              . Necessita dos scopes: <code>meeting:write:meeting</code>.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="zoom-account-id">Account ID</Label>
            <Input
              id="zoom-account-id"
              placeholder="Ex: AbCdEf123..."
              value={zoomAccountId}
              onChange={(e) => setZoomAccountId(e.target.value)}
            />
          </div>

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
            {hasZoomCredentials && (
              <p className="text-xs text-muted-foreground">
                Deixe em branco para manter o secret atual
              </p>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <Label htmlFor="zoom-enabled">Zoom Ativo</Label>
              <p className="text-xs text-muted-foreground">
                Disponibilizar Zoom ao criar reuniões
              </p>
            </div>
            <Switch
              id="zoom-enabled"
              checked={zoomEnabled}
              onCheckedChange={setZoomEnabled}
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleTestZoom}
            disabled={isTestingZoom || (!zoomAccountId && !zoomClientId)}
          >
            {isTestingZoom && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Testar Zoom
          </Button>
        </CardContent>
      </Card>

      {/* Google Meet Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Video className="h-4 w-4 text-emerald-500" />
            Google Meet
          </CardTitle>
          <CardDescription>
            Criar reuniões Google Meet via Service Account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              1. Ative a Google Calendar API no{" "}
              <a
                href="https://console.cloud.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Google Cloud Console
              </a>
              .{" "}
              2. Crie uma Service Account e gere uma chave JSON.{" "}
              3. Partilhe o calendário com o email da Service Account.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="google-calendar-email">Email do Calendário</Label>
            <Input
              id="google-calendar-email"
              type="email"
              placeholder="exemplo@empresa.com ou primary"
              value={googleCalendarEmail}
              onChange={(e) => setGoogleCalendarEmail(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              O calendário onde as reuniões serão criadas. Use "primary" para o calendário principal.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="google-sa-json">
              Service Account JSON{" "}
              {hasGoogleCredentials && (
                <span className="text-muted-foreground">(já configurado)</span>
              )}
            </Label>
            <div className="relative">
              <Textarea
                id="google-sa-json"
                placeholder={
                  hasGoogleCredentials
                    ? "JSON já configurado. Cole um novo para substituir."
                    : '{"type": "service_account", "project_id": "...", ...}'
                }
                value={showGoogleJson ? googleServiceAccountJson : (googleServiceAccountJson ? "••••••••" : "")}
                onChange={(e) => setGoogleServiceAccountJson(e.target.value)}
                onFocus={() => setShowGoogleJson(true)}
                rows={4}
                className="font-mono text-xs"
              />
            </div>
            {hasGoogleCredentials && (
              <p className="text-xs text-muted-foreground">
                Deixe em branco para manter o JSON atual
              </p>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <Label htmlFor="google-meet-enabled">Google Meet Ativo</Label>
              <p className="text-xs text-muted-foreground">
                Disponibilizar Google Meet ao criar reuniões
              </p>
            </div>
            <Switch
              id="google-meet-enabled"
              checked={googleMeetEnabled}
              onCheckedChange={setGoogleMeetEnabled}
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleTestGoogleMeet}
            disabled={isTestingGoogle || (!googleCalendarEmail && !hasGoogleCredentials)}
          >
            {isTestingGoogle && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Testar Google Meet
          </Button>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button onClick={handleSave} disabled={isSaving} className="w-full">
        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Guardar Configuração
      </Button>
    </div>
  );
}
