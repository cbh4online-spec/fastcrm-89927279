import { useState } from "react";
import { 
  Hash, 
  FileEdit, 
  AtSign, 
  Paperclip, 
  MessageSquare, 
  ChevronDown,
  ChevronRight,
  Users,
  Mail,
  Phone,
  Instagram,
  Facebook,
  Globe,
  Star,
  Archive,
  CheckCircle,
  Clock,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useConversations, ConversationChannel } from "@/hooks/useConversations";

export type InboxCategory = 
  | "all" 
  | "new" 
  | "assigned" 
  | "favourites" 
  | "negotiations" 
  | "closed" 
  | "archives"
  | "drafts"
  | "mentions"
  | "files";

export type ChannelFilter = ConversationChannel | "all";

interface InboxSidebarProps {
  selectedCategory: InboxCategory;
  onCategoryChange: (category: InboxCategory) => void;
  selectedChannel: ChannelFilter;
  onChannelChange: (channel: ChannelFilter) => void;
}

interface CategoryItem {
  id: InboxCategory;
  label: string;
  icon?: React.ElementType;
}

interface ChannelItem {
  id: ChannelFilter;
  label: string;
  icon: React.ElementType;
  color: string;
}

const channels: ChannelItem[] = [
  { id: "all", label: "Todos os Canais", icon: MessageSquare, color: "text-foreground" },
  { id: "email", label: "Email", icon: Mail, color: "text-blue-500" },
  { id: "whatsapp", label: "WhatsApp", icon: Phone, color: "text-green-500" },
  { id: "instagram", label: "Instagram", icon: Instagram, color: "text-pink-500" },
  { id: "messenger", label: "Messenger", icon: Facebook, color: "text-blue-600" },
  { id: "webchat", label: "Website", icon: Globe, color: "text-cyan-500" },
];

const conversationCategories: CategoryItem[] = [
  { id: "new", label: "Novas" },
  { id: "all", label: "Todas" },
  { id: "assigned", label: "Atribuídas" },
  { id: "favourites", label: "Favoritas", icon: Star },
  { id: "negotiations", label: "Negociações", icon: Briefcase },
  { id: "closed", label: "Fechadas", icon: CheckCircle },
  { id: "archives", label: "Arquivadas", icon: Archive },
];

export function InboxSidebar({
  selectedCategory,
  onCategoryChange,
  selectedChannel,
  onChannelChange,
}: InboxSidebarProps) {
  const [channelsOpen, setChannelsOpen] = useState(true);
  const [conversationsOpen, setConversationsOpen] = useState(true);
  const [contactsOpen, setContactsOpen] = useState(false);

  // Fetch conversations for counts
  const { data: allConversations } = useConversations({});
  
  // Calculate counts for each category
  const counts = {
    new: allConversations?.filter(c => c.unread_count > 0 && c.status === "open").length || 0,
    all: allConversations?.filter(c => c.status === "open").length || 0,
    assigned: allConversations?.filter(c => c.assigned_to && c.status === "open").length || 0,
    favourites: 0, // Would need a favourites flag
    negotiations: allConversations?.filter(c => {
      const intent = c.user_intent || c.ai_intent;
      return intent === "sales" && c.status === "open";
    }).length || 0,
    closed: allConversations?.filter(c => c.status === "closed").length || 0,
    archives: allConversations?.filter(c => c.status === "archived").length || 0,
  };

  // Channel counts
  const channelCounts: Record<ChannelFilter, number> = {
    all: allConversations?.length || 0,
    email: allConversations?.filter(c => c.channel === "email").length || 0,
    whatsapp: allConversations?.filter(c => c.channel === "whatsapp").length || 0,
    instagram: allConversations?.filter(c => c.channel === "instagram").length || 0,
    facebook: allConversations?.filter(c => c.channel === "facebook" || c.channel === "messenger").length || 0,
    messenger: allConversations?.filter(c => c.channel === "messenger").length || 0,
    webchat: allConversations?.filter(c => c.channel === "webchat" || c.channel === "web_widget" || c.channel === "live_chat").length || 0,
    sms: allConversations?.filter(c => c.channel === "sms").length || 0,
    live_chat: allConversations?.filter(c => c.channel === "live_chat").length || 0,
    web_widget: allConversations?.filter(c => c.channel === "web_widget").length || 0,
    phone: allConversations?.filter(c => c.channel === "phone").length || 0,
    other: allConversations?.filter(c => c.channel === "other").length || 0,
  };

  // Get recent contacts from conversations
  const recentContacts = allConversations?.slice(0, 5).map(c => ({
    id: c.lead?.id || c.contact?.id || c.id,
    name: c.lead?.name || c.contact?.name || "Desconhecido",
    avatar: (c.lead as any)?.avatar_url || (c.contact as any)?.avatar_url,
  })) || [];

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-1">
        {/* Channels Section */}
        <Collapsible open={channelsOpen} onOpenChange={setChannelsOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between h-8 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <div className="flex items-center gap-2">
                <Hash className="w-3.5 h-3.5" />
                <span>Canais</span>
              </div>
              {channelsOpen ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-0.5 mt-1">
            {channels.map((channel) => {
              const Icon = channel.icon;
              const isActive = selectedChannel === channel.id;
              const count = channelCounts[channel.id];
              
              return (
                <Button
                  key={channel.id}
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(
                    "w-full justify-between h-8 px-2 text-xs font-normal",
                    isActive && "bg-secondary"
                  )}
                  onClick={() => onChannelChange(channel.id)}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={cn("w-3.5 h-3.5", channel.color)} />
                    <span>{channel.label}</span>
                  </div>
                  {count > 0 && channel.id !== "all" && (
                    <Badge 
                      variant="secondary" 
                      className="h-5 px-1.5 text-[10px] font-normal bg-muted"
                    >
                      {count}
                    </Badge>
                  )}
                </Button>
              );
            })}
          </CollapsibleContent>
        </Collapsible>

        {/* Quick Sections */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start h-8 px-2 text-xs font-normal gap-2"
        >
          <FileEdit className="w-3.5 h-3.5 text-muted-foreground" />
          <span>Rascunhos</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start h-8 px-2 text-xs font-normal gap-2"
        >
          <AtSign className="w-3.5 h-3.5 text-muted-foreground" />
          <span>Menções</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start h-8 px-2 text-xs font-normal gap-2"
        >
          <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
          <span>Ficheiros & Media</span>
        </Button>

        {/* Conversations Section */}
        <Collapsible open={conversationsOpen} onOpenChange={setConversationsOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between h-8 px-2 text-xs font-medium text-muted-foreground hover:text-foreground mt-2"
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Conversas</span>
              </div>
              {conversationsOpen ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-0.5 mt-1">
            {conversationCategories.map((cat) => {
              const isActive = selectedCategory === cat.id;
              const count = counts[cat.id as keyof typeof counts] || 0;
              const Icon = cat.icon;
              
              return (
                <Button
                  key={cat.id}
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(
                    "w-full justify-between h-8 px-2 pl-6 text-xs font-normal",
                    isActive && "bg-secondary"
                  )}
                  onClick={() => onCategoryChange(cat.id)}
                >
                  <div className="flex items-center gap-2">
                    {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground" />}
                    <span>{cat.label}</span>
                  </div>
                  {count > 0 && (
                    <Badge 
                      className={cn(
                        "h-5 px-1.5 text-[10px] font-medium",
                        cat.id === "new" 
                          ? "bg-green-500 text-white hover:bg-green-500" 
                          : "bg-muted text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {count}
                    </Badge>
                  )}
                </Button>
              );
            })}
          </CollapsibleContent>
        </Collapsible>

        {/* Contacts Section */}
        <Collapsible open={contactsOpen} onOpenChange={setContactsOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between h-8 px-2 text-xs font-medium text-muted-foreground hover:text-foreground mt-2"
            >
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5" />
                <span>Contactos Recentes</span>
              </div>
              {contactsOpen ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-0.5 mt-1">
            {recentContacts.map((contact) => (
              <Button
                key={contact.id}
                variant="ghost"
                size="sm"
                className="w-full justify-start h-8 px-2 text-xs font-normal gap-2"
              >
                <Avatar className="h-5 w-5">
                  <AvatarImage src={contact.avatar} />
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                    {contact.name?.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{contact.name}</span>
              </Button>
            ))}
          </CollapsibleContent>
        </Collapsible>
      </div>
    </ScrollArea>
  );
}
