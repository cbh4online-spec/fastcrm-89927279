import { SettingsSection, SettingsItem } from "../SettingsSection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  Code,
  Webhook,
  Plug,
  Variable,
  ExternalLink,
  Boxes,
  Key,
  Zap,
  Settings,
  Video,
} from "lucide-react";
import { WorkspaceStripeSettings } from "./WorkspaceStripeSettings";
import { WorkspaceGHLSettings } from "./WorkspaceGHLSettings";
import { WorkspaceVideoSettings } from "./WorkspaceVideoSettings";
import { useWorkspaceStripeConfig } from "@/hooks/useWorkspaceStripeConfig";
import { useWorkspaceGHLConfig } from "@/hooks/useWorkspaceGHLConfig";
import { useWorkspaceVideoConfig } from "@/hooks/useWorkspaceVideoConfig";
import { useUserRole } from "@/hooks/useUserRole";

const integrations = [
  {
    name: "Zapier",
    description: "Conectar com milhares de apps",
    icon: Zap,
    connected: false,
    color: "text-orange-500",
  },
  {
    name: "Make (Integromat)",
    description: "Automações avançadas",
    icon: Boxes,
    connected: false,
    color: "text-blue-500",
  },
];

interface IntegrationsSettingsProps {
  searchQuery?: string;
  matchedSections?: Set<string>;
}

export function IntegrationsSettings({ searchQuery = "", matchedSections }: IntegrationsSettingsProps) {
  const { isSuperAdmin } = useUserRole();
  const { isConfigured: isStripeConfigured } = useWorkspaceStripeConfig();
  const { isConfigured: isGHLConfigured } = useWorkspaceGHLConfig();
  const { isZoomConfigured, isGoogleMeetConnected } = useWorkspaceVideoConfig();
  const hasSearch = searchQuery.trim().length > 0;

  const shouldShow = (sectionId: string) => {
    if (!hasSearch || !matchedSections) return true;
    return matchedSections.has(sectionId);
  };

  const visibleSections = [
    { id: "integrations-stripe", show: shouldShow("integrations-stripe") },
    { id: "integrations-ghl", show: shouldShow("integrations-ghl") },
    { id: "integrations-video", show: shouldShow("integrations-video") },
    { id: "integrations-api", show: shouldShow("integrations-api") },
    { id: "integrations-external", show: shouldShow("integrations-external") },
    { id: "integrations-variables", show: shouldShow("integrations-variables") },
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
      {shouldShow("integrations-stripe") && (
        <SettingsSection
          title="Pagamentos (Stripe)"
          description="Configure a integração Stripe para processar pagamentos"
          icon={<CreditCard className="h-5 w-5" />}
        >
          <WorkspaceStripeSettings />
        </SettingsSection>
      )}

      {isSuperAdmin && shouldShow("integrations-ghl") && (
        <SettingsSection
          title="GoHighLevel"
          description="Sincronize contactos e mensagens do GoHighLevel"
          icon={<Zap className="h-5 w-5 text-orange-500" />}
        >
          <WorkspaceGHLSettings />
        </SettingsSection>
      )}

      {shouldShow("integrations-video") && (
        <SettingsSection
          title="Videoconferência"
          description="Configure Zoom e Google Meet para criar reuniões automaticamente"
          icon={<Video className="h-5 w-5" />}
        >
          <WorkspaceVideoSettings />
        </SettingsSection>
      )}

      {shouldShow("integrations-api") && (
        <SettingsSection
          title="API & Webhooks"
          description="Acesso programático ao seu CRM"
          icon={<Code className="h-5 w-5" />}
        >
          <SettingsItem
            title="Chaves de API"
            description="Gerar e gerir chaves de acesso à API"
            icon={<Key className="h-4 w-4" />}
            action={<Button variant="outline">Gerir Chaves</Button>}
          />
          <SettingsItem
            title="Documentação da API"
            description="Referência completa da API REST"
            icon={<ExternalLink className="h-4 w-4" />}
            action={<Button variant="outline">Ver Docs</Button>}
          />
          <SettingsItem
            title="Webhooks de Saída"
            description="Enviar eventos para sistemas externos"
            icon={<Webhook className="h-4 w-4" />}
            action={<Button variant="outline">Configurar</Button>}
          />
        </SettingsSection>
      )}

      {shouldShow("integrations-external") && (
        <SettingsSection
          title="Outras Integrações"
          description="Conectar com outras ferramentas"
          icon={<Plug className="h-5 w-5" />}
        >
          {/* Stripe summary card */}
          <div className="flex items-center justify-between p-4 border border-border rounded-lg mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <CreditCard className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="font-medium">Stripe</p>
                <p className="text-sm text-muted-foreground">
                  Processar pagamentos e gerir subscrições
                </p>
              </div>
            </div>
            {isStripeConfigured ? (
              <Badge className="bg-emerald-500 text-white">Conectado</Badge>
            ) : (
              <Badge variant="secondary">Não configurado</Badge>
            )}
          </div>

          {/* GHL summary card - Super Admin only */}
          {isSuperAdmin && (
            <div className="flex items-center justify-between p-4 border border-border rounded-lg mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Zap className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="font-medium">GoHighLevel</p>
                  <p className="text-sm text-muted-foreground">
                    Sincronizar contactos e mensagens
                  </p>
                </div>
              </div>
              {isGHLConfigured ? (
                <Badge className="bg-emerald-500 text-white">Conectado</Badge>
              ) : (
                <Badge variant="secondary">Não configurado</Badge>
              )}
            </div>
          )}
          
          <div className="grid gap-4">
            {integrations.map((integration) => (
              <div
                key={integration.name}
                className="flex items-center justify-between p-4 border border-border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <integration.icon className={`h-5 w-5 ${integration.color}`} />
                  </div>
                  <div>
                    <p className="font-medium">{integration.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {integration.description}
                    </p>
                  </div>
                </div>
                {integration.connected ? (
                  <Badge className="bg-emerald-500 text-white">Conectado</Badge>
                ) : (
                  <Button variant="outline" size="sm">
                    Conectar
                  </Button>
                )}
              </div>
            ))}
          </div>
        </SettingsSection>
      )}

      {shouldShow("integrations-variables") && (
        <SettingsSection
          title="Variáveis & Segredos"
          description="Variáveis de ambiente e configurações"
          icon={<Variable className="h-5 w-5" />}
        >
          <SettingsItem
            title="Variáveis de Ambiente"
            description="Definir variáveis globais para automações"
            action={<Button variant="outline">Gerir</Button>}
          />
          <SettingsItem
            title="Segredos"
            description="Armazenar chaves e tokens de forma segura"
            action={<Button variant="outline">Gerir Segredos</Button>}
          />
        </SettingsSection>
      )}
    </div>
  );
}
