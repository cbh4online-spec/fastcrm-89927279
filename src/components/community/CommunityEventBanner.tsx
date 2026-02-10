import { useUpcomingEvent } from "@/hooks/useCommunityEvents";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { Radio, Calendar, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CommunityEventBannerProps {
  workspaceId: string | undefined;
}

export function CommunityEventBanner({ workspaceId }: CommunityEventBannerProps) {
  const { data: event } = useUpcomingEvent(workspaceId);

  if (!event) return null;

  const isLive = event.event_type === "live";
  const timeUntil = formatDistanceToNow(new Date(event.starts_at), { addSuffix: false, locale: pt });

  return (
    <div className="rounded-2xl border bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 p-4 flex items-center gap-4">
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${isLive ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
        {isLive ? <Radio className="h-5 w-5 animate-pulse" /> : <Calendar className="h-5 w-5" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{event.title}</p>
        <p className="text-xs text-muted-foreground">
          {isLive ? "🔴 Live" : "📅 Evento"} começa em {timeUntil}
        </p>
      </div>
      {event.link && (
        <Button size="sm" variant="outline" className="gap-1.5 rounded-full shrink-0" asChild>
          <a href={event.link} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3.5 w-3.5" /> Abrir
          </a>
        </Button>
      )}
    </div>
  );
}
