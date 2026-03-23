import { useState } from "react";
import { useTelegramConfig, useSaveTelegramConfig } from "@/hooks/useGroups";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Send, Bot, Bell, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function TelegramSettingsView() {
  const { data: config, isLoading } = useTelegramConfig();
  const saveConfig = useSaveTelegramConfig();
  const [testLoading, setTestLoading] = useState(false);

  const [botUsername, setBotUsername] = useState("");
  const [botName, setBotName] = useState("");
  const [alertGroupId, setAlertGroupId] = useState("");
  const [notifyLeads, setNotifyLeads] = useState(true);
  const [notifyDeals, setNotifyDeals] = useState(true);
  const [notifyProposals, setNotifyProposals] = useState(true);
  const [notifyInvoices, setNotifyInvoices] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Initialize form with config data
  if (config && !initialized) {
    setBotUsername(config.bot_username || "");
    setBotName(config.bot_name || "");
    setAlertGroupId(config.alert_group_chat_id?.toString() || "");
    setNotifyLeads(config.notify_new_leads ?? true);
    setNotifyDeals(config.notify_new_deals ?? true);
    setNotifyProposals(config.notify_proposals ?? true);
    setNotifyInvoices(config.notify_invoices ?? false);
    setInitialized(true);
  }

  const handleTestConnection = async () => {
    setTestLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-send`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            action: "getMe",
            workspace_id: config?.workspace_id || "",
          }),
        }
      );
      const data = await res.json();
      if (data.success && data.result) {
        setBotUsername(data.result.username || "");
        setBotName(data.result.first_name || "");
        toast.success(`Bot conectado: @${data.result.username}`);
      } else {
        toast.error(data.error || "Falha na conexão");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setTestLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await saveConfig.mutateAsync({
        bot_username: botUsername,
        bot_name: botName,
        alert_group_chat_id: alertGroupId ? parseInt(alertGroupId) : null,
        notify_new_leads: notifyLeads,
        notify_new_deals: notifyDeals,
        notify_proposals: notifyProposals,
        notify_invoices: notifyInvoices,
      });
      toast.success("Configuração Telegram guardada");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Telegram</h1>
        <p className="text-muted-foreground">
          Configure o bot Telegram para enviar e receber mensagens
        </p>
      </div>

      {/* Connection status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Conexão do Bot
          </CardTitle>
          <CardDescription>
            Teste a ligação ao bot Telegram configurado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Button onClick={handleTestConnection} disabled={testLoading} variant="outline">
              {testLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Testar Conexão
            </Button>
            {botUsername && (
              <Badge variant="outline" className="gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                @{botUsername}
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Username do Bot</Label>
              <Input value={botUsername} onChange={(e) => setBotUsername(e.target.value)} placeholder="@meubot" readOnly />
            </div>
            <div>
              <Label>Nome do Bot</Label>
              <Input value={botName} onChange={(e) => setBotName(e.target.value)} placeholder="FastCRM Bot" readOnly />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alert group */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Grupo de Alertas da Equipa
          </CardTitle>
          <CardDescription>
            Notificações automáticas sobre novos leads, propostas e deals
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Chat ID do Grupo de Alertas</Label>
            <Input
              value={alertGroupId}
              onChange={(e) => setAlertGroupId(e.target.value)}
              placeholder="Ex: -1001234567890"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Adicione o bot ao grupo Telegram e obtenha o Chat ID
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Novos Leads</Label>
              <Switch checked={notifyLeads} onCheckedChange={setNotifyLeads} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Novos Deals</Label>
              <Switch checked={notifyDeals} onCheckedChange={setNotifyDeals} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Propostas</Label>
              <Switch checked={notifyProposals} onCheckedChange={setNotifyProposals} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Facturas</Label>
              <Switch checked={notifyInvoices} onCheckedChange={setNotifyInvoices} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saveConfig.isPending} className="w-full">
        {saveConfig.isPending ? "A guardar..." : "Guardar Configuração"}
      </Button>
    </div>
  );
}
