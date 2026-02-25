import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslation } from "react-i18next";
import {
  User,
  Palette,
  Bell,
  Building2,
  Users,
  MessageSquare,
  Database,
  FileText,
  Sparkles,
  Shield,
  Plug,
  CreditCard,
  Puzzle,
  Code,
  Search,
  Crown,
} from "lucide-react";

export type SettingsCategory =
  | "profile"
  | "appearance"
  | "notifications"
  | "workspace"
  | "channels"
  | "crm"
  | "templates"
  | "automation"
  | "experience"
  | "security"
  | "integrations"
  | "billing"
  | "extensions"
  | "flags";

interface NavItem {
  id: SettingsCategory;
  labelKey: string;
  icon: React.ElementType;
  isPremium?: boolean;
}

interface NavGroup {
  labelKey: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    labelKey: "personal",
    items: [
      { id: "profile", labelKey: "nav_profile", icon: User },
      { id: "appearance", labelKey: "nav_appearance", icon: Palette },
      { id: "notifications", labelKey: "nav_notifications", icon: Bell },
    ],
  },
  {
    labelKey: "workspace",
    items: [
      { id: "workspace", labelKey: "nav_general", icon: Building2 },
      { id: "channels", labelKey: "nav_channels", icon: MessageSquare },
      { id: "crm", labelKey: "nav_crmData", icon: Database },
      { id: "templates", labelKey: "nav_templates", icon: FileText },
      { id: "automation", labelKey: "nav_automationAI", icon: Sparkles, isPremium: true },
    ],
  },
  {
    labelKey: "advanced",
    items: [
      { id: "security", labelKey: "nav_security", icon: Shield },
      { id: "integrations", labelKey: "nav_integrations", icon: Plug },
      { id: "billing", labelKey: "nav_billing", icon: CreditCard },
      { id: "extensions", labelKey: "nav_extensions", icon: Puzzle },
      { id: "flags", labelKey: "nav_developer", icon: Code },
    ],
  },
];

interface SettingsNavigationProps {
  activeCategory: SettingsCategory;
  onCategoryChange: (category: SettingsCategory) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  matchedCategories?: Set<SettingsCategory>;
  matchCount?: number;
}

export function SettingsNavigation({
  activeCategory,
  onCategoryChange,
  searchQuery,
  onSearchChange,
  matchedCategories,
  matchCount,
}: SettingsNavigationProps) {
  const { t } = useTranslation("settings");
  const hasSearch = searchQuery.trim().length > 0;

  return (
    <div className="w-64 border-r border-border bg-muted/20 flex flex-col">
      {/* Search */}
      <div className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            className="pl-9 h-9 text-sm"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        {hasSearch && matchCount !== undefined && (
          <p className="text-xs text-muted-foreground mt-2">
            {matchCount === 0
              ? t("noResults")
              : `${matchCount} resultado${matchCount !== 1 ? "s" : ""}`}
          </p>
        )}
      </div>

      {/* Grouped Navigation */}
      <ScrollArea className="flex-1">
        <div className="py-2">
          {navGroups.map((group) => {
            const visibleItems = hasSearch && matchedCategories
              ? group.items.filter((item) => matchedCategories.has(item.id))
              : group.items;

            if (visibleItems.length === 0) return null;

            return (
              <div key={group.labelKey} className="mb-1">
                <p className="px-5 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t(group.labelKey)}
                </p>
                <div className="space-y-0.5 px-2">
                  {visibleItems.map((item) => {
                    const isActive = activeCategory === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => onCategoryChange(item.id)}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
                          isActive
                            ? "bg-primary/10 text-primary font-medium border-l-2 border-primary"
                            : "text-foreground/80 hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{t(item.labelKey)}</span>
                        {item.isPremium && (
                          <Crown className="h-3 w-3 text-amber-500 ml-auto flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
