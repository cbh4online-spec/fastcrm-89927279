import { useConversations } from "@/hooks/useConversations";
import { useSyncEmail, useActiveEmailConnection, useForceResyncEmail } from "@/hooks/useEmailConnection";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RefreshCw, RotateCcw, ChevronDown } from "lucide-react";
import { AutopilotToggle } from "./AutopilotToggle";
import { SmartAlertsPopover } from "./SmartAlertsPopover";
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
  
  return (
    <TooltipProvider>
      <div className="flex items-center gap-4">
        {/* Status Metrics - Center */}
        <div className="flex items-center gap-3 text-sm">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="font-medium">
                {openConversations.length} <span className="text-muted-foreground font-normal">abertas</span>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Conversas abertas que precisam de atenção</p>
            </TooltipContent>
          </Tooltip>
          
          <span className="text-muted-foreground">•</span>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={cn(
                unreadCount > 0 ? "text-primary font-medium" : "text-muted-foreground"
              )}>
                {unreadCount} <span className="font-normal">não lidas</span>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Total de mensagens não lidas</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="w-px h-4 bg-border" />

        {/* Tools */}
        <div className="flex items-center gap-1">
          <SmartAlertsPopover />
          
          <AutopilotToggle variant="badge" />
          
          {/* Sync Button with Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                disabled={!emailConnection || isSyncing}
                className="gap-1 h-7 px-2"
              >
                <RefreshCw className={cn(
                  "w-3.5 h-3.5",
                  isSyncing && "animate-spin"
                )} />
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
      </div>
    </TooltipProvider>
  );
}
