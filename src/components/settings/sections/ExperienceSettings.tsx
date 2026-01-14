import { SettingsSection, SettingsItem } from "../SettingsSection";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/contexts/SubscriptionContext";
import {
  LayoutDashboard,
  Eye,
  LayoutGrid,
  Home,
  Copy,
  Palette,
  Table,
  Kanban as KanbanIcon,
  Sidebar,
} from "lucide-react";

interface ExperienceSettingsProps {
  searchQuery?: string;
  matchedSections?: Set<string>;
}

export function ExperienceSettings({ searchQuery = "", matchedSections }: ExperienceSettingsProps) {
  const { canUseFeature } = useSubscription();
  const hasCustomization = canUseFeature("dashboard_customization");
  const hasSearch = searchQuery.trim().length > 0;

  const shouldShow = (sectionId: string) => {
    if (!hasSearch || !matchedSections) return true;
    return matchedSections.has(sectionId);
  };

  return (
    <div className="space-y-6">
      {/* Dashboards */}
      <SettingsSection
        title="Dashboards"
        description="Configurar painéis de controlo e métricas"
        icon={<LayoutDashboard className="h-5 w-5" />}
        isPremium={!hasCustomization}
        isLocked={!hasCustomization}
        planRequired="Pro"
      >
        <SettingsItem
          title="Dashboard Principal"
          description="Personalizar widgets e métricas visíveis"
          action={<Button variant="outline">Personalizar</Button>}
        />
        <SettingsItem
          title="KPIs por Entidade"
          description="Definir indicadores para leads, contactos, etc."
          action={<Button variant="outline">Configurar</Button>}
        />
        <SettingsItem
          title="Dashboards Personalizados"
          description="Criar dashboards adicionais para diferentes equipas"
          action={<Button variant="outline">Criar Dashboard</Button>}
        />
      </SettingsSection>

      {/* Role-based Views */}
      <SettingsSection
        title="Vistas por Cargo"
        description="Definir o que cada cargo vê por defeito"
        icon={<Eye className="h-5 w-5" />}
        isPremium={!hasCustomization}
        isLocked={!hasCustomization}
        planRequired="Pro"
      >
        <SettingsItem
          title="Vista de Agente"
          description="Configurar colunas e filtros para agentes"
          action={<Button variant="outline">Configurar</Button>}
        />
        <SettingsItem
          title="Vista de Administrador"
          description="Configurar vista completa para admins"
          action={<Button variant="outline">Configurar</Button>}
        />
        <SettingsItem
          title="Vista de Visualizador"
          description="Limitar informação visível para viewers"
          action={<Button variant="outline">Configurar</Button>}
        />
      </SettingsSection>

      {/* Layout Customization */}
      <SettingsSection
        title="Personalização de Layout"
        description="Configurar listas, boards e barras laterais"
        icon={<LayoutGrid className="h-5 w-5" />}
      >
        <div className="grid gap-4 md:grid-cols-3 mb-4">
          <div className="border border-border rounded-lg p-4 text-center">
            <Table className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="font-medium">Tabelas</p>
            <p className="text-sm text-muted-foreground">Colunas, ordenação</p>
          </div>
          <div className="border border-border rounded-lg p-4 text-center">
            <KanbanIcon className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="font-medium">Boards</p>
            <p className="text-sm text-muted-foreground">Kanban, colunas</p>
          </div>
          <div className="border border-border rounded-lg p-4 text-center">
            <Sidebar className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="font-medium">Sidebars</p>
            <p className="text-sm text-muted-foreground">Detalhes, contexto</p>
          </div>
        </div>
        <SettingsItem
          title="Colunas de Tabela"
          description="Escolher e ordenar colunas visíveis nas listas"
          action={<Button variant="outline">Configurar</Button>}
        />
        <SettingsItem
          title="Módulos da Sidebar"
          description="Ativar/desativar secções na vista de detalhe"
          action={<Button variant="outline">Configurar</Button>}
        />
      </SettingsSection>

      {/* Homepage Configuration */}
      <SettingsSection
        title="Página Inicial"
        description="Configurar o que os utilizadores veem ao entrar"
        icon={<Home className="h-5 w-5" />}
      >
        <SettingsItem
          title="Página Inicial Padrão"
          description="Escolher página de destino após login"
          action={<Button variant="outline">Configurar</Button>}
        />
        <SettingsItem
          title="Widgets Rápidos"
          description="Mostrar tarefas pendentes, leads recentes, etc."
          action={<Button variant="outline">Configurar</Button>}
        />
      </SettingsSection>

      {/* View Templates */}
      <SettingsSection
        title="Templates de Vista"
        description="Guardar e partilhar configurações de vista"
        icon={<Copy className="h-5 w-5" />}
      >
        <SettingsItem
          title="Vistas Guardadas"
          description="Gerir vistas guardadas pelos utilizadores"
          action={<Button variant="outline">Gerir Vistas</Button>}
        />
        <SettingsItem
          title="Templates do Workspace"
          description="Criar templates de vista para toda a equipa"
          action={<Button variant="outline">Criar Template</Button>}
        />
      </SettingsSection>
    </div>
  );
}
