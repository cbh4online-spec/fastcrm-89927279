import { SettingsSection, SettingsItem } from "../SettingsSection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/contexts/SubscriptionContext";
import {
  Shield,
  History,
  Key,
  UserCog,
  Lock,
  Fingerprint,
  FileKey,
} from "lucide-react";

export function SecuritySettings() {
  const { plan } = useSubscription();
  const isAgency = plan === "agency";

  return (
    <div className="space-y-6">
      {/* Advanced Permissions */}
      <SettingsSection
        title="Permissões Avançadas"
        description="Controle granular sobre acessos"
        icon={<Shield className="h-5 w-5" />}
        isPremium={!isAgency}
        isLocked={!isAgency}
        planRequired="Agency"
      >
        <SettingsItem
          title="Permissões por Objeto"
          description="Controlar acesso a registos específicos"
          action={<Button variant="outline">Configurar</Button>}
        />
        <SettingsItem
          title="Permissões por Campo"
          description="Definir quem pode ver/editar cada campo"
          action={<Button variant="outline">Configurar</Button>}
        />
        <SettingsItem
          title="Restrições por IP"
          description="Limitar acesso a IPs específicos"
          action={<Button variant="outline">Configurar</Button>}
        />
      </SettingsSection>

      {/* Audit Logs */}
      <SettingsSection
        title="Logs de Auditoria"
        description="Histórico de todas as ações no sistema"
        icon={<History className="h-5 w-5" />}
      >
        <SettingsItem
          title="Ver Logs"
          description="Consultar histórico de alterações e acessos"
          action={<Button variant="outline">Ver Logs</Button>}
        />
        <SettingsItem
          title="Exportar Auditoria"
          description="Exportar logs para análise externa"
          action={<Button variant="outline">Exportar</Button>}
        />
        <SettingsItem
          title="Retenção de Logs"
          description="Definir período de retenção dos logs"
          action={<Button variant="outline">Configurar</Button>}
        />
      </SettingsSection>

      {/* Access Management */}
      <SettingsSection
        title="Gestão de Acessos"
        description="Sessões ativas e autenticação"
        icon={<Key className="h-5 w-5" />}
      >
        <SettingsItem
          title="Sessões Ativas"
          description="Ver e terminar sessões de utilizadores"
          action={<Button variant="outline">Ver Sessões</Button>}
        />
        <SettingsItem
          title="Autenticação de Dois Fatores"
          description="Exigir 2FA para todos os utilizadores"
          action={<Button variant="outline">Configurar</Button>}
        />
        <SettingsItem
          title="Políticas de Password"
          description="Definir requisitos mínimos de password"
          action={<Button variant="outline">Configurar</Button>}
        />
      </SettingsSection>

      {/* SSO */}
      <SettingsSection
        title="Single Sign-On (SSO)"
        description="Autenticação empresarial centralizada"
        icon={<Fingerprint className="h-5 w-5" />}
        isPremium={!isAgency}
        isLocked={!isAgency}
        planRequired="Agency"
      >
        <SettingsItem
          title="SAML 2.0"
          description="Configurar autenticação SAML"
          action={<Button variant="outline">Configurar</Button>}
        />
        <SettingsItem
          title="OAuth / OpenID"
          description="Integrar com provedores OAuth"
          action={<Button variant="outline">Configurar</Button>}
        />
        <SettingsItem
          title="Domínios Verificados"
          description="Verificar domínios de email da empresa"
          action={<Button variant="outline">Gerir Domínios</Button>}
        />
      </SettingsSection>

      {/* Data Protection */}
      <SettingsSection
        title="Proteção de Dados"
        description="RGPD e compliance"
        icon={<FileKey className="h-5 w-5" />}
      >
        <SettingsItem
          title="Consentimentos"
          description="Gerir consentimentos RGPD dos contactos"
          action={<Button variant="outline">Gerir</Button>}
        />
        <SettingsItem
          title="Direito ao Esquecimento"
          description="Processar pedidos de eliminação de dados"
          action={<Button variant="outline">Gerir Pedidos</Button>}
        />
        <SettingsItem
          title="Exportar Dados Pessoais"
          description="Gerar relatório de dados de um contacto"
          action={<Button variant="outline">Exportar</Button>}
        />
      </SettingsSection>
    </div>
  );
}
