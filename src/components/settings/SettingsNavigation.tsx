import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users,
  MessageSquare,
  Database,
  Sparkles,
  Layout,
  Shield,
  Plug,
  Search,
  Crown,
} from "lucide-react";

export type SettingsCategory =
  | "workspace"
  | "channels"
  | "crm"
  | "automation"
  | "experience"
  | "security"
  | "integrations";

interface SettingsNavigationProps {
  activeCategory: SettingsCategory;
  onCategoryChange: (category: SettingsCategory) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const categories = [
  {
    id: "workspace" as const,
    label: "Workspace & Equipa",
    icon: Users,
    description: "Utilizadores, permissões, marca",
  },
  {
    id: "channels" as const,
    label: "Canais & Fontes",
    icon: MessageSquare,
    description: "Email, WhatsApp, Formulários",
  },
  {
    id: "crm" as const,
    label: "CRM & Dados",
    icon: Database,
    description: "Campos, Pipelines, Importação",
  },
  {
    id: "automation" as const,
    label: "Automação & IA",
    icon: Sparkles,
    description: "Regras, Sugestões, Lead Scoring",
    isPremium: true,
  },
  {
    id: "experience" as const,
    label: "Experiência & Interface",
    icon: Layout,
    description: "Dashboards, Vistas, Layouts",
  },
  {
    id: "security" as const,
    label: "Segurança & Conformidade",
    icon: Shield,
    description: "Permissões, Logs, SSO",
  },
  {
    id: "integrations" as const,
    label: "Integrações & API",
    icon: Plug,
    description: "Stripe, Webhooks, Variáveis",
  },
];

export function SettingsNavigation({
  activeCategory,
  onCategoryChange,
  searchQuery,
  onSearchChange,
}: SettingsNavigationProps) {
  return (
    <div className="w-72 border-r border-border bg-muted/30 flex flex-col">
      {/* Search */}
      <div className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar definições..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      {/* Categories */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              className={cn(
                "w-full text-left px-3 py-3 rounded-lg transition-colors",
                activeCategory === category.id
                  ? "bg-primary/10 text-primary"
                  : "text-foreground hover:bg-muted"
              )}
            >
              <div className="flex items-center gap-3">
                <category.icon className="h-5 w-5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">
                      {category.label}
                    </span>
                    {category.isPremium && (
                      <Crown className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {category.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
