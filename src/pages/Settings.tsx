import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SettingsNavigation, SettingsCategory } from "@/components/settings/SettingsNavigation";
import { ProfileSettings } from "@/components/settings/sections/ProfileSettings";
import { AppearanceSettings } from "@/components/settings/sections/AppearanceSettings";
import { NotificationSettings } from "@/components/settings/sections/NotificationSettings";
import { WorkspaceSettings } from "@/components/settings/sections/WorkspaceSettings";
import { ChannelsSettings } from "@/components/settings/sections/ChannelsSettings";
import { CrmDataSettings } from "@/components/settings/sections/CrmDataSettings";
import { TemplatesSettings } from "@/components/settings/sections/TemplatesSettings";
import { AutomationAISettings } from "@/components/settings/sections/AutomationAISettings";
import { ExperienceSettings } from "@/components/settings/sections/ExperienceSettings";
import { SecuritySettings } from "@/components/settings/sections/SecuritySettings";
import { IntegrationsSettings } from "@/components/settings/sections/IntegrationsSettings";
import { BillingSettings } from "@/components/settings/sections/BillingSettings";
import { FeatureFlagsSettings } from "@/components/settings/FeatureFlagsSettings";
import { ExtensionAuditLog } from "@/components/settings/ExtensionAuditLog";
import { ExtensionSettingsSection } from "@/components/settings/ExtensionSettingsSection";
import { searchSettings } from "@/components/settings/settingsSearchData";

export default function Settings() {
  const { t } = useTranslation("settings");
  const { section } = useParams<{ section?: string }>();
  const navigate = useNavigate();

  const categoryMeta: Record<SettingsCategory, { titleKey: string; descKey: string }> = {
    profile: { titleKey: "profile_title", descKey: "profile_description" },
    appearance: { titleKey: "appearance_title", descKey: "appearance_description" },
    notifications: { titleKey: "notifications_title", descKey: "notifications_description" },
    workspace: { titleKey: "workspace", descKey: "workspace" },
    channels: { titleKey: "nav_channels", descKey: "nav_channels" },
    crm: { titleKey: "nav_crmData", descKey: "nav_crmData" },
    templates: { titleKey: "nav_templates", descKey: "nav_templates" },
    automation: { titleKey: "nav_automationAI", descKey: "nav_automationAI" },
    experience: { titleKey: "experience", descKey: "experience" },
    security: { titleKey: "nav_security", descKey: "nav_security" },
    integrations: { titleKey: "nav_integrations", descKey: "nav_integrations" },
    billing: { titleKey: "nav_billing", descKey: "nav_billing" },
    extensions: { titleKey: "nav_extensions", descKey: "nav_extensions" },
    flags: { titleKey: "nav_developer", descKey: "nav_developer" },
  };

  const validCategories = Object.keys(categoryMeta) as SettingsCategory[];

  const initialCategory = validCategories.includes(section as SettingsCategory)
    ? (section as SettingsCategory)
    : "profile";

  const [activeCategory, setActiveCategory] = useState<SettingsCategory>(initialCategory);
  const [searchQuery, setSearchQuery] = useState("");

  const handleCategoryChange = (category: SettingsCategory) => {
    setActiveCategory(category);
    navigate(`/settings/${category}`, { replace: true });
  };

  useEffect(() => {
    if (section && validCategories.includes(section as SettingsCategory)) {
      setActiveCategory(section as SettingsCategory);
    }
  }, [section]);

  const searchResults = useMemo(() => {
    return searchSettings(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    if (searchQuery.trim() && searchResults.matchedCategories.size > 0) {
      if (!searchResults.matchedCategories.has(activeCategory)) {
        const firstMatchedCategory = Array.from(searchResults.matchedCategories)[0];
        setActiveCategory(firstMatchedCategory);
      }
    }
  }, [searchQuery, searchResults.matchedCategories, activeCategory]);

  const renderContent = () => {
    const matchedSections = searchResults.matchedSections;

    switch (activeCategory) {
      case "profile":
        return <ProfileSettings />;
      case "appearance":
        return <AppearanceSettings />;
      case "notifications":
        return <NotificationSettings />;
      case "workspace":
        return <WorkspaceSettings searchQuery={searchQuery} matchedSections={matchedSections} />;
      case "channels":
        return <ChannelsSettings searchQuery={searchQuery} matchedSections={matchedSections} />;
      case "crm":
        return <CrmDataSettings searchQuery={searchQuery} matchedSections={matchedSections} />;
      case "templates":
        return <TemplatesSettings />;
      case "automation":
        return <AutomationAISettings searchQuery={searchQuery} matchedSections={matchedSections} />;
      case "experience":
        return <ExperienceSettings searchQuery={searchQuery} matchedSections={matchedSections} />;
      case "security":
        return <SecuritySettings searchQuery={searchQuery} matchedSections={matchedSections} />;
      case "integrations":
        return <IntegrationsSettings searchQuery={searchQuery} matchedSections={matchedSections} />;
      case "billing":
        return <BillingSettings searchQuery={searchQuery} matchedSections={matchedSections} />;
      case "extensions":
        return (
          <div className="space-y-8">
            <ExtensionSettingsSection />
            <ExtensionAuditLog />
          </div>
        );
      case "flags":
        return <FeatureFlagsSettings />;
      default:
        return <ProfileSettings />;
    }
  };

  const meta = categoryMeta[activeCategory];

  return (
    <DashboardLayout>
      <div className="h-full flex -m-6">
        <SettingsNavigation
          activeCategory={activeCategory}
          onCategoryChange={handleCategoryChange}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          matchedCategories={searchResults.matchedCategories}
          matchCount={searchResults.matchedItems.length}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="border-b border-border bg-background px-8 py-6">
            <h1 className="text-2xl font-bold text-foreground">{t(meta.titleKey)}</h1>
            <p className="text-muted-foreground mt-1">{t(meta.descKey)}</p>
          </div>

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
