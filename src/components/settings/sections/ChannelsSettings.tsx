import { SettingsSection, SettingsItem } from "../SettingsSection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InstagramConnectionCard } from "@/components/integrations/InstagramConnectionCard";
import { WhatsAppConnectionCard } from "@/components/integrations/WhatsAppConnectionCard";
import { EmailChannelSettings } from "./EmailChannelSettings";
import { useWorkspaceGHLConfig } from "@/hooks/useWorkspaceGHLConfig";
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
  Zap,
} from "lucide-react";

interface ChannelsSettingsProps {
  searchQuery?: string;
  matchedSections?: Set<string>;
}

export function ChannelsSettings({ searchQuery = "", matchedSections }: ChannelsSettingsProps) {
  const { isConfigured: isGHLConfigured } = useWorkspaceGHLConfig();
  const hasSearch = searchQuery.trim().length > 0;

  const shouldShow = (sectionId: string) => {
    if (!hasSearch || !matchedSections) return true;
    return matchedSections.has(sectionId);
  };

  const visibleSections = [
    { id: "channels-email", show: shouldShow("channels-email") },
    { id: "channels-whatsapp-instagram", show: shouldShow("channels-whatsapp-instagram") },
    { id: "channels-sms", show: shouldShow("channels-sms") },
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
            {isGHLConfigured && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/30">
                <Zap className="h-4 w-4 text-orange-500" />
                <p className="text-sm text-muted-foreground">
                  Estes canais estão conectados via <span className="font-medium text-foreground">GoHighLevel</span>. As mensagens são sincronizadas automaticamente.
                </p>
              </div>
            )}
            
            <InstagramConnectionCard />
            
            <WhatsAppConnectionCard />
          </div>
        </SettingsSection>
      )}

      {/* SMS */}
      {shouldShow("channels-sms") && (
        <SettingsSection
          title="SMS"
          description="Mensagens de texto"
          icon={<MessageSquare className="h-5 w-5" />}
        >
          <div className="space-y-4">
            {isGHLConfigured && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/30">
                <Zap className="h-4 w-4 text-orange-500" />
                <p className="text-sm text-muted-foreground">
                  SMS está conectado via <span className="font-medium text-foreground">GoHighLevel</span>. As mensagens são sincronizadas automaticamente.
                </p>
              </div>
            )}
            <SettingsItem
              title="Número de Telefone"
              description={isGHLConfigured ? "Configurado via GoHighLevel" : "Configurar número para envio de SMS"}
              action={
                isGHLConfigured ? (
                  <Badge className="bg-orange-500 text-white">Via GHL</Badge>
                ) : (
                  <Button variant="outline">Configurar</Button>
                )
              }
            />
            <SettingsItem
              title="Templates SMS"
              description="Gerir templates de mensagens de texto"
              action={<Button variant="outline">Ver Templates</Button>}
            />
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
          {isGHLConfigured && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/30 mb-4">
              <Zap className="h-4 w-4 text-orange-500" />
              <p className="text-sm text-muted-foreground">
                Facebook Messenger está conectado via <span className="font-medium text-foreground">GoHighLevel</span>.
              </p>
            </div>
          )}
          <SettingsItem
            title="Facebook Pages"
            description={isGHLConfigured ? "Conectado via GoHighLevel" : "Capturar leads de formulários do Facebook"}
            action={
              isGHLConfigured ? (
                <Badge className="bg-orange-500 text-white">Via GHL</Badge>
              ) : (
                <Button variant="outline">Conectar</Button>
              )
            }
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
