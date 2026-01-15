import { useState } from "react";
import { SettingsSection, SettingsItem } from "../SettingsSection";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/contexts/SubscriptionContext";
import {
  LayoutDashboard,
  Eye,
  LayoutGrid,
  Home,
  Copy,
  Table,
  Kanban as KanbanIcon,
  Sidebar,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface ExperienceSettingsProps {
  searchQuery?: string;
  matchedSections?: Set<string>;
}

type DialogType = 
  | "dashboard-main" 
  | "dashboard-kpis" 
  | "dashboard-custom"
  | "view-agent"
  | "view-admin"
  | "view-viewer"
  | "layout-columns"
  | "layout-sidebar"
  | "homepage"
  | "homepage-widgets"
  | "saved-views"
  | "view-templates"
  | null;

export function ExperienceSettings({ searchQuery = "", matchedSections }: ExperienceSettingsProps) {
  const { canUseFeature } = useSubscription();
  const hasCustomization = canUseFeature("dashboard_customization");
  const hasSearch = searchQuery.trim().length > 0;
  const [activeDialog, setActiveDialog] = useState<DialogType>(null);

  const shouldShow = (sectionId: string) => {
    if (!hasSearch || !matchedSections) return true;
    return matchedSections.has(sectionId);
  };

  const handleOpenDialog = (dialog: DialogType) => {
    if (!hasCustomization && ["dashboard-main", "dashboard-kpis", "dashboard-custom", "view-agent", "view-admin", "view-viewer"].includes(dialog || "")) {
      toast.error("Esta funcionalidade requer o plano Pro");
      return;
    }
    setActiveDialog(dialog);
  };

  const handleSaveChanges = () => {
    toast.success("Alterações guardadas com sucesso!");
    setActiveDialog(null);
  };

  const dialogContent: Record<NonNullable<DialogType>, { title: string; description: string }> = {
    "dashboard-main": {
      title: "Dashboard Principal",
      description: "Personalize os widgets e métricas visíveis no dashboard principal.",
    },
    "dashboard-kpis": {
      title: "KPIs por Entidade",
      description: "Configure indicadores específicos para leads, contactos, empresas e oportunidades.",
    },
    "dashboard-custom": {
      title: "Criar Dashboard Personalizado",
      description: "Crie dashboards adicionais para diferentes equipas ou departamentos.",
    },
    "view-agent": {
      title: "Vista de Agente",
      description: "Configure as colunas, filtros e dados visíveis para utilizadores com cargo de Agente.",
    },
    "view-admin": {
      title: "Vista de Administrador",
      description: "Configure a vista completa com todas as funcionalidades para administradores.",
    },
    "view-viewer": {
      title: "Vista de Visualizador",
      description: "Limite a informação visível para utilizadores com acesso apenas de leitura.",
    },
    "layout-columns": {
      title: "Colunas de Tabela",
      description: "Escolha e ordene as colunas visíveis nas listas de cada módulo.",
    },
    "layout-sidebar": {
      title: "Módulos da Sidebar",
      description: "Active ou desactive secções na vista de detalhe de cada entidade.",
    },
    "homepage": {
      title: "Página Inicial Padrão",
      description: "Escolha qual página os utilizadores veem após fazer login.",
    },
    "homepage-widgets": {
      title: "Widgets Rápidos",
      description: "Configure quais widgets aparecem na página inicial (tarefas pendentes, leads recentes, etc.).",
    },
    "saved-views": {
      title: "Vistas Guardadas",
      description: "Gerir vistas personalizadas guardadas pelos utilizadores do workspace.",
    },
    "view-templates": {
      title: "Templates de Vista",
      description: "Crie templates de vista que podem ser aplicados por toda a equipa.",
    },
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
          action={
            <Button variant="outline" onClick={() => handleOpenDialog("dashboard-main")}>
              Personalizar
            </Button>
          }
        />
        <SettingsItem
          title="KPIs por Entidade"
          description="Definir indicadores para leads, contactos, etc."
          action={
            <Button variant="outline" onClick={() => handleOpenDialog("dashboard-kpis")}>
              Configurar
            </Button>
          }
        />
        <SettingsItem
          title="Dashboards Personalizados"
          description="Criar dashboards adicionais para diferentes equipas"
          action={
            <Button variant="outline" onClick={() => handleOpenDialog("dashboard-custom")}>
              Criar Dashboard
            </Button>
          }
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
          action={
            <Button variant="outline" onClick={() => handleOpenDialog("view-agent")}>
              Configurar
            </Button>
          }
        />
        <SettingsItem
          title="Vista de Administrador"
          description="Configurar vista completa para admins"
          action={
            <Button variant="outline" onClick={() => handleOpenDialog("view-admin")}>
              Configurar
            </Button>
          }
        />
        <SettingsItem
          title="Vista de Visualizador"
          description="Limitar informação visível para viewers"
          action={
            <Button variant="outline" onClick={() => handleOpenDialog("view-viewer")}>
              Configurar
            </Button>
          }
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
          action={
            <Button variant="outline" onClick={() => handleOpenDialog("layout-columns")}>
              Configurar
            </Button>
          }
        />
        <SettingsItem
          title="Módulos da Sidebar"
          description="Ativar/desativar secções na vista de detalhe"
          action={
            <Button variant="outline" onClick={() => handleOpenDialog("layout-sidebar")}>
              Configurar
            </Button>
          }
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
          action={
            <Button variant="outline" onClick={() => handleOpenDialog("homepage")}>
              Configurar
            </Button>
          }
        />
        <SettingsItem
          title="Widgets Rápidos"
          description="Mostrar tarefas pendentes, leads recentes, etc."
          action={
            <Button variant="outline" onClick={() => handleOpenDialog("homepage-widgets")}>
              Configurar
            </Button>
          }
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
          action={
            <Button variant="outline" onClick={() => handleOpenDialog("saved-views")}>
              Gerir Vistas
            </Button>
          }
        />
        <SettingsItem
          title="Templates do Workspace"
          description="Criar templates de vista para toda a equipa"
          action={
            <Button variant="outline" onClick={() => handleOpenDialog("view-templates")}>
              Criar Template
            </Button>
          }
        />
      </SettingsSection>

      {/* Configuration Dialog */}
      <Dialog open={activeDialog !== null} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {activeDialog && dialogContent[activeDialog]?.title}
            </DialogTitle>
            <DialogDescription>
              {activeDialog && dialogContent[activeDialog]?.description}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="rounded-lg border border-dashed border-border p-8 text-center">
              <p className="text-muted-foreground">
                Configuração em desenvolvimento. Em breve poderá personalizar esta funcionalidade.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setActiveDialog(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveChanges}>
              Guardar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}