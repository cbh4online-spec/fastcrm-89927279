import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useEvents } from "@/hooks/useEvents";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Plus, CalendarDays, MapPin, Users, Loader2 } from "lucide-react";
import { CreateEventDialog } from "./CreateEventDialog";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Rascunho", variant: "secondary" },
  published: { label: "Publicado", variant: "default" },
  cancelled: { label: "Cancelado", variant: "destructive" },
  completed: { label: "Concluído", variant: "outline" },
};

const CATEGORY_LABELS: Record<string, string> = {
  networking: "Networking",
  jantar: "Jantar",
  workshop: "Workshop",
  webinar: "Webinar",
  conferencia: "Conferência",
  outro: "Outro",
};

export default function EventsManagementPage() {
  const { currentWorkspace } = useWorkspace();
  const [tab, setTab] = useState("upcoming");
  const [createOpen, setCreateOpen] = useState(false);
  const navigate = useNavigate();

  const filters = (() => {
    switch (tab) {
      case "upcoming": return { timeframe: "upcoming" as const, status: undefined };
      case "past": return { timeframe: "past" as const, status: undefined };
      case "drafts": return { status: "draft" };
      case "cancelled": return { status: "cancelled" };
      default: return {};
    }
  })();

  const { data: events, isLoading } = useEvents(currentWorkspace?.id, filters);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Eventos & Convites</h1>
            <p className="text-sm text-muted-foreground mt-1">Gerir eventos, jantares de networking e convites</p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Criar Evento
          </Button>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="upcoming">Próximos</TabsTrigger>
            <TabsTrigger value="past">Passados</TabsTrigger>
            <TabsTrigger value="drafts">Rascunhos</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelados</TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="mt-4">
            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i}><CardContent className="p-5 space-y-3"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-4 w-2/3" /></CardContent></Card>
                ))}
              </div>
            ) : !events?.length ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <CalendarDays className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">Nenhum evento encontrado</p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => setCreateOpen(true)}>
                    Criar primeiro evento
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {events.map((ev) => {
                  const sb = STATUS_BADGE[ev.status] || STATUS_BADGE.draft;
                  return (
                    <Card
                      key={ev.id}
                      className="cursor-pointer hover:border-primary/40 transition-colors"
                      onClick={() => navigate(`/dashboard/events/${ev.id}`)}
                    >
                      <CardContent className="p-5 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-foreground line-clamp-1">{ev.title}</h3>
                          <Badge variant={sb.variant} className="shrink-0 text-xs">{sb.label}</Badge>
                        </div>
                        <div className="space-y-1.5 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <CalendarDays className="h-3.5 w-3.5" />
                            {format(new Date(ev.starts_at), "d MMM yyyy, HH:mm", { locale: pt })}
                          </div>
                          {ev.location && (
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5" />
                              <span className="truncate">{ev.location}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          {ev.event_category && (
                            <Badge variant="outline" className="text-xs">
                              {CATEGORY_LABELS[ev.event_category] || ev.event_category}
                            </Badge>
                          )}
                          {ev.price !== null && ev.price > 0 && (
                            <span className="text-xs font-medium text-foreground">
                              {ev.price}€
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <CreateEventDialog open={createOpen} onOpenChange={setCreateOpen} />
    </DashboardLayout>
  );
}
