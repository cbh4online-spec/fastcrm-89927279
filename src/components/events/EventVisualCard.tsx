import { Badge } from "@/components/ui/badge";
import { CalendarDays, MapPin, Users, Image as ImageIcon } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import type { EventRecord } from "@/hooks/useEvents";

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Rascunho", variant: "secondary" },
  published: { label: "Publicado", variant: "default" },
  cancelled: { label: "Cancelado", variant: "destructive" },
  completed: { label: "Concluído", variant: "outline" },
};

const CATEGORY_COLORS: Record<string, string> = {
  networking: "border-l-blue-500",
  jantar: "border-l-amber-500",
  workshop: "border-l-emerald-500",
  webinar: "border-l-purple-500",
  conferencia: "border-l-rose-500",
  outro: "border-l-muted-foreground",
};

const CATEGORY_LABELS: Record<string, string> = {
  networking: "Networking",
  jantar: "Jantar",
  workshop: "Workshop",
  webinar: "Webinar",
  conferencia: "Conferência",
  outro: "Outro",
};

interface EventVisualCardProps {
  event: EventRecord;
  rsvpCount?: number;
  onClick: () => void;
}

export function EventVisualCard({ event, rsvpCount = 0, onClick }: EventVisualCardProps) {
  const sb = STATUS_BADGE[event.status] || STATUS_BADGE.draft;
  const borderColor = CATEGORY_COLORS[event.event_category || "outro"] || CATEGORY_COLORS.outro;
  const capacityPercent = event.capacity ? Math.min((rsvpCount / event.capacity) * 100, 100) : 0;
  const isPast = new Date(event.starts_at) < new Date();

  return (
    <div
      onClick={onClick}
      className={`group relative rounded-xl border bg-card overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary/40 border-l-4 ${borderColor} ${isPast ? "opacity-75" : ""}`}
    >
      {/* Cover Image */}
      {event.cover_image_url ? (
        <div className="relative h-36 w-full overflow-hidden">
          <img
            src={event.cover_image_url}
            alt={event.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-3 left-3 right-3">
            <h3 className="font-semibold text-white line-clamp-1 text-sm">{event.title}</h3>
          </div>
          <div className="absolute top-3 right-3">
            <Badge variant={sb.variant} className="text-xs shadow-sm">{sb.label}</Badge>
          </div>
        </div>
      ) : (
        <div className="relative h-24 w-full bg-gradient-to-br from-muted/50 to-muted flex items-center justify-center overflow-hidden">
          <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
          <div className="absolute bottom-3 left-3 right-3">
            <h3 className="font-semibold text-foreground line-clamp-1 text-sm">{event.title}</h3>
          </div>
          <div className="absolute top-3 right-3">
            <Badge variant={sb.variant} className="text-xs">{sb.label}</Badge>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-4 space-y-3">
        <div className="space-y-1.5 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{format(new Date(event.starts_at), "d MMM yyyy, HH:mm", { locale: pt })}</span>
          </div>
          {event.location && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{event.location}</span>
            </div>
          )}
        </div>

        {/* Capacity bar */}
        {event.capacity && event.capacity > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Users className="h-3 w-3" />
                {rsvpCount} / {event.capacity}
              </span>
              <span className={`font-medium ${capacityPercent >= 90 ? "text-destructive" : capacityPercent >= 70 ? "text-amber-500" : "text-muted-foreground"}`}>
                {Math.round(capacityPercent)}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${capacityPercent >= 90 ? "bg-destructive" : capacityPercent >= 70 ? "bg-amber-500" : "bg-primary"}`}
                style={{ width: `${capacityPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-2 pt-1 flex-wrap">
          {event.event_category && (
            <Badge variant="outline" className="text-xs">
              {CATEGORY_LABELS[event.event_category] || event.event_category}
            </Badge>
          )}
          {event.price !== null && event.price > 0 && (
            <Badge className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20">
              {event.price}€
            </Badge>
          )}
          {event.price === null || event.price === 0 ? (
            <Badge variant="outline" className="text-xs text-muted-foreground">Grátis</Badge>
          ) : null}
        </div>
      </div>
    </div>
  );
}
