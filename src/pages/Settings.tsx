import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SettingsNavigation, SettingsCategory } from "@/components/settings/SettingsNavigation";
import { WorkspaceSettings } from "@/components/settings/sections/WorkspaceSettings";
import { ChannelsSettings } from "@/components/settings/sections/ChannelsSettings";
import { CrmDataSettings } from "@/components/settings/sections/CrmDataSettings";
import { AutomationAISettings } from "@/components/settings/sections/AutomationAISettings";
import { ExperienceSettings } from "@/components/settings/sections/ExperienceSettings";
import { SecuritySettings } from "@/components/settings/sections/SecuritySettings";
import { IntegrationsSettings } from "@/components/settings/sections/IntegrationsSettings";

const categoryTitles: Record<SettingsCategory, { title: string; description: string }> = {
  workspace: {
    title: "Workspace & Equipa",
    description: "Gerir utilizadores, permissões e configurações do workspace",
  },
  channels: {
    title: "Canais & Fontes de Leads",
    description: "Configurar canais de comunicação e fontes de captura",
  },
  crm: {
    title: "CRM & Dados",
    description: "Personalizar campos, pipelines e gestão de dados",
  },
  automation: {
    title: "Automação & IA",
    description: "Automatizar processos e configurar inteligência artificial",
  },
  experience: {
    title: "Experiência & Interface",
    description: "Personalizar dashboards, vistas e layouts",
  },
  security: {
    title: "Segurança & Conformidade",
    description: "Permissões avançadas, auditoria e proteção de dados",
  },
  integrations: {
    title: "Integrações & API",
    description: "Conectar ferramentas externas e acesso programático",
  },
};

export default function Settings() {
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>("workspace");
  const [searchQuery, setSearchQuery] = useState("");

  const categoryInfo = categoryTitles[activeCategory];

  const renderContent = () => {
    switch (activeCategory) {
      case "workspace":
        return <WorkspaceSettings />;
      case "channels":
        return <ChannelsSettings />;
      case "crm":
        return <CrmDataSettings />;
      case "automation":
        return <AutomationAISettings />;
      case "experience":
        return <ExperienceSettings />;
      case "security":
        return <SecuritySettings />;
      case "integrations":
        return <IntegrationsSettings />;
      default:
        return <WorkspaceSettings />;
    }
  };

  return (
    <DashboardLayout>
      <div className="h-full flex -m-6">
        {/* Navigation Sidebar */}
        <SettingsNavigation
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="border-b border-border bg-background px-8 py-6">
            <h1 className="text-2xl font-bold text-foreground">{categoryInfo.title}</h1>
            <p className="text-muted-foreground mt-1">{categoryInfo.description}</p>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1">
            <div className="p-8 max-w-4xl">
              {renderContent()}
            </div>
          </ScrollArea>
        </div>
      </div>
    </DashboardLayout>
  );
}
