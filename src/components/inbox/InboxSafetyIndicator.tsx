import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  AlertTriangle,
  Clock,
  Pause,
  Play,
  MessageSquare,
  Zap,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useInboxSafetyStatus,
  useInboxAutomationsPause,
  useToggleInboxAutomationsPause,
  usePendingConfirmations,
} from "@/hooks/useInboxSafety";
import { useAutomationGlobalPause, useToggleGlobalPause } from "@/hooks/useAutomationSafety";

interface InboxSafetyIndicatorProps {
  conversationId?: string;
  compact?: boolean;
}

export function InboxSafetyIndicator({
  conversationId,
  compact = false,
}: InboxSafetyIndicatorProps) {
  const safetyStatus = useInboxSafetyStatus(conversationId);
  const { data: isGloballyPaused = false } = useAutomationGlobalPause();
  const { data: isInboxPaused = false } = useInboxAutomationsPause();
  const toggleGlobalPause = useToggleGlobalPause();
  const toggleInboxPause = useToggleInboxAutomationsPause();
  const { pendingActions } = usePendingConfirmations(conversationId);

  const hasIssues =
    safetyStatus.isGloballyPaused ||
    safetyStatus.isInboxPaused ||
    safetyStatus.loopDetected ||
    safetyStatus.rateLimitPercentage >= 80;

  const getStatusIcon = () => {
    if (safetyStatus.isGloballyPaused || safetyStatus.isInboxPaused) {
      return <ShieldOff className="w-4 h-4 text-amber-500" />;
    }
    if (safetyStatus.loopDetected) {
      return <ShieldAlert className="w-4 h-4 text-red-500" />;
    }
    if (safetyStatus.rateLimitPercentage >= 80) {
      return <Shield className="w-4 h-4 text-amber-500" />;
    }
    return <ShieldCheck className="w-4 h-4 text-green-500" />;
  };

  const getStatusColor = () => {
    if (safetyStatus.isGloballyPaused || safetyStatus.isInboxPaused) {
      return "border-amber-500/30 text-amber-600 bg-amber-500/10";
    }
    if (safetyStatus.loopDetected) {
      return "border-red-500/30 text-red-600 bg-red-500/10";
    }
    if (safetyStatus.rateLimitPercentage >= 80) {
      return "border-amber-500/30 text-amber-600 bg-amber-500/10";
    }
    return "border-green-500/30 text-green-600 bg-green-500/10";
  };

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={cn("gap-1 cursor-pointer", getStatusColor())}
            >
              {getStatusIcon()}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs space-y-1">
              {safetyStatus.isGloballyPaused && (
                <p>⏸️ Todas as automações pausadas</p>
              )}
              {safetyStatus.isInboxPaused && <p>⏸️ Inbox automações pausadas</p>}
              {safetyStatus.loopDetected && <p>🔄 Loop de mensagens detectado</p>}
              {safetyStatus.rateLimitPercentage >= 80 && (
                <p>⚠️ {Math.round(safetyStatus.rateLimitPercentage)}% do limite</p>
              )}
              {!hasIssues && <p>✅ Sistema operacional</p>}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn("gap-1.5 h-7 px-2", hasIssues && "text-amber-600")}
        >
          {getStatusIcon()}
          <span className="text-xs">Segurança</span>
          {pendingActions.length > 0 && (
            <Badge variant="secondary" className="h-4 w-4 p-0 text-[10px]">
              {pendingActions.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Controlos de Segurança
            </h4>
            {getStatusIcon()}
          </div>

          <Separator />

          {/* Global Pause Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Automações Globais</span>
            </div>
            <div className="flex items-center gap-2">
              {isGloballyPaused ? (
                <Badge variant="outline" className="text-xs text-amber-600">
                  <Pause className="w-3 h-3 mr-1" />
                  Pausado
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-green-600">
                  <Play className="w-3 h-3 mr-1" />
                  Ativo
                </Badge>
              )}
              <Switch
                checked={!isGloballyPaused}
                onCheckedChange={(checked) => toggleGlobalPause.mutate(!checked)}
                disabled={toggleGlobalPause.isPending}
              />
            </div>
          </div>

          {/* Inbox Automations Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Automações Inbox</span>
            </div>
            <div className="flex items-center gap-2">
              {isInboxPaused ? (
                <Badge variant="outline" className="text-xs text-amber-600">
                  <Pause className="w-3 h-3 mr-1" />
                  Pausado
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-green-600">
                  <Play className="w-3 h-3 mr-1" />
                  Ativo
                </Badge>
              )}
              <Switch
                checked={!isInboxPaused}
                onCheckedChange={(checked) => toggleInboxPause.mutate(!checked)}
                disabled={toggleInboxPause.isPending}
              />
            </div>
          </div>

          <Separator />

          {/* Message Rate Limit */}
          {conversationId && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Mensagens (1h)</span>
                <span className="font-medium">
                  {safetyStatus.recentMessageCount} / {safetyStatus.maxMessagesPerHour}
                </span>
              </div>
              <Progress
                value={safetyStatus.rateLimitPercentage}
                className={cn(
                  "h-2",
                  safetyStatus.rateLimitPercentage >= 80 && "[&>div]:bg-amber-500",
                  safetyStatus.rateLimitPercentage >= 100 && "[&>div]:bg-red-500"
                )}
              />
            </div>
          )}

          {/* Loop Detection Warning */}
          {safetyStatus.loopDetected && (
            <div className="flex items-start gap-2 p-2 rounded-md bg-red-500/10 text-red-600">
              <RefreshCw className="w-4 h-4 mt-0.5" />
              <div className="text-xs">
                <p className="font-medium">Loop detectado</p>
                <p className="text-red-600/80">
                  Mensagens automáticas suspensas temporariamente
                </p>
              </div>
            </div>
          )}

          {/* Pending Confirmations */}
          {pendingActions.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>Ações pendentes: {pendingActions.length}</span>
              </div>
              <div className="space-y-1">
                {pendingActions.slice(0, 3).map((action) => (
                  <div
                    key={action.id}
                    className="text-xs p-2 bg-muted rounded flex items-center justify-between"
                  >
                    <span className="truncate flex-1">
                      {action.action === "send_message"
                        ? "Enviar mensagem"
                        : action.action}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      Aguarda
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Safety Rules Info */}
          <div className="text-[11px] text-muted-foreground space-y-1 pt-2 border-t">
            <p className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              Mensagens nunca são enviadas automaticamente
            </p>
            <p className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Loops são detectados e prevenidos
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
