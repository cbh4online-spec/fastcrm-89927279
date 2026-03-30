import { useState } from "react";
import {
  Inbox,
  FileEdit,
  Send,
  CalendarClock,
  Trash2,
  AlertOctagon,
  ChevronDown,
  ChevronRight,
  Mail,
  Eye,
  EyeOff,
  MessageSquareReply,
  MessageSquareX,
  ThumbsUp,
  ThumbsDown,
  List,
  Tag,
  Plus,
  Briefcase,
  Users,
  Search,
  Phone,
  MessageSquare,
  Globe,
  Instagram,
  Facebook,
  Zap,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useConversations, ConversationChannel } from "@/hooks/useConversations";

export type InboxCategory =
  | "all"
  | "new"
  | "assigned"
  | "pending"
  | "favourites"
  | "negotiations"
  | "closed"
  | "archives"
  | "drafts"
  | "sent"
  | "scheduled"
  | "spam"
  | "trash"
  | "mentions"
  | "files";

export type ChannelFilter = ConversationChannel | "all";

interface InboxSidebarProps {
  selectedCategory: InboxCategory;
  onCategoryChange: (category: InboxCategory) => void;
  selectedChannel: ChannelFilter;
  onChannelChange: (channel: ChannelFilter) => void;
}

interface FolderItem {
  id: string;
  label: string;
  icon: React.ElementType;
  category?: InboxCategory;
  count?: number;
}

interface ViewItem {
  id: string;
  label: string;
  icon: React.ElementType;
}

export function InboxSidebar({
  selectedCategory,
  onCategoryChange,
  selectedChannel,
  onChannelChange,
}: InboxSidebarProps) {
  const [foldersOpen, setFoldersOpen] = useState(true);
  const [channelsOpen, setChannelsOpen] = useState(false);
  const [viewsOpen, setViewsOpen] = useState(true);
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState("");

  const { data: allConversations } = useConversations({});

  const unreadCount = allConversations?.filter(c => c.unread_count > 0 && c.status === "open").length || 0;
  const openCount = allConversations?.filter(c => c.status === "open").length || 0;

  const folders: FolderItem[] = [
    { id: "my", label: "Meu", icon: Users, category: "assigned", count: allConversations?.filter(c => c.assigned_to && c.status === "open").length || 0 },
    { id: "inbox", label: "Caixa de entrada", icon: Inbox, category: "all", count: unreadCount },
    { id: "drafts", label: "Rascunhos", icon: FileEdit, category: "drafts" },
    { id: "scheduled", label: "Agendado", icon: CalendarClock, category: "scheduled" },
    { id: "sent", label: "Enviado", icon: Send, category: "sent" },
    { id: "spam", label: "Spam", icon: AlertOctagon, category: "spam" },
    { id: "trash", label: "Reciclagem", icon: Trash2, category: "trash" },
    { id: "closing", label: "A fechar este mês", icon: Briefcase, category: "negotiations", count: allConversations?.filter(c => c.opportunities?.length).length || 0 },
    { id: "clients", label: "Clientes", icon: Users, category: "closed", count: allConversations?.filter(c => c.status === "closed").length || 0 },
  ];

  const views: ViewItem[] = [
    { id: "unread", label: "Marcar como não lido", icon: EyeOff },
    { id: "to-open", label: "Por abrir", icon: Eye },
    { id: "no-response", label: "Sem resposta", icon: MessageSquareX },
    { id: "not-replied", label: "Não respondido", icon: MessageSquareReply },
    { id: "positive", label: "Positivo", icon: ThumbsUp },
    { id: "negative", label: "Negativo", icon: ThumbsDown },
    { id: "all-messages", label: "Todas as mensagens", icon: List },
  ];

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
        {/* Search */}
        <div className="p-3 pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Pesquisar..."
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
              className="pl-8 h-7 text-xs bg-sidebar-accent border-sidebar-border"
            />
          </div>
        </div>

        <div className="px-2 space-y-0.5">
          {/* PASTAS */}
          <Collapsible open={foldersOpen} onOpenChange={setFoldersOpen}>
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-between px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
                <span>Pastas</span>
                {foldersOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-0.5">
              {folders.map((folder) => {
                const Icon = folder.icon;
                const isActive = folder.category && selectedCategory === folder.category;
                return (
                  <button
                    key={folder.id}
                    className={cn(
                      "w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50"
                    )}
                    onClick={() => folder.category ? onCategoryChange(folder.category) : undefined}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5" />
                      <span>{folder.label}</span>
                    </div>
                    {folder.count !== undefined && folder.count > 0 && (
                      <Badge variant="secondary" className="h-4 px-1.5 text-[10px] font-medium bg-primary/20 text-primary border-0">
                        {folder.count}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </CollapsibleContent>
          </Collapsible>

          {/* CANAIS */}
          <Collapsible open={channelsOpen} onOpenChange={setChannelsOpen}>
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-between px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors mt-2">
                <span>Canais</span>
                {channelsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-0.5">
              {[
                { id: "all" as const, label: "Todos", icon: Layers },
                { id: "email" as const, label: "Email", icon: Mail },
                { id: "whatsapp" as const, label: "WhatsApp", icon: Phone },
                { id: "instagram" as const, label: "Instagram", icon: Instagram },
                { id: "facebook" as const, label: "Facebook", icon: Facebook },
                { id: "sms" as const, label: "SMS", icon: MessageSquare },
                { id: "phone" as const, label: "Telefone", icon: Phone },
                { id: "ghl" as const, label: "GHL", icon: Zap },
                { id: "webchat" as const, label: "Webchat", icon: Globe },
              ].map((ch) => {
                const Icon = ch.icon;
                const isActive = selectedChannel === ch.id;
                const count = ch.id === "all"
                  ? undefined
                  : allConversations?.filter(c => c.channel === ch.id).length || 0;
                return (
                  <button
                    key={ch.id}
                    className={cn(
                      "w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50"
                    )}
                    onClick={() => onChannelChange(ch.id)}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5" />
                      <span>{ch.label}</span>
                    </div>
                    {count !== undefined && count > 0 && (
                      <Badge variant="secondary" className="h-4 px-1.5 text-[10px] font-medium bg-primary/20 text-primary border-0">
                        {count}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={viewsOpen} onOpenChange={setViewsOpen}>
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-between px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors mt-2">
                <span>Vistas</span>
                {viewsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-0.5">
              {views.map((view) => {
                const Icon = view.icon;
                return (
                  <button
                    key={view.id}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-sidebar-foreground/80 hover:bg-sidebar-accent/50 transition-colors"
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{view.label}</span>
                  </button>
                );
              })}
            </CollapsibleContent>
          </Collapsible>

          {/* ETIQUETAS */}
          <Collapsible open={labelsOpen} onOpenChange={setLabelsOpen}>
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-between px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors mt-2">
                <span>Etiquetas</span>
                {labelsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-0.5">
              <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50 transition-colors">
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar etiqueta</span>
              </button>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </ScrollArea>
  );
}
