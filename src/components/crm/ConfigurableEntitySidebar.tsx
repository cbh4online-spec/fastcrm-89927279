import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  FileText,
  MessageSquare,
  CheckSquare,
  CheckCircle2,
  Calendar,
  TrendingUp,
  Megaphone,
  Mail,
  Share2,
  DollarSign,
  Paperclip,
  User,
  ChevronRight,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEntityRelatedCounts } from "@/hooks/useEntityInsights";
import { 
  SidebarModuleConfig, 
  SidebarModuleType, 
  SIDEBAR_MODULE_DEFINITIONS 
} from "@/hooks/useLayoutConfig";

const MODULE_ICONS: Record<SidebarModuleType, React.ReactNode> = {
  overview: <User className="w-4 h-4" />,
  notes: <FileText className="w-4 h-4" />,
  messages: <MessageSquare className="w-4 h-4" />,
  open_activities: <CheckSquare className="w-4 h-4" />,
  closed_activities: <CheckCircle2 className="w-4 h-4" />,
  meetings: <Calendar className="w-4 h-4" />,
  opportunities: <TrendingUp className="w-4 h-4" />,
  campaigns: <Megaphone className="w-4 h-4" />,
  emails: <Mail className="w-4 h-4" />,
  social: <Share2 className="w-4 h-4" />,
  payments: <DollarSign className="w-4 h-4" />,
  files: <Paperclip className="w-4 h-4" />,
  activity_timeline: <Activity className="w-4 h-4" />,
};

const MODULE_COLORS: Record<SidebarModuleType, string> = {
  overview: "text-foreground",
  notes: "text-amber-600",
  messages: "text-blue-600",
  open_activities: "text-orange-600",
  closed_activities: "text-green-600",
  meetings: "text-purple-600",
  opportunities: "text-emerald-600",
  campaigns: "text-pink-600",
  emails: "text-sky-600",
  social: "text-indigo-600",
  payments: "text-teal-600",
  files: "text-slate-600",
  activity_timeline: "text-violet-600",
};

// Map module types to count keys
const MODULE_COUNT_KEYS: Record<SidebarModuleType, keyof ReturnType<typeof useEntityRelatedCounts>> = {
  overview: "notes", // overview doesn't have a count
  notes: "notes",
  messages: "messages",
  open_activities: "openActivities",
  closed_activities: "closedActivities",
  meetings: "meetings",
  opportunities: "opportunities",
  campaigns: "campaigns",
  emails: "emails",
  social: "socialInteractions",
  payments: "payments",
  files: "files",
  activity_timeline: "notes", // Timeline shows all activities, use notes as placeholder
};

interface ConfigurableEntitySidebarProps {
  entityType: "lead" | "contact";
  entityId: string | undefined;
  activeSection: string;
  onSectionChange: (section: string) => void;
  modules: SidebarModuleConfig[];
}

export function ConfigurableEntitySidebar({
  entityType,
  entityId,
  activeSection,
  onSectionChange,
  modules,
}: ConfigurableEntitySidebarProps) {
  const counts = useEntityRelatedCounts(entityType, entityId);

  // Filter enabled modules and sort by position
  const enabledModules = modules
    .filter(m => m.enabled)
    .sort((a, b) => a.position - b.position);

  // Apply hide_if_empty logic
  const visibleModules = enabledModules.filter(module => {
    if (module.type === "overview") return true; // Always show overview
    if (!module.settings.hide_if_empty) return true;
    
    const countKey = MODULE_COUNT_KEYS[module.type];
    const count = counts[countKey] || 0;
    return count > 0;
  });

  // Group modules by category
  const groupedModules = {
    context: visibleModules.filter(m => 
      SIDEBAR_MODULE_DEFINITIONS[m.type].category === "context"
    ),
    activity: visibleModules.filter(m => 
      SIDEBAR_MODULE_DEFINITIONS[m.type].category === "activity"
    ),
    business: visibleModules.filter(m => 
      SIDEBAR_MODULE_DEFINITIONS[m.type].category === "business"
    ),
    communication: visibleModules.filter(m => 
      SIDEBAR_MODULE_DEFINITIONS[m.type].category === "communication"
    ),
  };

  const renderGroup = (
    title: string, 
    items: SidebarModuleConfig[]
  ) => {
    if (items.length === 0) return null;

    return (
      <>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">
          {title}
        </h3>
        <nav className="space-y-0.5">
          {items.map((module) => {
            const countKey = MODULE_COUNT_KEYS[module.type];
            const count = module.type === "overview" ? -1 : (counts[countKey] || 0);
            
            return (
              <SidebarButton
                key={module.id}
                type={module.type}
                label={SIDEBAR_MODULE_DEFINITIONS[module.type].label}
                icon={MODULE_ICONS[module.type]}
                color={MODULE_COLORS[module.type]}
                count={count}
                isActive={activeSection === module.type}
                onClick={() => onSectionChange(module.type)}
              />
            );
          })}
        </nav>
      </>
    );
  };

  return (
    <aside className="w-60 border-r bg-muted/30 flex-shrink-0">
      <ScrollArea className="h-full">
        <div className="p-4 space-y-4">
          {renderGroup("Contexto", groupedModules.context)}
          
          {groupedModules.context.length > 0 && groupedModules.activity.length > 0 && (
            <Separator />
          )}
          {renderGroup("Atividade", groupedModules.activity)}
          
          {groupedModules.activity.length > 0 && groupedModules.business.length > 0 && (
            <Separator />
          )}
          {renderGroup("Negócios", groupedModules.business)}
          
          {groupedModules.business.length > 0 && groupedModules.communication.length > 0 && (
            <Separator />
          )}
          {renderGroup("Comunicação", groupedModules.communication)}
        </div>
      </ScrollArea>
    </aside>
  );
}

interface SidebarButtonProps {
  type: SidebarModuleType;
  label: string;
  icon: React.ReactNode;
  color: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}

function SidebarButton({ 
  label, 
  icon, 
  color, 
  count, 
  isActive, 
  onClick 
}: SidebarButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between px-2 py-2 rounded-md text-sm transition-all group",
        isActive
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <span className={cn("flex items-center gap-2.5", isActive && color)}>
        {icon}
        <span className="truncate">{label}</span>
      </span>
      
      <div className="flex items-center gap-1">
        {count > 0 && (
          <Badge 
            variant={isActive ? "default" : "secondary"} 
            className={cn(
              "h-5 min-w-5 flex items-center justify-center text-xs font-medium",
              isActive && "bg-primary text-primary-foreground"
            )}
          >
            {count}
          </Badge>
        )}
        <ChevronRight 
          className={cn(
            "w-3.5 h-3.5 opacity-0 -translate-x-1 transition-all",
            "group-hover:opacity-50 group-hover:translate-x-0",
            isActive && "opacity-70 translate-x-0"
          )} 
        />
      </div>
    </button>
  );
}
