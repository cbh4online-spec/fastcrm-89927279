import { useKernelEvents } from "@/hooks/useKernelEvents";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Radio, ArrowRightLeft, MessageSquare, FileText, Zap } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

const EVENT_ICONS: Record<string, React.ReactNode> = {
  "OPPORTUNITY.STAGE_CHANGED": <ArrowRightLeft className="h-3.5 w-3.5 text-chart-1" />,
  "OPPORTUNITY.UPDATED": <FileText className="h-3.5 w-3.5 text-chart-2" />,
  "OPPORTUNITY.CLOSED": <Zap className="h-3.5 w-3.5 text-chart-4" />,
  "CONVERSATION.CLASSIFIED": <MessageSquare className="h-3.5 w-3.5 text-chart-3" />,
  "CONTEXT.BLOCK_UPDATED": <FileText className="h-3.5 w-3.5 text-gold" />,
};

const EVENT_LABELS: Record<string, string> = {
  "OPPORTUNITY.STAGE_CHANGED": "Stage alterado",
  "OPPORTUNITY.UPDATED": "Oportunidade atualizada",
  "OPPORTUNITY.CLOSED": "Oportunidade fechada",
  "CONVERSATION.CLASSIFIED": "Conversa classificada",
  "CONTEXT.BLOCK_UPDATED": "Bloco atualizado",
};

export function KernelEventsTimeline() {
  const { data: events, isLoading } = useKernelEvents(15);

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Radio className="h-4 w-4 text-primary" /> Eventos Recentes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Radio className="h-4 w-4 text-primary" /> Eventos Recentes
          {events && events.length > 0 && (
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
              {events.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[220px] px-4 pb-4">
          {!events?.length ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              Sem eventos registados
            </p>
          ) : (
            <div className="space-y-1">
              {events.map((evt) => (
                <div
                  key={evt.id}
                  className="flex items-center gap-2.5 py-1.5 px-2 rounded-md hover:bg-muted/40 transition-colors"
                >
                  <div className="flex-shrink-0">
                    {EVENT_ICONS[evt.type] ?? <Zap className="h-3.5 w-3.5 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">
                      {EVENT_LABELS[evt.type] ?? evt.type}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {evt.entity_kind}:{evt.entity_id?.slice(0, 8)}
                      {evt.source_module ? ` · ${evt.source_module}` : ""}
                    </p>
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0">
                    {formatDistanceToNow(new Date(evt.created_at), { addSuffix: true, locale: pt })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
