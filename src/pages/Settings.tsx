import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
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
import { EmailCalendarSettings } from "@/components/settings/sections/EmailCalendarSettings";
import { CallIntelligenceSettings } from "@/components/settings/sections/CallIntelligenceSettings";
import { ExperienceSettings } from "@/components/settings/sections/ExperienceSettings";
import { SecuritySettings } from "@/components/settings/sections/SecuritySettings";
import { IntegrationsSettings } from "@/components/settings/sections/IntegrationsSettings";
import { BillingSettings } from "@/components/settings/sections/BillingSettings";
import { FeatureFlagsSettings } from "@/components/settings/FeatureFlagsSettings";
import { ExtensionAuditLog } from "@/components/settings/ExtensionAuditLog";
import { ExtensionSettingsSection } from "@/components/settings/ExtensionSettingsSection";
import { ProfilePermissionsSettings } from "@/components/settings/ProfilePermissionsSettings";
import { searchSettings } from "@/components/settings/settingsSearchData";

export default function Settings() {
  const { t } = useTranslation("settings");
  const { section } = useParams<{ section?: string }>();
  const navigate = useNavigate();

  const categoryMeta: Record<SettingsCategory, { titleKey: string; descKey: string }> = {
    profile: { titleKey: "profile_title", descKey: "profile_description" },
    emailCalendar: { titleKey: "emailCalendar_title", descKey: "emailCalendar_description" },
    appearance: { titleKey: "appearance_title", descKey: "appearance_description" },
    notifications: { titleKey: "notifications_title", descKey: "notifications_description" },
    workspace: { titleKey: "workspace", descKey: "workspace" },
    channels: { titleKey: "nav_channels", descKey: "nav_channels" },
    callIntelligence: { titleKey: "callIntel_title", descKey: "callIntel_description" },
    crm: { titleKey: "nav_crmData", descKey: "nav_crmData" },
    templates: { titleKey: "nav_templates", descKey: "nav_templates" },
    automation: { titleKey: "nav_automationAI", descKey: "nav_automationAI" },
    experience: { titleKey: "experience", descKey: "experience" },
    security: { titleKey: "nav_security", descKey: "nav_security" },
    integrations: { titleKey: "nav_integrations", descKey: "nav_integrations" },
    billing: { titleKey: "nav_billing", descKey: "nav_billing" },
    extensions: { titleKey: "nav_extensions", descKey: "nav_extensions" },
    flags: { titleKey: "nav_developer", descKey: "nav_developer" },
    profilePermissions: { titleKey: "nav_profilePermissions", descKey: "nav_profilePermissions_desc" },
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
      case "emailCalendar":
        return <EmailCalendarSettings />;
      case "appearance":
        return <AppearanceSettings />;
      case "notifications":
        return <NotificationSettings />;
      case "workspace":
        return <WorkspaceSettings searchQuery={searchQuery} matchedSections={matchedSections} />;
      case "channels":
        return <ChannelsSettings searchQuery={searchQuery} matchedSections={matchedSections} />;
      case "callIntelligence":
        return <CallIntelligenceSettings />;
      case "crm":
        return <CrmDataSettings searchQuery={searchQuery} matchedSections={matchedSections} />;
      case "templates":
        return <TemplatesSettings />;
      case "automation":
        return <AutomationAISettings searchQuery={searchQuery} matchedSections={matchedSections} />;
      case "experience":
        return <ExperienceSettings searchQuery={searchQuery} matchedSections={matchedSections} />;
      case "profilePermissions":
        return <ProfilePermissionsSettings />;
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

  const [mobileView, setMobileView] = useState<"nav" | "content">(
    section ? "content" : "nav"
  );

  const handleCategoryChangeMobile = (category: SettingsCategory) => {
    handleCategoryChange(category);
    setMobileView("content");
  };

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col md:flex-row -m-6">
        {/* Sidebar — hidden on mobile when viewing content */}
        <div
          className={cn(
            "md:flex md:w-64 md:flex-shrink-0",
            mobileView === "nav" ? "flex flex-1" : "hidden"
          )}
        >
          <SettingsNavigation
            activeCategory={activeCategory}
            onCategoryChange={handleCategoryChangeMobile}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            matchedCategories={searchResults.matchedCategories}
            matchCount={searchResults.matchedItems.length}
          />
        </div>

        {/* Content — hidden on mobile when viewing nav */}
        <div
          className={cn(
            "flex-1 md:flex md:flex-col overflow-hidden",
            mobileView === "content" ? "flex flex-col" : "hidden"
          )}
        >
          <div className="border-b border-border bg-background px-4 md:px-8 py-4 md:py-6 flex items-start gap-3">
            <button
              type="button"
              onClick={() => setMobileView("nav")}
              className="md:hidden mt-1 p-1.5 -ml-1.5 rounded-md hover:bg-muted text-foreground"
              aria-label="Voltar"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl md:text-2xl font-bold text-foreground truncate">{t(meta.titleKey)}</h1>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{t(meta.descKey)}</p>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 md:p-8 max-w-4xl">
              {renderContent()}
            </div>
          </ScrollArea>
        </div>
      </div>
    </DashboardLayout>
  );
}
