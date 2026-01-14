import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageSquare, Mail, MessageCircle, Instagram, Timer, AlertCircle } from "lucide-react";
import { AutomationTrigger } from "@/hooks/useAutomations";

export interface InboxTriggerConfig {
  channels?: string[];
  no_reply_hours?: number;
  priority_from?: string;
  priority_to?: string;
}

interface InboxTriggerConfigProps {
  trigger: AutomationTrigger;
  config: InboxTriggerConfig;
  onChange: (config: InboxTriggerConfig) => void;
}

const channelOptions = [
  { value: "email", label: "Email", icon: Mail },
  { value: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { value: "instagram", label: "Instagram", icon: Instagram },
  { value: "webchat", label: "Webchat", icon: MessageSquare },
];

const priorityOptions = [
  { value: "high", label: "Alta" },
  { value: "medium", label: "Média" },
  { value: "low", label: "Baixa" },
];

export function InboxTriggerConfig({ trigger, config, onChange }: InboxTriggerConfigProps) {
  const selectedChannels = config.channels || [];

  const handleChannelToggle = (channel: string, checked: boolean) => {
    const newChannels = checked
      ? [...selectedChannels, channel]
      : selectedChannels.filter((c) => c !== channel);
    onChange({ ...config, channels: newChannels });
  };

  // Message received or first message from lead
  if (trigger === "message_received" || trigger === "first_message_from_lead") {
    return (
      <Card className="p-4 space-y-4 border-dashed">
        <div className="flex items-center gap-2 text-sm font-medium">
          <MessageSquare className="h-4 w-4 text-blue-500" />
          Configuração de Mensagem
        </div>

        <div className="space-y-3">
          <Label>Canais (deixe vazio para todos)</Label>
          <div className="grid grid-cols-2 gap-3">
            {channelOptions.map((channel) => {
              const Icon = channel.icon;
              return (
                <div
                  key={channel.value}
                  className="flex items-center space-x-2 p-2 border rounded-lg hover:bg-muted/50"
                >
                  <Checkbox
                    id={`channel-${channel.value}`}
                    checked={selectedChannels.includes(channel.value)}
                    onCheckedChange={(checked) =>
                      handleChannelToggle(channel.value, checked as boolean)
                    }
                  />
                  <label
                    htmlFor={`channel-${channel.value}`}
                    className="flex items-center gap-2 text-sm cursor-pointer flex-1"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {channel.label}
                  </label>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            {trigger === "first_message_from_lead"
              ? "Acionado apenas na primeira mensagem de um lead em cada conversa."
              : "Acionado a cada mensagem recebida nos canais selecionados."}
          </p>
        </div>
      </Card>
    );
  }

  // Conversation no reply
  if (trigger === "conversation_no_reply") {
    return (
      <Card className="p-4 space-y-4 border-dashed">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Timer className="h-4 w-4 text-orange-500" />
          Tempo Sem Resposta
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Label className="whitespace-nowrap">Sem resposta há</Label>
            <Input
              type="number"
              min={1}
              className="w-24"
              placeholder="24"
              value={config.no_reply_hours || ""}
              onChange={(e) =>
                onChange({ ...config, no_reply_hours: parseInt(e.target.value) || undefined })
              }
            />
            <span className="text-sm text-muted-foreground">horas</span>
          </div>

          <div className="space-y-3">
            <Label>Canais (deixe vazio para todos)</Label>
            <div className="grid grid-cols-2 gap-3">
              {channelOptions.map((channel) => {
                const Icon = channel.icon;
                return (
                  <div
                    key={channel.value}
                    className="flex items-center space-x-2 p-2 border rounded-lg hover:bg-muted/50"
                  >
                    <Checkbox
                      id={`channel-noreply-${channel.value}`}
                      checked={selectedChannels.includes(channel.value)}
                      onCheckedChange={(checked) =>
                        handleChannelToggle(channel.value, checked as boolean)
                      }
                    />
                    <label
                      htmlFor={`channel-noreply-${channel.value}`}
                      className="flex items-center gap-2 text-sm cursor-pointer flex-1"
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      {channel.label}
                    </label>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            A automação será acionada quando não houver resposta pelo tempo especificado.
          </p>
        </div>
      </Card>
    );
  }

  // Conversation resolved
  if (trigger === "conversation_resolved") {
    return (
      <Card className="p-4 space-y-4 border-dashed">
        <div className="flex items-center gap-2 text-sm font-medium">
          <MessageSquare className="h-4 w-4 text-green-500" />
          Conversa Resolvida
        </div>

        <div className="space-y-3">
          <Label>Canais (deixe vazio para todos)</Label>
          <div className="grid grid-cols-2 gap-3">
            {channelOptions.map((channel) => {
              const Icon = channel.icon;
              return (
                <div
                  key={channel.value}
                  className="flex items-center space-x-2 p-2 border rounded-lg hover:bg-muted/50"
                >
                  <Checkbox
                    id={`channel-resolved-${channel.value}`}
                    checked={selectedChannels.includes(channel.value)}
                    onCheckedChange={(checked) =>
                      handleChannelToggle(channel.value, checked as boolean)
                    }
                  />
                  <label
                    htmlFor={`channel-resolved-${channel.value}`}
                    className="flex items-center gap-2 text-sm cursor-pointer flex-1"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {channel.label}
                  </label>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Acionado quando uma conversa é marcada como resolvida/fechada.
          </p>
        </div>
      </Card>
    );
  }

  // Conversation priority changed
  if (trigger === "conversation_priority_changed") {
    return (
      <Card className="p-4 space-y-4 border-dashed">
        <div className="flex items-center gap-2 text-sm font-medium">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          Prioridade Alterada
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>De (opcional)</Label>
              <Select
                value={config.priority_from || ""}
                onValueChange={(value) =>
                  onChange({ ...config, priority_from: value || undefined })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Qualquer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Qualquer</SelectItem>
                  {priorityOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Para</Label>
              <Select
                value={config.priority_to || ""}
                onValueChange={(value) =>
                  onChange({ ...config, priority_to: value || undefined })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Qualquer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Qualquer</SelectItem>
                  {priorityOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Canais (deixe vazio para todos)</Label>
            <div className="grid grid-cols-2 gap-3">
              {channelOptions.map((channel) => {
                const Icon = channel.icon;
                return (
                  <div
                    key={channel.value}
                    className="flex items-center space-x-2 p-2 border rounded-lg hover:bg-muted/50"
                  >
                    <Checkbox
                      id={`channel-priority-${channel.value}`}
                      checked={selectedChannels.includes(channel.value)}
                      onCheckedChange={(checked) =>
                        handleChannelToggle(channel.value, checked as boolean)
                      }
                    />
                    <label
                      htmlFor={`channel-priority-${channel.value}`}
                      className="flex items-center gap-2 text-sm cursor-pointer flex-1"
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      {channel.label}
                    </label>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Acionado quando a prioridade de uma conversa é alterada.
          </p>
        </div>
      </Card>
    );
  }

  return null;
}

// Helper to check if trigger is an inbox trigger
export function isInboxTrigger(trigger: AutomationTrigger): boolean {
  return [
    "message_received",
    "first_message_from_lead",
    "conversation_no_reply",
    "conversation_resolved",
    "conversation_priority_changed",
  ].includes(trigger);
}

// Helper to format inbox trigger config in plain language
export function formatInboxTriggerConfig(
  trigger: AutomationTrigger,
  config?: InboxTriggerConfig
): string {
  if (!config) return "";

  const channels = config.channels?.length
    ? config.channels.join(", ")
    : "todos os canais";

  switch (trigger) {
    case "message_received":
      return `em ${channels}`;
    case "first_message_from_lead":
      return `primeira mensagem em ${channels}`;
    case "conversation_no_reply":
      return config.no_reply_hours
        ? `sem resposta há ${config.no_reply_hours}h em ${channels}`
        : `sem resposta em ${channels}`;
    case "conversation_resolved":
      return `conversa resolvida em ${channels}`;
    case "conversation_priority_changed": {
      const from = config.priority_from || "qualquer";
      const to = config.priority_to || "qualquer";
      return `prioridade alterada de ${from} para ${to} em ${channels}`;
    }
    default:
      return "";
  }
}
