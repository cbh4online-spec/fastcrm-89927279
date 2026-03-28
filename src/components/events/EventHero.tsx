import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, MapPin, Users, DollarSign, ArrowLeft, Image as ImageIcon, Copy, Download, Share2 } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import type { EventRecord } from "@/hooks/useEvents";

interface EventHeroProps {
  event: EventRecord;
  rsvpCount: number;
  onBack: () => void;
  onDuplicate?: () => void;
  onExport?: () => void;
}

export function EventHero({ event, rsvpCount, onBack, onDuplicate, onExport }: EventHeroProps) {
  const statusLabel = event.status === "published" ? "Publicado" : event.status === "cancelled" ? "Cancelado" : event.status === "completed" ? "Concluído" : "Rascunho";
  const statusVariant = event.status === "published" ? "default" as const : event.status === "cancelled" ? "destructive" as const : "secondary" as const;

  return (
    <div className="relative rounded-2xl overflow-hidden border bg-card">
      {/* Cover Image */}
      {event.cover_image_url ? (
        <div className="relative h-48 md:h-64 w-full">
          <img src={event.cover_image_url} alt={event.title} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        </div>
      ) : (
        <div className="relative h-32 md:h-44 w-full bg-gradient-to-br from-primary/10 via-primary/5 to-muted">
          <div className="absolute inset-0 flex items-center justify-center">
            <ImageIcon className="h-16 w-16 text-muted-foreground/20" />
          </div>
        </div>
      )}

      {/* Back button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onBack}
        className="absolute top-4 left-4 bg-black/30 hover:bg-black/50 text-white rounded-full h-9 w-9"
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>

      {/* Actions */}
      <div className="absolute top-4 right-4 flex gap-2">
        {onDuplicate && (
          <Button variant="ghost" size="sm" onClick={onDuplicate} className="bg-black/30 hover:bg-black/50 text-white rounded-full gap-1.5 h-8 text-xs">
            <Copy className="h-3.5 w-3.5" /> Duplicar
          </Button>
        )}
        {onExport && (
          <Button variant="ghost" size="sm" onClick={onExport} className="bg-black/30 hover:bg-black/50 text-white rounded-full gap-1.5 h-8 text-xs">
            <Download className="h-3.5 w-3.5" /> Exportar
          </Button>
        )}
      </div>

      {/* Content overlay */}
      <div className={`p-6 ${event.cover_image_url ? "-mt-20 relative z-10" : ""}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant={statusVariant}>{statusLabel}</Badge>
              {event.event_category && (
                <Badge variant="outline" className="bg-background/80 backdrop-blur-sm">
                  {event.event_category}
                </Badge>
              )}
            </div>
            <h1 className={`text-2xl md:text-3xl font-bold ${event.cover_image_url ? "text-white" : "text-foreground"}`}>
              {event.title}
            </h1>
            {event.description && (
              <p className={`text-sm max-w-2xl ${event.cover_image_url ? "text-white/80" : "text-muted-foreground"}`}>
                {event.description}
              </p>
            )}
          </div>
        </div>

        {/* Quick info pills */}
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <div className="flex items-center gap-1.5 text-sm bg-background/80 backdrop-blur-sm rounded-full px-3 py-1.5 border">
            <CalendarDays className="h-3.5 w-3.5 text-primary" />
            <span>{format(new Date(event.starts_at), "d MMM yyyy, HH:mm", { locale: pt })}</span>
          </div>
          {event.location && (
            <div className="flex items-center gap-1.5 text-sm bg-background/80 backdrop-blur-sm rounded-full px-3 py-1.5 border">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              <span>{event.location}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-sm bg-background/80 backdrop-blur-sm rounded-full px-3 py-1.5 border">
            <Users className="h-3.5 w-3.5 text-primary" />
            <span>{rsvpCount}{event.capacity ? ` / ${event.capacity}` : ""} convidados</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm bg-background/80 backdrop-blur-sm rounded-full px-3 py-1.5 border">
            <DollarSign className="h-3.5 w-3.5 text-primary" />
            <span>{event.price && event.price > 0 ? `${event.price} ${event.currency}` : "Grátis"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
