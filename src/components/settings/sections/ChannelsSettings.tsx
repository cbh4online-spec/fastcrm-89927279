import { SettingsSection, SettingsItem } from "../SettingsSection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InstagramConnectionCard } from "@/components/integrations/InstagramConnectionCard";
import { EmailChannelSettings } from "./EmailChannelSettings";
import {
  Mail,
  MessageSquare,
  FileInput,
  MessagesSquare,
  Share2,
  Webhook,
  Instagram,
  Phone,
  Globe,
} from "lucide-react";

interface ChannelsSettingsProps {
  searchQuery?: string;
  matchedSections?: Set<string>;
}

export function ChannelsSettings({ searchQuery = "", matchedSections }: ChannelsSettingsProps) {
  const hasSearch = searchQuery.trim().length > 0;

  const shouldShow = (sectionId: string) => {
    if (!hasSearch || !matchedSections) return true;
    return matchedSections.has(sectionId);
  };

  const visibleSections = [
    { id: "channels-email", show: shouldShow("channels-email") },
    { id: "channels-whatsapp-instagram", show: shouldShow("channels-whatsapp-instagram") },
    { id: "channels-forms", show: shouldShow("channels-forms") },
    { id: "channels-chat", show: shouldShow("channels-chat") },
    { id: "channels-social", show: shouldShow("channels-social") },
    { id: "channels-webhooks", show: shouldShow("channels-webhooks") },
  ];

  const hasVisibleSections = visibleSections.some(s => s.show);

  if (!hasVisibleSections && hasSearch) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhuma definição encontrada nesta categoria.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Email Channel - IMAP/SMTP Integration */}
      <EmailChannelSettings 
        searchQuery={searchQuery} 
        matchedSections={matchedSections ? new Set([...matchedSections, "email-channel"]) : undefined} 
      />

      {/* WhatsApp / Instagram */}
      {shouldShow("channels-whatsapp-instagram") && (
        <SettingsSection
          title="WhatsApp & Instagram"
          description="Canais de mensagens diretas"
          icon={<Instagram className="h-5 w-5" />}
        >
          <div className="space-y-4">
            <InstagramConnectionCard />
            
            <div className="border border-border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <Phone className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">WhatsApp Business</p>
                    <p className="text-sm text-muted-foreground">
                      Conectar conta WhatsApp Business
                    </p>
                  </div>
                </div>
                <Badge variant="secondary">Em breve</Badge>
              </div>
            </div>
          </div>
        </SettingsSection>
      )}

      {/* Forms */}
      {shouldShow("channels-forms") && (
        <SettingsSection
          title="Formulários"
          description="Captura de leads via formulários web"
          icon={<FileInput className="h-5 w-5" />}
        >
          <SettingsItem
            title="Formulários Incorporados"
            description="Gerar código de incorporação para o seu site"
            action={<Button variant="outline">Criar Formulário</Button>}
          />
          <SettingsItem
            title="Landing Pages"
            description="Páginas de captura de leads integradas"
            action={<Button variant="outline">Ver Landing Pages</Button>}
          />
        </SettingsSection>
      )}

      {/* Chat */}
      {shouldShow("channels-chat") && (
        <SettingsSection
          title="Chat ao Vivo"
          description="Widget de chat para o seu website"
          icon={<MessagesSquare className="h-5 w-5" />}
          isPremium
        >
          <SettingsItem
            title="Widget de Chat"
            description="Adicionar chat ao vivo ao seu site"
            action={<Button variant="outline">Configurar Widget</Button>}
          />
          <SettingsItem
            title="Respostas Automáticas"
            description="Configurar mensagens automáticas fora de horário"
            action={<Button variant="outline">Configurar</Button>}
          />
        </SettingsSection>
      )}

      {/* Social */}
      {shouldShow("channels-social") && (
        <SettingsSection
          title="Redes Sociais"
          description="Conectar páginas e perfis sociais"
          icon={<Share2 className="h-5 w-5" />}
        >
          <SettingsItem
            title="Facebook Pages"
            description="Capturar leads de formulários do Facebook"
            action={<Button variant="outline">Conectar</Button>}
          />
          <SettingsItem
            title="LinkedIn"
            description="Importar leads do LinkedIn"
            action={
              <Badge variant="secondary">Em breve</Badge>
            }
          />
        </SettingsSection>
      )}

      {/* Webhooks */}
      {shouldShow("channels-webhooks") && (
        <SettingsSection
          title="Webhooks de Entrada"
          description="Receber leads de fontes externas"
          icon={<Webhook className="h-5 w-5" />}
        >
          <SettingsItem
            title="URL de Webhook"
            description="Endpoint para receber dados de leads"
            action={<Button variant="outline">Gerar URL</Button>}
          />
          <SettingsItem
            title="Mapeamento de Campos"
            description="Configurar como os dados são mapeados"
            action={<Button variant="outline">Configurar</Button>}
          />
        </SettingsSection>
      )}
    </div>
  );
}
