import { Link } from "react-router-dom";
import { SettingsSection, SettingsItem } from "../SettingsSection";
import { AutopilotMonitorPanel } from "./AutopilotMonitorPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  Code,
  Webhook,
  Variable,
  ExternalLink,
  Key,
  Zap,
  Video,
  Phone,
  Blocks,
  Receipt,
  Activity,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { WorkspaceStripeSettings } from "./WorkspaceStripeSettings";
import { WorkspaceGHLSettings } from "./WorkspaceGHLSettings";
import { WorkspaceVideoSettings } from "./WorkspaceVideoSettings";
import { WhatsAppZapiConnectionCard } from "@/components/integrations/WhatsAppZapiConnectionCard";
import { MCPProvidersPanel } from "@/components/marketing/mcp/MCPProvidersPanel";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useBillingIntegrations } from "@/hooks/useBillingIntegrations";

interface IntegrationsSettingsProps {
  searchQuery?: string;
  matchedSections?: Set<string>;
}

export function IntegrationsSettings({ searchQuery = "", matchedSections }: IntegrationsSettingsProps) {
  const { isSuperAdmin } = useUserRole();
  const { currentWorkspace } = useWorkspace();
  const { data: billingIntegrations } = useBillingIntegrations();
  const hasSearch = searchQuery.trim().length > 0;

  const shouldShow = (sectionId: string) => {
    if (!hasSearch || !matchedSections) return true;
    return matchedSections.has(sectionId);
  };

  const billingCount = billingIntegrations?.length ?? 0;
  const billingDefault = billingIntegrations?.find((i) => i.is_default);

  const sectionIds = [
    "integrations-billing-providers",
    "integrations-stripe",
    "integrations-whatsapp",
    "integrations-video",
    "integrations-ghl",
    "integrations-api",
    "integrations-mcp",
    "integrations-variables",
    "integrations-autopilot-monitor",
  ];

  const hasVisibleSections = sectionIds.some((id) => shouldShow(id));
  if (!hasVisibleSections && hasSearch) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhuma definição encontrada nesta categoria.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ──────────────── Faturação & Pagamentos ──────────────── */}
      {(shouldShow("integrations-billing-providers") || shouldShow("integrations-stripe")) && (
        <div className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
            Faturação & Pagamentos
          </h3>

          {shouldShow("integrations-billing-providers") && (
            <SettingsSection
              title="Programas de Faturação"
              description="Liga softwares de faturação por API (InvoiceXpress, Moloni, Vendus, Sage, Primavera) para emitir e sincronizar faturas no CRM."
              icon={<Receipt className="h-5 w-5 text-primary" />}
            >
              <div className="flex items-center justify-between gap-4 p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {billingCount > 0 ? (
                    <Badge className="gap-1 bg-emerald-500/15 text-emerald-600 border-emerald-500/30">
                      <CheckCircle2 className="h-3 w-3" />
                      {billingCount} ligad{billingCount === 1 ? "a" : "as"}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Nenhuma integração</Badge>
                  )}
                  {billingDefault && (
                    <span className="text-sm text-muted-foreground">
                      Predefinida: <strong>{billingDefault.account_name}</strong>
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link to="/settings/billing-integrations/sync">
                      Sincronizações
                    </Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link to="/settings/billing-integrations">
                      Gerir <ArrowRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                </div>
              </div>
            </SettingsSection>
          )}

          {shouldShow("integrations-stripe") && (
            <SettingsSection
              title="Stripe"
              description="Processa pagamentos de propostas, subscrições e renovações."
              icon={<CreditCard className="h-5 w-5 text-purple-500" />}
            >
              <WorkspaceStripeSettings />
            </SettingsSection>
          )}
        </div>
      )}

      {/* ──────────────── Comunicação ──────────────── */}
      {(shouldShow("integrations-whatsapp") || shouldShow("integrations-video")) && (
        <div className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
            Comunicação
          </h3>

          {shouldShow("integrations-whatsapp") && (
            <SettingsSection
              title="WhatsApp Business"
              description="Recebe e envia mensagens via WhatsApp Business API."
              icon={<Phone className="h-5 w-5 text-green-600" />}
            >
              <WhatsAppZapiConnectionCard />
            </SettingsSection>
          )}

          {shouldShow("integrations-video") && (
            <SettingsSection
              title="Videoconferência"
              description="Configura Zoom e Google Meet para criar reuniões automaticamente."
              icon={<Video className="h-5 w-5" />}
            >
              <WorkspaceVideoSettings />
            </SettingsSection>
          )}
        </div>
      )}

      {/* ──────────────── CRM externo ──────────────── */}
      {isSuperAdmin && (shouldShow("integrations-ghl") || shouldShow("integrations-autopilot-monitor")) && (
        <div className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
            Sincronização externa
          </h3>

          {shouldShow("integrations-ghl") && (
            <SettingsSection
              title="GoHighLevel"
              description="Sincroniza contactos, conversas e pipelines do GoHighLevel."
              icon={<Zap className="h-5 w-5 text-orange-500" />}
            >
              <WorkspaceGHLSettings />
            </SettingsSection>
          )}

          {shouldShow("integrations-autopilot-monitor") && (
            <SettingsSection
              title="Monitor do Autopilot"
              description="Eventos recentes, respostas enviadas e erros do autopilot."
              icon={<Activity className="h-5 w-5" />}
            >
              <AutopilotMonitorPanel />
            </SettingsSection>
          )}
        </div>
      )}

      {/* ──────────────── Plataforma & Developers ──────────────── */}
      {(shouldShow("integrations-api") ||
        shouldShow("integrations-mcp") ||
        shouldShow("integrations-variables")) && (
        <div className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
            Plataforma & Developers
          </h3>

          {shouldShow("integrations-api") && (
            <SettingsSection
              title="API & Webhooks"
              description="Acesso programático ao CRM."
              icon={<Code className="h-5 w-5" />}
            >
              <SettingsItem
                title="Chaves de API"
                description="Gerar e gerir chaves de acesso à API REST"
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
                title="Webhooks de saída"
                description="Enviar eventos do CRM para sistemas externos"
                icon={<Webhook className="h-4 w-4" />}
                action={<Button variant="outline">Configurar</Button>}
              />
            </SettingsSection>
          )}

          {shouldShow("integrations-mcp") && (
            <SettingsSection
              title="Integrações MCP"
              description="Providers MCP (Figma, etc.) para importar design systems e componentes."
              icon={<Blocks className="h-5 w-5" />}
            >
              {currentWorkspace?.id ? (
                <MCPProvidersPanel workspaceId={currentWorkspace.id} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Seleciona um workspace para gerir integrações MCP.
                </p>
              )}
            </SettingsSection>
          )}

          {shouldShow("integrations-variables") && (
            <SettingsSection
              title="Variáveis & Segredos"
              description="Variáveis de ambiente e tokens usados em automações."
              icon={<Variable className="h-5 w-5" />}
            >
              <SettingsItem
                title="Variáveis de ambiente"
                description="Definir variáveis globais reutilizáveis em automações"
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
      )}
    </div>
  );
}
