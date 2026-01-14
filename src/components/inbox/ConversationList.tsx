import { useState, useMemo } from "react";
import { useConversations, ConversationChannel, ConversationStatus } from "@/hooks/useConversations";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Search,
  MessageSquare,
  Mail,
  Phone,
  Instagram,
  Facebook,
  Globe,
  Filter,
  AlertTriangle,
  Clock,
  Flame,
  ArrowUp,
  ArrowRight,
  ArrowDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, differenceInHours } from "date-fns";
import { pt } from "date-fns/locale";

const channelIcons: Record<ConversationChannel, React.ElementType> = {
  whatsapp: Phone,
  email: Mail,
  sms: MessageSquare,
  webchat: Globe,
  instagram: Instagram,
  facebook: Facebook,
};

const channelColors: Record<ConversationChannel, string> = {
  whatsapp: "text-green-500 bg-green-500/10",
  email: "text-blue-500 bg-blue-500/10",
  sms: "text-purple-500 bg-purple-500/10",
  webchat: "text-cyan-500 bg-cyan-500/10",
  instagram: "text-pink-500 bg-pink-500/10",
  facebook: "text-indigo-500 bg-indigo-500/10",
};

export type ConversationPriority = "high" | "medium" | "low";

interface ConversationListProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
  defaultChannel?: ConversationChannel | null;
}

// AI-based priority calculation
function calculatePriority(conv: any): { priority: ConversationPriority; reason: string } {
  const hoursSinceLastMessage = conv.last_message_at 
    ? differenceInHours(new Date(), new Date(conv.last_message_at))
    : 0;
  
  // High priority conditions
  if (conv.unread_count >= 3) {
    return { priority: "high", reason: "Múltiplas mensagens não lidas" };
  }
  if (hoursSinceLastMessage > 24 && conv.status === "open") {
    return { priority: "high", reason: "Sem resposta há mais de 24h" };
  }
  
  // Medium priority conditions
  if (conv.unread_count > 0) {
    return { priority: "medium", reason: "Mensagem não lida" };
  }
  if (hoursSinceLastMessage > 2 && hoursSinceLastMessage <= 24 && conv.status === "open") {
    return { priority: "medium", reason: "Aguardando resposta há algumas horas" };
  }
  
  // Low priority
  return { priority: "low", reason: "Conversa em dia" };
}

const priorityConfig = {
  high: { 
    icon: Flame, 
    color: "text-destructive", 
    bgColor: "bg-destructive/10",
    arrow: ArrowUp,
    label: "Alta"
  },
  medium: { 
    icon: Clock, 
    color: "text-amber-500", 
    bgColor: "bg-amber-500/10",
    arrow: ArrowRight,
    label: "Média"
  },
  low: { 
    icon: null, 
    color: "text-muted-foreground", 
    bgColor: "",
    arrow: ArrowDown,
    label: "Baixa"
  },
};

export function ConversationList({ selectedId, onSelect, defaultChannel }: ConversationListProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ConversationStatus | "all">("open");
  const [channelFilter, setChannelFilter] = useState<ConversationChannel | "all">(defaultChannel || "all");
  const [showFilters, setShowFilters] = useState(false);

  const { data: conversations, isLoading } = useConversations({
    status: statusFilter === "all" ? undefined : statusFilter,
    channel: channelFilter === "all" ? undefined : channelFilter,
  });

  // Filter and sort conversations with priority
  const processedConversations = useMemo(() => {
    if (!conversations) return [];
    
    let filtered = conversations.filter((conv) => {
      if (!search) return true;
      const searchLower = search.toLowerCase();
      return (
        conv.lead?.name?.toLowerCase().includes(searchLower) ||
        conv.lead?.email?.toLowerCase().includes(searchLower) ||
        conv.external_thread_id?.toLowerCase().includes(searchLower)
      );
    });
    
    // Add priority and sort
    const withPriority = filtered.map(conv => ({
      ...conv,
      ...calculatePriority(conv),
    }));
    
    // Sort by priority (high > medium > low), then by last_message_at
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    withPriority.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      const dateA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
      const dateB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
      return dateB - dateA;
    });
    
    return withPriority;
  }, [conversations, search]);

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full bg-card">
        {/* Header */}
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Conversas</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(showFilters && "bg-accent")}
            >
              <Filter className="w-4 h-4" />
            </Button>
          </div>

          {/* Channel Tabs */}
          <Tabs value={channelFilter} onValueChange={(v) => setChannelFilter(v as ConversationChannel | "all")}>
            <TabsList className="w-full grid grid-cols-5 h-8">
              <TabsTrigger value="all" className="text-xs px-2">Todos</TabsTrigger>
              <TabsTrigger value="instagram" className="text-xs px-2">
                <Instagram className="w-3 h-3" />
              </TabsTrigger>
              <TabsTrigger value="whatsapp" className="text-xs px-2">
                <Phone className="w-3 h-3" />
              </TabsTrigger>
              <TabsTrigger value="email" className="text-xs px-2">
                <Mail className="w-3 h-3" />
              </TabsTrigger>
              <TabsTrigger value="webchat" className="text-xs px-2">
                <Globe className="w-3 h-3" />
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar conversas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          {/* Additional Filters */}
          {showFilters && (
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as ConversationStatus | "all")}
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os estados</SelectItem>
                <SelectItem value="open">Abertas</SelectItem>
                <SelectItem value="closed">Fechadas</SelectItem>
                <SelectItem value="archived">Arquivadas</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Conversation List */}
        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !processedConversations?.length ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <MessageSquare className="w-10 h-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">Sem conversas</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {processedConversations.map((conv) => {
                const ChannelIcon = channelIcons[conv.channel];
                const displayName = conv.lead?.name || conv.external_thread_id || "Desconhecido";
                const priorityInfo = priorityConfig[conv.priority];
                const PriorityIcon = priorityInfo.icon;

                return (
                  <button
                    key={conv.id}
                    onClick={() => onSelect(conv.id)}
                    className={cn(
                      "w-full p-3 text-left hover:bg-accent/50 transition-colors relative",
                      selectedId === conv.id && "bg-accent",
                      conv.priority === "high" && "border-l-2 border-l-destructive"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {/* Channel Icon */}
                      <div
                        className={cn(
                          "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0",
                          channelColors[conv.channel]
                        )}
                      >
                        <ChannelIcon className="w-4 h-4" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-foreground truncate text-sm">
                            {displayName}
                          </span>
                          <div className="flex items-center gap-1">
                            {conv.unread_count > 0 && (
                              <Badge className="bg-primary text-primary-foreground text-xs px-1.5 py-0 h-5">
                                {conv.unread_count}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {/* Priority indicator with reason */}
                        {conv.priority !== "low" && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className={cn(
                                "flex items-center gap-1 mt-1 text-xs",
                                priorityInfo.color
                              )}>
                                {PriorityIcon && <PriorityIcon className="w-3 h-3" />}
                                <span>{priorityInfo.label}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                              <p className="text-xs">{conv.reason}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        
                        <div className="flex items-center justify-between gap-2 mt-1">
                          <span className="text-xs text-muted-foreground truncate capitalize">
                            {conv.channel}
                          </span>
                          {conv.last_message_at && (
                            <span className="text-xs text-muted-foreground flex-shrink-0">
                              {formatDistanceToNow(new Date(conv.last_message_at), {
                                addSuffix: true,
                                locale: pt,
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>
    </TooltipProvider>
  );
}
