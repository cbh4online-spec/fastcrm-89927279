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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEntityRelatedCounts } from "@/hooks/useEntityInsights";

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  count: number;
  color?: string;
}

interface EntityContextSidebarProps {
  entityType: "lead" | "contact";
  entityId: string | undefined;
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export function EntityContextSidebar({
  entityType,
  entityId,
  activeSection,
  onSectionChange,
}: EntityContextSidebarProps) {
  const counts = useEntityRelatedCounts(entityType, entityId);

  const sidebarItems: SidebarItem[] = [
    {
      id: "overview",
      label: "Visão Geral",
      icon: <User className="w-4 h-4" />,
      count: -1, // -1 means don't show count
    },
    {
      id: "notes",
      label: "Notas",
      icon: <FileText className="w-4 h-4" />,
      count: counts.notes,
      color: "text-amber-600",
    },
    {
      id: "messages",
      label: "Mensagens",
      icon: <MessageSquare className="w-4 h-4" />,
      count: counts.messages,
      color: "text-blue-600",
    },
    {
      id: "open-activities",
      label: "Atividades Abertas",
      icon: <CheckSquare className="w-4 h-4" />,
      count: counts.openActivities,
      color: "text-orange-600",
    },
    {
      id: "closed-activities",
      label: "Atividades Fechadas",
      icon: <CheckCircle2 className="w-4 h-4" />,
      count: counts.closedActivities,
      color: "text-green-600",
    },
    {
      id: "meetings",
      label: "Reuniões",
      icon: <Calendar className="w-4 h-4" />,
      count: counts.meetings,
      color: "text-purple-600",
    },
    {
      id: "opportunities",
      label: "Oportunidades",
      icon: <TrendingUp className="w-4 h-4" />,
      count: counts.opportunities,
      color: "text-emerald-600",
    },
    {
      id: "campaigns",
      label: "Campanhas",
      icon: <Megaphone className="w-4 h-4" />,
      count: counts.campaigns,
      color: "text-pink-600",
    },
    {
      id: "emails",
      label: "E-mails",
      icon: <Mail className="w-4 h-4" />,
      count: counts.emails,
      color: "text-sky-600",
    },
    {
      id: "social",
      label: "Interações Sociais",
      icon: <Share2 className="w-4 h-4" />,
      count: counts.socialInteractions,
      color: "text-indigo-600",
    },
    {
      id: "payments",
      label: "Pagamentos",
      icon: <DollarSign className="w-4 h-4" />,
      count: counts.payments,
      color: "text-teal-600",
    },
    {
      id: "files",
      label: "Ficheiros",
      icon: <Paperclip className="w-4 h-4" />,
      count: counts.files,
      color: "text-slate-600",
    },
  ];

  return (
    <aside className="w-60 border-r bg-muted/30 flex-shrink-0">
      <ScrollArea className="h-full">
        <div className="p-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">
            Contexto
          </h3>
          
          <nav className="space-y-0.5">
            {sidebarItems.slice(0, 1).map((item) => (
              <SidebarButton
                key={item.id}
                item={item}
                isActive={activeSection === item.id}
                onClick={() => onSectionChange(item.id)}
              />
            ))}
          </nav>

          <Separator className="my-3" />

          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">
            Atividade
          </h3>

          <nav className="space-y-0.5">
            {sidebarItems.slice(1, 6).map((item) => (
              <SidebarButton
                key={item.id}
                item={item}
                isActive={activeSection === item.id}
                onClick={() => onSectionChange(item.id)}
              />
            ))}
          </nav>

          <Separator className="my-3" />

          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">
            Negócios
          </h3>

          <nav className="space-y-0.5">
            {sidebarItems.slice(6, 8).map((item) => (
              <SidebarButton
                key={item.id}
                item={item}
                isActive={activeSection === item.id}
                onClick={() => onSectionChange(item.id)}
              />
            ))}
          </nav>

          <Separator className="my-3" />

          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">
            Comunicação
          </h3>

          <nav className="space-y-0.5">
            {sidebarItems.slice(8).map((item) => (
              <SidebarButton
                key={item.id}
                item={item}
                isActive={activeSection === item.id}
                onClick={() => onSectionChange(item.id)}
              />
            ))}
          </nav>
        </div>
      </ScrollArea>
    </aside>
  );
}

interface SidebarButtonProps {
  item: SidebarItem;
  isActive: boolean;
  onClick: () => void;
}

function SidebarButton({ item, isActive, onClick }: SidebarButtonProps) {
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
      <span className={cn("flex items-center gap-2.5", isActive && item.color)}>
        {item.icon}
        <span className="truncate">{item.label}</span>
      </span>
      
      <div className="flex items-center gap-1">
        {item.count > 0 && (
          <Badge 
            variant={isActive ? "default" : "secondary"} 
            className={cn(
              "h-5 min-w-5 flex items-center justify-center text-xs font-medium",
              isActive && "bg-primary text-primary-foreground"
            )}
          >
            {item.count}
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
