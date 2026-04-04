import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StoreTrafficAlertsSettings } from "./StoreTrafficAlertsSettings";

interface StoreNotificationSettingsProps {
  form: {
    notification_email: string;
  };
  setForm: React.Dispatch<React.SetStateAction<any>>;
}

export function StoreNotificationSettings({ form, setForm }: StoreNotificationSettingsProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Notificações de Encomendas</CardTitle>
          <CardDescription>Email para receber alertas de novas encomendas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Email de Notificação</Label>
            <Input
              type="email"
              value={form.notification_email}
              onChange={(e) => setForm((p: any) => ({ ...p, notification_email: e.target.value }))}
              placeholder="admin@empresa.com"
            />
            <p className="text-xs text-muted-foreground">
              Receberá um email sempre que uma nova encomenda for paga.
            </p>
          </div>
        </CardContent>
      </Card>

      <StoreTrafficAlertsSettings />
    </div>
  );
}
