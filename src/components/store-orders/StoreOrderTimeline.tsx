import { useStoreOrderEvents, useAddStoreOrderEvent } from "@/hooks/useStoreOrderEvents";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, History, Clock, RefreshCw, MessageSquare, CreditCard, Truck, RotateCcw, Send } from "lucide-react";
import { ORDER_EVENT_TYPE_CONFIG } from "@/types/store-order";
import { cn } from "@/lib/utils";
import { useState } from "react";

const iconMap: Record<string, React.ReactNode> = {
  RefreshCw: <RefreshCw className="h-3.5 w-3.5" />,
  MessageSquare: <MessageSquare className="h-3.5 w-3.5" />,
  CreditCard: <CreditCard className="h-3.5 w-3.5" />,
  Truck: <Truck className="h-3.5 w-3.5" />,
  RotateCcw: <RotateCcw className="h-3.5 w-3.5" />,
};

export function StoreOrderTimeline({ orderId }: { orderId: string }) {
  const { data: events = [], isLoading } = useStoreOrderEvents(orderId);
  const addEvent = useAddStoreOrderEvent();
  const [note, setNote] = useState("");

  const handleAddNote = () => {
    if (!note.trim()) return;
    addEvent.mutate({ orderId, eventType: "note_added", description: note.trim() });
    setNote("");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-4 w-4" />
          Timeline
          <Badge variant="secondary" className="ml-auto">{events.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Add note */}
        <div className="flex gap-2">
          <Input
            placeholder="Adicionar nota..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
            className="text-sm"
          />
          <Button size="icon" variant="outline" onClick={handleAddNote} disabled={addEvent.isPending || !note.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Sem eventos registados</p>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-3">
              {events.map((event, i) => {
                const config = ORDER_EVENT_TYPE_CONFIG[event.event_type] || { label: event.event_type, icon: "RefreshCw", color: "text-muted-foreground" };
                return (
                  <div key={event.id} className={cn("relative pl-6 pb-2", i < events.length - 1 && "border-l border-border ml-2")}>
                    <div className={cn("absolute left-0 top-0.5 w-4 h-4 rounded-full border-2 bg-background flex items-center justify-center", i === 0 ? "border-primary" : "border-muted-foreground")} style={{ transform: "translateX(-50%)" }}>
                      <span className={cn("scale-75", config.color)}>{iconMap[config.icon]}</span>
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={cn("text-xs", config.color)}>{config.label}</Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(event.created_at), "dd MMM yyyy, HH:mm", { locale: pt })}
                        </span>
                      </div>
                      <p className="text-sm text-foreground">{event.description}</p>
                      {event.from_status && event.to_status && (
                        <p className="text-xs text-muted-foreground">
                          <span className="line-through opacity-60">{event.from_status}</span> → <span className="font-medium">{event.to_status}</span>
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
