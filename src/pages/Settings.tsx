import { useState, useMemo, useEffect } from "react";
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
import { searchSettings } from "@/components/settings/settingsSearchData";

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

  const searchResults = useMemo(() => {
    return searchSettings(searchQuery);
  }, [searchQuery]);

  // Auto-switch to first matched category when searching
  useEffect(() => {
    if (searchQuery.trim() && searchResults.matchedCategories.size > 0) {
      if (!searchResults.matchedCategories.has(activeCategory)) {
        const firstMatchedCategory = Array.from(searchResults.matchedCategories)[0];
        setActiveCategory(firstMatchedCategory);
      }
    }
  }, [searchQuery, searchResults.matchedCategories, activeCategory]);

  const categoryInfo = categoryTitles[activeCategory];

  const renderContent = () => {
    const matchedSections = searchResults.matchedSections;
    
    switch (activeCategory) {
      case "workspace":
        return <WorkspaceSettings searchQuery={searchQuery} matchedSections={matchedSections} />;
      case "channels":
        return <ChannelsSettings searchQuery={searchQuery} matchedSections={matchedSections} />;
      case "crm":
        return <CrmDataSettings searchQuery={searchQuery} matchedSections={matchedSections} />;
      case "automation":
        return <AutomationAISettings searchQuery={searchQuery} matchedSections={matchedSections} />;
      case "experience":
        return <ExperienceSettings searchQuery={searchQuery} matchedSections={matchedSections} />;
      case "security":
        return <SecuritySettings searchQuery={searchQuery} matchedSections={matchedSections} />;
      case "integrations":
        return <IntegrationsSettings searchQuery={searchQuery} matchedSections={matchedSections} />;
      default:
        return <WorkspaceSettings searchQuery={searchQuery} matchedSections={matchedSections} />;
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
          matchedCategories={searchResults.matchedCategories}
          matchCount={searchResults.matchedItems.length}
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
