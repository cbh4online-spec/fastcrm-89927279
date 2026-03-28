import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Bell, Loader2, Save } from "lucide-react";
import { useUpdateRenewalContract } from "@/hooks/useRenewals";
import { toast } from "sonner";

interface AlertSettings {
  thresholds: number[];
  notify_user: boolean;
  notify_client: boolean;
}

const DEFAULT_SETTINGS: AlertSettings = {
  thresholds: [30, 15, 7, 1],
  notify_user: true,
  notify_client: false,
};

const THRESHOLD_OPTIONS = [
  { value: 30, label: "30 dias antes" },
  { value: 15, label: "15 dias antes" },
  { value: 7, label: "7 dias antes" },
  { value: 1, label: "1 dia antes" },
  { value: 0, label: "No dia do vencimento" },
];

interface RenewalAlertSettingsProps {
  contractId: string;
  alertSettings: AlertSettings | null;
}

export function RenewalAlertSettings({ contractId, alertSettings }: RenewalAlertSettingsProps) {
  const [settings, setSettings] = useState<AlertSettings>(alertSettings || DEFAULT_SETTINGS);
  const updateContract = useUpdateRenewalContract();
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setSettings(alertSettings || DEFAULT_SETTINGS);
    setHasChanges(false);
  }, [alertSettings]);

  const toggleThreshold = (value: number) => {
    const newThresholds = settings.thresholds.includes(value)
      ? settings.thresholds.filter(t => t !== value)
      : [...settings.thresholds, value].sort((a, b) => b - a);
    setSettings({ ...settings, thresholds: newThresholds });
    setHasChanges(true);
  };

  const handleSave = () => {
    updateContract.mutate(
      { id: contractId, alert_settings: settings } as any,
      {
        onSuccess: () => {
          setHasChanges(false);
          toast.success("Configuração de alertas guardada");
        },
      }
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Alertas Automáticos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">Enviar alertas:</Label>
          <div className="space-y-2">
            {THRESHOLD_OPTIONS.map(opt => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={settings.thresholds.includes(opt.value)}
                  onCheckedChange={() => toggleThreshold(opt.value)}
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-3 pt-2 border-t">
          <Label className="text-xs text-muted-foreground">Destinatários:</Label>
          <div className="flex items-center justify-between">
            <Label htmlFor="notify-user" className="text-sm">Notificar utilizador (owner)</Label>
            <Switch
              id="notify-user"
              checked={settings.notify_user}
              onCheckedChange={(checked) => { setSettings({ ...settings, notify_user: checked }); setHasChanges(true); }}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="notify-client" className="text-sm">Notificar cliente</Label>
            <Switch
              id="notify-client"
              checked={settings.notify_client}
              onCheckedChange={(checked) => { setSettings({ ...settings, notify_client: checked }); setHasChanges(true); }}
            />
          </div>
        </div>

        {hasChanges && (
          <Button size="sm" onClick={handleSave} disabled={updateContract.isPending} className="w-full">
            {updateContract.isPending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-2 h-3.5 w-3.5" />}
            Guardar Alertas
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
