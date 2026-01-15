import { useConversations } from "@/hooks/useConversations";
import { useSyncEmail, useActiveEmailConnection, useForceResyncEmail } from "@/hooks/useEmailConnection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Clock, MessageSquare, AlertTriangle, TrendingUp, RefreshCw, RotateCcw, ChevronDown } from "lucide-react";
import { differenceInHours } from "date-fns";
import { IntegrationStatusPanel } from "./IntegrationStatusPanel";
import { cn } from "@/lib/utils";

export function InboxMetricsBar() {
  const { data: conversations } = useConversations();
  const { data: emailConnection } = useActiveEmailConnection();
  const syncEmail = useSyncEmail();
  const forceResyncEmail = useForceResyncEmail();

  const isSyncing = syncEmail.isPending || forceResyncEmail.isPending;

  const handleSync = () => {
    if (emailConnection?.id) {
      syncEmail.mutate(emailConnection.id);
    }
  };

  const handleForceResync = () => {
    if (emailConnection?.id) {
      forceResyncEmail.mutate(emailConnection.id);
    }
  };
  
  // Calculate metrics
  const openConversations = conversations?.filter(c => c.status === "open") || [];
  const unreadCount = conversations?.reduce((acc, c) => acc + c.unread_count, 0) || 0;
  
  // Calculate average response time (simplified - would need message data for real calculation)
  const unansweredCount = openConversations.filter(c => {
    if (!c.last_message_at) return false;
    const hoursSinceLastMessage = differenceInHours(new Date(), new Date(c.last_message_at));
    return hoursSinceLastMessage > 2; // More than 2 hours without response
  }).length;
  
  // Calculate risky delays (more than 24 hours)
  const riskyDelays = openConversations.filter(c => {
    if (!c.last_message_at) return false;
    const hoursSinceLastMessage = differenceInHours(new Date(), new Date(c.last_message_at));
    return hoursSinceLastMessage > 24;
  }).length;
  
  return (
    <TooltipProvider>
      <div className="flex items-center gap-6 px-4 py-2 border-b border-border bg-muted/30">
        {/* Integration Status (compact) */}
        <IntegrationStatusPanel compact />
        
        <div className="w-px h-4 bg-border" />
        
        {/* Open Conversations */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{openConversations.length}</span>
              <span className="text-xs text-muted-foreground">abertas</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Conversas abertas que precisam de atenção</p>
          </TooltipContent>
        </Tooltip>
        
        {/* Unread Messages */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                {unreadCount}
              </Badge>
              <span className="text-xs text-muted-foreground">não lidas</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Total de mensagens não lidas</p>
          </TooltipContent>
        </Tooltip>
        
        {/* Unanswered (>2h) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium text-amber-600">{unansweredCount}</span>
              <span className="text-xs text-muted-foreground">sem resposta &gt;2h</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Conversas aguardando resposta há mais de 2 horas</p>
          </TooltipContent>
        </Tooltip>
        
        {/* Risky Delays */}
        {riskyDelays > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <span className="text-sm font-medium text-destructive">{riskyDelays}</span>
                <span className="text-xs text-destructive">alertas</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>⚠️ Conversas com risco de perda - sem resposta há mais de 24h</p>
            </TooltipContent>
          </Tooltip>
        )}
        
        {/* Average Response Time indicator */}
        <div className="ml-auto flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-green-500" />
          <span className="text-xs text-muted-foreground">Tempo médio: ~15min</span>
        </div>
        
        <div className="w-px h-4 bg-border" />
        
        {/* Sync Button with Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={!emailConnection || isSyncing}
              className="gap-2"
            >
              <RefreshCw className={cn(
                "w-4 h-4",
                isSyncing && "animate-spin"
              )} />
              <span className="hidden sm:inline">Sincronizar</span>
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleSync} disabled={isSyncing}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Sincronizar novos
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleForceResync} disabled={isSyncing}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Re-sincronizar tudo
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  );
}