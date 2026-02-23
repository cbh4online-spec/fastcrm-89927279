import { useState } from "react";
import { ClientLayout } from "@/components/client-portal/ClientLayout";
import { useNotificationSettings } from "@/hooks/client-portal/useNotificationSettings";
import { useReplenishmentRules } from "@/hooks/client-portal/useReplenishmentRules";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Mail, MessageCircle, Trash2, Plus, Loader2 } from "lucide-react";

const FREQUENCY_OPTIONS = [
  { value: "weekly", label: "Semanal" },
  { value: "biweekly", label: "Quinzenal" },
  { value: "monthly", label: "Mensal" },
];

export default function ClientNotificationSettingsPage() {
  const { settings, isLoading, upsertSettings, saving } = useNotificationSettings();
  const { rules, deleteRule } = useReplenishmentRules();

  const handleToggle = async (field: string, value: boolean) => {
    await upsertSettings({ [field]: value });
  };

  const handleFrequencyChange = async (value: string) => {
    await upsertSettings({ frequency: value });
  };

  if (isLoading) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6" /> Definições de Notificações
          </h1>
          <p className="text-muted-foreground">Configure alertas de reposição e comunicações</p>
        </div>

        {/* Channels */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Canais de Comunicação</CardTitle>
            <CardDescription>Escolha como deseja receber alertas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">Receber sugestões por email</p>
                </div>
              </div>
              <Switch
                checked={settings?.channel_email ?? true}
                onCheckedChange={(v) => handleToggle("channel_email", v)}
                disabled={saving}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageCircle className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">WhatsApp</p>
                  <p className="text-sm text-muted-foreground">Receber alertas via WhatsApp (opt-in obrigatório)</p>
                </div>
              </div>
              <Switch
                checked={settings?.opt_in_whatsapp ?? false}
                onCheckedChange={(v) => handleToggle("opt_in_whatsapp", v)}
                disabled={saving}
              />
            </div>
          </CardContent>
        </Card>

        {/* Frequency */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Frequência</CardTitle>
            <CardDescription>Com que frequência deseja receber sugestões</CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={settings?.frequency || "monthly"}
              onValueChange={handleFrequencyChange}
              disabled={saving}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Replenishment Rules */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Regras de Reposição</CardTitle>
            <CardDescription>Regras personalizadas para alertas automáticos</CardDescription>
          </CardHeader>
          <CardContent>
            {rules.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Sem regras configuradas</p>
            ) : (
              <div className="space-y-2">
                {rules.map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <Badge variant="outline" className="mr-2 capitalize">{rule.scope}</Badge>
                      <span className="text-sm">{rule.reference_id}</span>
                      <span className="text-xs text-muted-foreground ml-2">({rule.reorder_threshold_days} dias)</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteRule(rule.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Disable All */}
        <Card className="border-destructive/30">
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <p className="font-medium">Cancelar todos os alertas</p>
              <p className="text-sm text-muted-foreground">Desativa email e WhatsApp num clique</p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => upsertSettings({ channel_email: false, channel_whatsapp: false, opt_in_whatsapp: false })}
              disabled={saving}
            >
              Desativar Tudo
            </Button>
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  );
}
