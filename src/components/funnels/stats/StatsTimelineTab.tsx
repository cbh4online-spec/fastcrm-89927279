import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Clock, Monitor, Smartphone, Tablet, ChevronDown, Star, User, Play, ExternalLink } from "lucide-react";
import { type TimelineEvent } from "./statsHelpers";

interface Props {
  timeline: TimelineEvent[];
  templateSlug?: string;
}

type FilterType = "all" | "conversions" | "visits";

export function StatsTimelineTab({ timeline }: Props) {
  const [filter, setFilter] = useState<FilterType>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("");

  const filtered = useMemo(() => {
    let result = timeline;
    if (filter === "conversions") result = result.filter(e => e.type === "form_submit");
    if (filter === "visits") result = result.filter(e => e.type === "view");
    if (sourceFilter) result = result.filter(e => e.source.toLowerCase().includes(sourceFilter.toLowerCase()));
    return result;
  }, [timeline, filter, sourceFilter]);

  // Group by session
  const grouped = useMemo(() => {
    const sessions: Record<string, TimelineEvent[]> = {};
    const noSession: TimelineEvent[] = [];
    for (const evt of filtered) {
      if (evt.sessionId) {
        if (!sessions[evt.sessionId]) sessions[evt.sessionId] = [];
        sessions[evt.sessionId].push(evt);
      } else {
        noSession.push(evt);
      }
    }
    return { sessions, noSession };
  }, [filtered]);

  const deviceIcon = (device: string) => {
    if (device === "mobile") return <Smartphone className="h-3 w-3" />;
    if (device === "tablet") return <Tablet className="h-3 w-3" />;
    return <Monitor className="h-3 w-3" />;
  };

  const renderEvent = (evt: TimelineEvent, i: number) => {
    const isConversion = evt.type === "form_submit";
    return (
      <div
        key={i}
        className={`flex items-center gap-3 py-2.5 px-3 rounded-lg transition-colors ${isConversion ? "bg-emerald-500/5 border border-emerald-500/10" : "hover:bg-muted/30"}`}
      >
        <div className={`w-2 h-2 rounded-full shrink-0 ${isConversion ? "bg-emerald-500" : "bg-amber-400"}`} />
        <Badge
          variant={isConversion ? "default" : "secondary"}
          className={`text-[10px] px-1.5 shrink-0 ${isConversion ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-amber-500/10 text-amber-400 border-amber-500/20"}`}
        >
          {isConversion ? "⭐ Conversão" : "Visita"}
        </Badge>
        <span className="text-xs text-muted-foreground tabular-nums shrink-0">{evt.time}</span>
        <span className="text-muted-foreground shrink-0">{deviceIcon(evt.device)}</span>
        <span className="text-xs text-muted-foreground truncate flex-1">{evt.source}</span>
        <span className="text-xs text-muted-foreground shrink-0">{evt.location}</span>
        {evt.contactName && (
          <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 gap-1">
            <User className="h-3 w-3" />
            {evt.contactName}
          </Button>
        )}
      </div>
    );
  };

  return (
    <Card className="border-white/[0.08] rounded-xl">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-400" />
            Timeline de Eventos
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex bg-muted/30 rounded-lg p-0.5">
              {[
                { key: "all" as FilterType, label: "Todos" },
                { key: "conversions" as FilterType, label: "Conversões" },
                { key: "visits" as FilterType, label: "Visitas" },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`text-xs px-3 py-1 rounded-md transition-colors ${filter === f.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <Badge variant="outline" className="text-[10px] gap-1">
              <Play className="h-3 w-3" />
              Session Replay — Em breve
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length > 0 ? (
          <div className="space-y-1">
            {/* Sessions */}
            {Object.entries(grouped.sessions).map(([sessionId, sessionEvents]) => (
              <Collapsible key={sessionId}>
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-muted/20 transition-colors">
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Sessão</span>
                    <span className="text-[10px] text-muted-foreground/60 font-mono">{sessionId.slice(0, 8)}</span>
                    <span className="text-xs text-muted-foreground">{sessionEvents.length} eventos</span>
                    {sessionEvents.some(e => e.type === "form_submit") && (
                      <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Converteu</Badge>
                    )}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-4 border-l border-border/30 ml-2">
                  {sessionEvents.map((evt, i) => renderEvent(evt, i))}
                </CollapsibleContent>
              </Collapsible>
            ))}
            {/* Ungrouped events */}
            {grouped.noSession.map((evt, i) => renderEvent(evt, i))}
          </div>
        ) : (
          <div className="h-40 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <Clock className="h-8 w-8 opacity-40" />
            <p className="text-sm">Sem eventos registados</p>
            <p className="text-xs">Os eventos aparecem à medida que os visitantes interagem com o funil</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
