import { useConversationSummary, ConversationSummary as SummaryType } from "@/hooks/useConversationSummary";
import { Message } from "@/hooks/useMessages";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Sparkles, 
  RefreshCw, 
  CircleDot,
  Clock,
  ArrowRight,
  User,
  Users,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ConversationSummaryProps {
  conversationId: string | null;
  messages: Message[] | undefined;
  leadName?: string;
  channel?: string;
  lastMessageAt?: string;
  className?: string;
}

const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
  "Aguardando resposta": { color: "bg-amber-500/10 text-amber-600 border-amber-500/30", icon: <Clock className="w-3 h-3" /> },
  "Em negociação": { color: "bg-blue-500/10 text-blue-600 border-blue-500/30", icon: <ArrowRight className="w-3 h-3" /> },
  "Cliente interessado": { color: "bg-green-500/10 text-green-600 border-green-500/30", icon: <User className="w-3 h-3" /> },
  "Aguardando proposta": { color: "bg-purple-500/10 text-purple-600 border-purple-500/30", icon: <Users className="w-3 h-3" /> },
  default: { color: "bg-muted text-muted-foreground border-border", icon: <CircleDot className="w-3 h-3" /> },
};

function getStatusConfig(status: string) {
  // Check for partial matches
  const lowerStatus = status.toLowerCase();
  if (lowerStatus.includes("aguardando resposta") || lowerStatus.includes("a aguardar")) {
    return statusConfig["Aguardando resposta"];
  }
  if (lowerStatus.includes("negociação") || lowerStatus.includes("negociar")) {
    return statusConfig["Em negociação"];
  }
  if (lowerStatus.includes("interessado") || lowerStatus.includes("interesse")) {
    return statusConfig["Cliente interessado"];
  }
  if (lowerStatus.includes("proposta") || lowerStatus.includes("orçamento")) {
    return statusConfig["Aguardando proposta"];
  }
  return statusConfig.default;
}

export function ConversationSummary({
  conversationId,
  messages,
  leadName,
  channel,
  lastMessageAt,
  className,
}: ConversationSummaryProps) {
  const { summary, isLoading, error, refresh } = useConversationSummary({
    conversationId,
    messages,
    leadName,
    channel,
    lastMessageAt,
  });

  if (!conversationId || !messages || messages.length === 0) {
    return null;
  }

  if (isLoading && !summary) {
    return (
      <Card className={cn("border-dashed", className)}>
        <CardHeader className="pb-2 pt-3 px-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
            <Skeleton className="h-4 w-40" />
          </div>
        </CardHeader>
        <CardContent className="px-3 pb-3 space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  if (error && !summary) {
    return (
      <Card className={cn("border-dashed border-destructive/30", className)}>
        <CardContent className="px-3 py-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="w-4 h-4 text-destructive" />
            <span>Não foi possível gerar resumo</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 ml-auto"
              onClick={refresh}
            >
              <RefreshCw className="w-3 h-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return null;
  }

  const statusCfg = getStatusConfig(summary.status);

  return (
    <Card className={cn("border-dashed bg-muted/30", className)}>
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            Resumo automático da conversa
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={refresh}
            disabled={isLoading}
          >
            <RefreshCw className={cn("w-3 h-3", isLoading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-3">
        {/* Bullet points */}
        <ul className="space-y-1.5">
          {summary.bulletPoints.map((point, index) => (
            <li key={index} className="flex items-start gap-2 text-sm text-foreground">
              <CircleDot className="w-3 h-3 mt-1 text-primary shrink-0" />
              <span>{point}</span>
            </li>
          ))}
        </ul>

        {/* Status badge */}
        <div className="flex items-center gap-2 pt-1">
          <Badge
            variant="outline"
            className={cn(
              "text-xs font-normal flex items-center gap-1",
              statusCfg.color
            )}
          >
            {statusCfg.icon}
            {summary.status}
          </Badge>
          {summary.lastAction && (
            <span className="text-xs text-muted-foreground">
              Última ação: {summary.lastAction}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
