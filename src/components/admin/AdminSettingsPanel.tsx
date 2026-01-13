import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAdminSettings } from "@/hooks/useAdminSettings";
import { Save, Loader2 } from "lucide-react";

export function AdminSettingsPanel() {
  const { settings, upsertSetting, isLoading } = useAdminSettings();
  
  const controlPlaneSetting = settings.find(s => s.key === "control_plane");
  const [controlPlaneUrl, setControlPlaneUrl] = useState(
    (controlPlaneSetting?.value as { url?: string })?.url ?? ""
  );
  const [controlPlaneEnabled, setControlPlaneEnabled] = useState(
    (controlPlaneSetting?.value as { enabled?: boolean })?.enabled ?? false
  );
  
  const [saving, setSaving] = useState(false);

  const handleSaveControlPlane = async () => {
    setSaving(true);
    await upsertSetting.mutateAsync({
      key: "control_plane",
      value: {
        url: controlPlaneUrl,
        enabled: controlPlaneEnabled,
      },
      description: "Configuração do Control Plane externo",
    });
    setSaving(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Control Plane</CardTitle>
          <CardDescription>
            Configure a integração com um Control Plane externo para validação de tokens e routing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="cp-enabled">Ativar Control Plane</Label>
              <p className="text-sm text-muted-foreground">
                Quando ativo, a app validará tokens com o Control Plane externo
              </p>
            </div>
            <Switch
              id="cp-enabled"
              checked={controlPlaneEnabled}
              onCheckedChange={setControlPlaneEnabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cp-url">URL do Control Plane</Label>
            <Input
              id="cp-url"
              placeholder="https://control-plane.example.com/api"
              value={controlPlaneUrl}
              onChange={(e) => setControlPlaneUrl(e.target.value)}
              disabled={!controlPlaneEnabled}
            />
          </div>

          <Button onClick={handleSaveControlPlane} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Guardar
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configurações Globais</CardTitle>
          <CardDescription>
            Definições que afetam todos os workspaces
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Configurações adicionais podem ser adicionadas aqui conforme necessário.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
