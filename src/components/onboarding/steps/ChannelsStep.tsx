import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  FormInput,
  Mail,
  MessageCircle,
  Instagram,
  Phone,
  Globe,
  Users,
  MessagesSquare,
} from "lucide-react";

const channels = [
  { 
    id: "forms", 
    label: "Formulários", 
    sublabel: "Site, landing pages", 
    icon: FormInput 
  },
  { 
    id: "email", 
    label: "Email", 
    sublabel: "Contactos por email", 
    icon: Mail 
  },
  { 
    id: "whatsapp", 
    label: "WhatsApp", 
    sublabel: "Mensagens diretas", 
    icon: MessageCircle 
  },
  { 
    id: "instagram", 
    label: "Instagram", 
    sublabel: "DMs e comentários", 
    icon: Instagram 
  },
  { 
    id: "phone", 
    label: "Telefone", 
    sublabel: "Chamadas e SMS", 
    icon: Phone 
  },
  { 
    id: "website", 
    label: "Chat no Site", 
    sublabel: "Widget de chat", 
    icon: MessagesSquare 
  },
  { 
    id: "referrals", 
    label: "Referências", 
    sublabel: "Boca-a-boca", 
    icon: Users 
  },
  { 
    id: "other", 
    label: "Outros", 
    sublabel: "Feiras, eventos, etc.", 
    icon: Globe 
  },
];

interface ChannelsStepProps {
  value: string[];
  onChange: (value: string[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export function ChannelsStep({
  value,
  onChange,
  onNext,
  onBack,
}: ChannelsStepProps) {
  const toggleChannel = (channelId: string) => {
    if (value.includes(channelId)) {
      onChange(value.filter((id) => id !== channelId));
    } else {
      onChange([...value, channelId]);
    }
  };

  const isValid = value.length > 0;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">
          Por onde chegam os teus contactos?
        </h2>
        <p className="text-muted-foreground">
          Seleciona todos os canais que usas (podes escolher vários)
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {channels.map((channel) => {
          const isSelected = value.includes(channel.id);
          return (
            <Card
              key={channel.id}
              className={cn(
                "cursor-pointer transition-all hover:border-primary/50 hover:shadow-md",
                isSelected && "border-primary ring-2 ring-primary/20 bg-primary/5"
              )}
              onClick={() => toggleChannel(channel.id)}
            >
              <CardContent className="p-4 text-center">
                <div
                  className={cn(
                    "w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center transition-colors",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <channel.icon className="w-5 h-5" />
                </div>
                <p className="font-medium text-sm text-foreground">{channel.label}</p>
                <p className="text-xs text-muted-foreground">{channel.sublabel}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="p-4 rounded-lg bg-muted/50 border border-border">
        <p className="text-sm text-muted-foreground text-center">
          💡 <span className="font-medium">Dica:</span> Vamos preparar o CRM para capturar leads de todos estes canais automaticamente.
        </p>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <Button onClick={onNext} disabled={!isValid} size="lg">
          Gerar Configuração com IA
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
