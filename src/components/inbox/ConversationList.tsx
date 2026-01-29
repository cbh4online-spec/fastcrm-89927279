import { useState, useMemo, useEffect } from "react";
import { useConversations, useDeleteConversations, useUpdateConversationPriority, ConversationChannel, ConversationStatus, Conversation } from "@/hooks/useConversations";
import { useMessages } from "@/hooks/useMessages";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Building2, Pencil, DollarSign, User, Briefcase } from "lucide-react";
import { calculateTemperature, temperatureConfig } from "@/lib/conversationTemperature";
import { TemperatureIndicator } from "./ConversationTemperature";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  UserX,
  MessageCircleWarning,
  TrendingUp,
  Trash2,
  CheckSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, differenceInHours } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";

const channelIcons: Record<ConversationChannel, React.ElementType> = {
  whatsapp: Phone,
  email: Mail,
  sms: MessageSquare,
  webchat: Globe,
  instagram: Instagram,
  facebook: Facebook,
  messenger: Facebook,
  live_chat: MessageSquare,
  web_widget: Globe,
  phone: Phone,
  other: MessageSquare,
};

const channelColors: Record<ConversationChannel, string> = {
  whatsapp: "text-green-500 bg-green-500/10",
  email: "text-blue-500 bg-blue-500/10",
  sms: "text-purple-500 bg-purple-500/10",
  webchat: "text-cyan-500 bg-cyan-500/10",
  instagram: "text-pink-500 bg-pink-500/10",
  facebook: "text-indigo-500 bg-indigo-500/10",
  messenger: "text-blue-600 bg-blue-600/10",
  live_chat: "text-teal-500 bg-teal-500/10",
  web_widget: "text-cyan-500 bg-cyan-500/10",
  phone: "text-green-600 bg-green-600/10",
  other: "text-gray-500 bg-gray-500/10",
};

export type ConversationPriority = "high" | "medium" | "low";

// Smart filters for inbox
export type SmartFilter = "all" | "unassigned" | "waiting_reply" | "high_intent" | "urgent";

interface ConversationListProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
  defaultChannel?: ConversationChannel | null;
  defaultStatus?: "open" | "closed" | "archived";
  selectedCategory?: string;
  externalChannelFilter?: ConversationChannel | "all";
}

// Enhanced priority calculation considering multiple factors
function calculatePriority(conv: Conversation): { priority: ConversationPriority; reason: string; isManual: boolean } {
  // Manual override takes precedence
  if (conv.user_priority) {
    const reasonMap: Record<string, string> = {
      high: "Prioridade alta (manual)",
      medium: "Prioridade média (manual)",
      low: "Prioridade baixa (manual)",
    };
    return { 
      priority: conv.user_priority as ConversationPriority, 
      reason: reasonMap[conv.user_priority],
      isManual: true,
    };
  }

  // Calculate time without response
  const hoursSinceLastMessage = conv.last_message_at 
    ? differenceInHours(new Date(), new Date(conv.last_message_at))
    : 0;

  // Check for open opportunities (high value indicator)
  const hasOpenOpportunities = conv.opportunities && conv.opportunities.length > 0;
  const totalOpportunityValue = conv.opportunities?.reduce((sum, opp) => sum + (opp.value || 0), 0) || 0;

  // Check for buying intent
  const effectiveIntent = conv.user_intent || conv.ai_intent;
  const hasBuyingIntent = effectiveIntent === "sales";

  // Check lead status (qualified leads are higher priority)
  const leadStatus = conv.lead?.status;
  const isQualifiedLead = leadStatus === "qualified" || leadStatus === "proposal";
  const isClient = leadStatus === "client" || leadStatus === "won";

  // HIGH PRIORITY conditions (in order of importance)
  if (hasOpenOpportunities && totalOpportunityValue > 0) {
    const formattedValue = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(totalOpportunityValue);
    return { priority: "high", reason: `Oportunidade aberta (${formattedValue})`, isManual: false };
  }
  if (hasBuyingIntent && conv.unread_count > 0) {
    return { priority: "high", reason: "Pedido de preço / Intenção de compra", isManual: false };
  }
  if (isClient && conv.unread_count > 0) {
    return { priority: "high", reason: "Cliente ativo com mensagem", isManual: false };
  }
  if (hoursSinceLastMessage > 48 && conv.status === "open") {
    return { priority: "high", reason: "Sem resposta há mais de 48h", isManual: false };
  }
  if (conv.unread_count >= 3) {
    return { priority: "high", reason: "Múltiplas mensagens não lidas", isManual: false };
  }
  if (conv.ai_priority === "high") {
    return { priority: "high", reason: "Classificado como urgente (AI)", isManual: false };
  }

  // MEDIUM PRIORITY conditions
  if (isQualifiedLead) {
    return { priority: "medium", reason: "Lead qualificado", isManual: false };
  }
  if (hasBuyingIntent) {
    return { priority: "medium", reason: "Intenção de compra identificada", isManual: false };
  }
  if (conv.unread_count > 0) {
    return { priority: "medium", reason: "Mensagem não lida", isManual: false };
  }
  if (hoursSinceLastMessage > 24 && conv.status === "open") {
    return { priority: "medium", reason: "Aguardando resposta há 24h+", isManual: false };
  }
  if (conv.ai_priority === "medium") {
    return { priority: "medium", reason: "Prioridade média (AI)", isManual: false };
  }

  // LOW PRIORITY
  return { priority: "low", reason: "Conversa em dia", isManual: false };
}

// Check if conversation is waiting for reply (last message was inbound)
function isWaitingReply(conv: any): boolean {
  // This would ideally check the last message direction
  // For now, use unread_count as a proxy
  return conv.unread_count > 0 && conv.status === "open";
}

// Check if conversation has high intent
function hasHighIntent(conv: any): boolean {
  const effectiveIntent = conv.user_intent || conv.ai_intent;
  return effectiveIntent === "sales";
}

// Intent icons and labels
const intentConfig: Record<string, { label: string; color: string; icon?: React.ElementType }> = {
  sales: { label: "Vendas", color: "text-green-600 bg-green-100 dark:bg-green-900/30", icon: TrendingUp },
  support: { label: "Suporte", color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30" },
  question: { label: "Pergunta", color: "text-purple-600 bg-purple-100 dark:bg-purple-900/30" },
  follow_up: { label: "Follow-up", color: "text-amber-600 bg-amber-100 dark:bg-amber-900/30" },
  complaint: { label: "Reclamação", color: "text-red-600 bg-red-100 dark:bg-red-900/30" },
  other: { label: "Outro", color: "text-muted-foreground bg-muted" },
};

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

const smartFilterConfig: Record<SmartFilter, { label: string; icon: React.ElementType }> = {
  all: { label: "Todas", icon: MessageSquare },
  unassigned: { label: "Não atribuídas", icon: UserX },
  waiting_reply: { label: "Aguardando resposta", icon: MessageCircleWarning },
  high_intent: { label: "Alta intenção", icon: TrendingUp },
  urgent: { label: "Urgentes", icon: Flame },
};

export function ConversationList({ 
  selectedId, 
  onSelect, 
  defaultChannel,
  defaultStatus = "open",
  selectedCategory = "all",
  externalChannelFilter,
}: ConversationListProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ConversationStatus | "all">(defaultStatus || "open");
  const [channelFilter, setChannelFilter] = useState<ConversationChannel | "all">(defaultChannel || "all");
  const [smartFilter, setSmartFilter] = useState<SmartFilter>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);

  // Sync with external channel filter from sidebar
  useEffect(() => {
    if (externalChannelFilter !== undefined) {
      setChannelFilter(externalChannelFilter);
    }
  }, [externalChannelFilter]);

  const { data: conversations, isLoading } = useConversations({
    status: statusFilter === "all" ? undefined : statusFilter,
    channel: channelFilter === "all" ? undefined : channelFilter,
  });
  const deleteConversations = useDeleteConversations();
  const updatePriority = useUpdateConversationPriority();

  // Filter and sort conversations with priority
  const processedConversations = useMemo(() => {
    if (!conversations) return [];
    
    let filtered = conversations.filter((conv) => {
      // Search filter - includes contact, company, lead
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch = 
          conv.contact?.name?.toLowerCase().includes(searchLower) ||
          conv.contact?.email?.toLowerCase().includes(searchLower) ||
          conv.contact?.company?.toLowerCase().includes(searchLower) ||
          conv.company?.name?.toLowerCase().includes(searchLower) ||
          conv.lead?.name?.toLowerCase().includes(searchLower) ||
          conv.lead?.email?.toLowerCase().includes(searchLower) ||
          conv.external_thread_id?.toLowerCase().includes(searchLower) ||
          conv.last_message_preview?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      
      // Smart filter
      switch (smartFilter) {
        case "unassigned":
          if (conv.assigned_to) return false;
          break;
        case "waiting_reply":
          if (!isWaitingReply(conv)) return false;
          break;
        case "high_intent":
          if (!hasHighIntent(conv)) return false;
          break;
        case "urgent":
          const { priority } = calculatePriority(conv);
          if (priority !== "high") return false;
          break;
      }
      
      return true;
    });
    
    // Add priority and temperature, then sort
    const withPriority = filtered.map(conv => {
      const priorityData = calculatePriority(conv);
      const tempData = calculateTemperature(conv);
      return {
        ...conv,
        ...priorityData,
        temperature: tempData.score,
        temperatureState: tempData.state,
        isWaiting: isWaitingReply(conv),
        hasIntent: hasHighIntent(conv),
      };
    });
    
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
  }, [conversations, search, smartFilter]);

  const toggleSelectAll = () => {
    if (selectedIds.size === processedConversations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(processedConversations.map((c) => c.id)));
    }
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleBulkDelete = async () => {
    try {
      await deleteConversations.mutateAsync(Array.from(selectedIds));
      toast.success(`${selectedIds.size} conversa(s) eliminada(s)`);
      setSelectedIds(new Set());
      setShowDeleteDialog(false);
      setSelectionMode(false);
      onSelect(""); // Clear selection
    } catch (error) {
      toast.error("Erro ao eliminar conversas");
    }
  };

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    if (selectionMode) {
      setSelectedIds(new Set());
    }
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full bg-card overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Conversas</h2>
            <div className="flex items-center gap-1">
              {/* Selection Mode Toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={selectionMode ? "secondary" : "ghost"}
                    size="icon"
                    onClick={toggleSelectionMode}
                    className={cn(selectionMode && "ring-1 ring-primary/20")}
                  >
                    <CheckSquare className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Modo de seleção</p>
                </TooltipContent>
              </Tooltip>
              
              {/* Delete Button */}
              {selectedIds.size > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowDeleteDialog(true)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Eliminar selecionadas ({selectedIds.size})</p>
                  </TooltipContent>
                </Tooltip>
              )}
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowFilters(!showFilters)}
                className={cn(showFilters && "bg-accent")}
              >
                <Filter className="w-4 h-4" />
              </Button>
            </div>
          </div>
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

          {/* Smart Filters */}
          <div className="flex gap-1 flex-wrap">
            {(Object.keys(smartFilterConfig) as SmartFilter[]).map((filter) => {
              const config = smartFilterConfig[filter];
              const Icon = config.icon;
              const isActive = smartFilter === filter;
              
              // Count for each filter
              let count = 0;
              if (conversations) {
                switch (filter) {
                  case "unassigned":
                    count = conversations.filter(c => !c.assigned_to && c.status === "open").length;
                    break;
                  case "waiting_reply":
                    count = conversations.filter(c => isWaitingReply(c)).length;
                    break;
                  case "high_intent":
                    count = conversations.filter(c => hasHighIntent(c)).length;
                    break;
                  case "urgent":
                    count = conversations.filter(c => calculatePriority(c).priority === "high").length;
                    break;
                }
              }
              
              return (
                <Button
                  key={filter}
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(
                    "h-7 text-xs gap-1 px-2",
                    isActive && "ring-1 ring-primary/20"
                  )}
                  onClick={() => setSmartFilter(filter)}
                >
                  <Icon className="w-3 h-3" />
                  <span className="hidden sm:inline">{config.label}</span>
                  {filter !== "all" && count > 0 && (
                    <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 ml-0.5">
                      {count}
                    </Badge>
                  )}
                </Button>
              );
            })}
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

        {/* Select All Bar */}
        {selectionMode && processedConversations.length > 0 && (
          <div className="px-4 py-2 border-b border-border flex items-center gap-2 bg-muted/30">
            <Checkbox
              checked={selectedIds.size === processedConversations.length && processedConversations.length > 0}
              onCheckedChange={toggleSelectAll}
            />
            <span className="text-xs text-muted-foreground">
              {selectedIds.size > 0 
                ? `${selectedIds.size} selecionada(s)` 
                : "Selecionar todas"}
            </span>
          </div>
        )}

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
              // Priority: contact name > lead name > external_thread_id
              const displayName = conv.contact?.name || conv.lead?.name || conv.external_thread_id || "Desconhecido";
              // Get company name from contact's company or linked company
              const companyName = conv.company?.name || conv.contact?.company || null;
              const priorityInfo = priorityConfig[conv.priority];
              const PriorityIcon = priorityInfo.icon;
              const effectiveIntent = conv.user_intent || conv.ai_intent;
              const hasAIClassification = conv.ai_priority || conv.ai_intent;
              const isSelected = selectedIds.has(conv.id);
              const avatarUrl = (conv.lead as any)?.avatar_url || (conv.contact as any)?.avatar_url;
              
              // Get initials for avatar
              const getInitials = (name: string) => {
                return name
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();
              };

              return (
                <div
                  key={conv.id}
                  className={cn(
                    "w-full p-3 text-left hover:bg-accent/50 transition-colors relative cursor-pointer",
                    selectedId === conv.id && "bg-accent",
                    conv.priority === "high" && "border-l-2 border-l-destructive",
                    isSelected && "bg-primary/5"
                  )}
                  onClick={() => !selectionMode && onSelect(conv.id)}
                >
                  {/* Selection Checkbox */}
                  {selectionMode && (
                    <div className="absolute top-3 left-3">
                      <Checkbox
                        checked={isSelected}
                        onClick={(e) => toggleSelect(conv.id, e)}
                      />
                    </div>
                  )}
                  
                  <div className={cn("flex items-start gap-3", selectionMode && "pl-7")}>
                    {/* Avatar with Photo */}
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarImage src={avatarUrl} />
                      <AvatarFallback className={cn(
                        "text-xs font-medium",
                        channelColors[conv.channel]
                      )}>
                        {getInitials(displayName)}
                      </AvatarFallback>
                    </Avatar>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-foreground truncate text-sm">
                          {displayName}
                        </span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {conv.last_message_at && (
                            <span className="text-[11px] text-muted-foreground">
                              {formatDistanceToNow(new Date(conv.last_message_at), {
                                addSuffix: false,
                                locale: pt,
                              })}
                            </span>
                          )}
                          {conv.unread_count > 0 && (
                            <Badge className="bg-green-500 hover:bg-green-500 text-white text-[10px] px-1.5 py-0 h-5 min-w-[20px] flex items-center justify-center rounded-full">
                              {conv.unread_count}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* Last message preview */}
                      {conv.last_message_preview && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5 leading-relaxed">
                          {conv.last_message_preview}
                        </p>
                      )}
                      
                      {/* Tags and metadata row */}
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {/* Channel badge */}
                        <span className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded capitalize flex items-center gap-1",
                          channelColors[conv.channel]
                        )}>
                          <ChannelIcon className="w-3 h-3" />
                          {conv.channel}
                        </span>
                        
                        {/* Priority badge */}
                        {conv.priority !== "low" && PriorityIcon && (
                          <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1",
                            priorityInfo.color,
                            priorityInfo.bgColor || "bg-muted/50"
                          )}>
                            <PriorityIcon className="w-3 h-3" />
                            {priorityInfo.label}
                          </span>
                        )}
                        
                        {/* Intent badge */}
                        {effectiveIntent && intentConfig[effectiveIntent] && (
                          <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded",
                            intentConfig[effectiveIntent].color
                          )}>
                            {intentConfig[effectiveIntent].label}
                          </span>
                        )}

                        {/* Temperature indicator */}
                        <TemperatureIndicator score={conv.temperature} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </ScrollArea>
      </div>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar conversas?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja eliminar {selectedIds.size} conversa(s)? 
              Esta ação irá eliminar todas as mensagens associadas e não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
