import { SettingsSection, SettingsItem } from "../SettingsSection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
} from "lucide-react";

const integrations = [
  {
    name: "Stripe",
    description: "Processar pagamentos e subscrições",
    icon: CreditCard,
    connected: true,
    color: "text-purple-500",
  },
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

export function IntegrationsSettings() {
  return (
    <div className="space-y-6">
      {/* Stripe */}
      <SettingsSection
        title="Stripe"
        description="Pagamentos, faturas e subscrições"
        icon={<CreditCard className="h-5 w-5" />}
      >
        <div className="flex items-center justify-between p-4 border border-border rounded-lg mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <CreditCard className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <p className="font-medium">Stripe</p>
              <p className="text-sm text-muted-foreground">
                Processar pagamentos e gerir subscrições
              </p>
            </div>
          </div>
          <Badge className="bg-emerald-500 text-white">Conectado</Badge>
        </div>
        <SettingsItem
          title="Webhook Settings"
          description="Configurar eventos de webhook do Stripe"
          action={<Button variant="outline">Configurar</Button>}
        />
        <SettingsItem
          title="Produtos & Preços"
          description="Sincronizar produtos do Stripe"
          action={<Button variant="outline">Sincronizar</Button>}
        />
      </SettingsSection>

      {/* API & Webhooks */}
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

      {/* External Integrations */}
      <SettingsSection
        title="Integrações Externas"
        description="Conectar com outras ferramentas"
        icon={<Plug className="h-5 w-5" />}
      >
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

      {/* Variables */}
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
    </div>
  );
}
