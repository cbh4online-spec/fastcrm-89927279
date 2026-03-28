import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useEvents } from "@/hooks/useEvents";
import { useNavigate } from "react-router-dom";
import { Plus, CalendarDays, Search, LayoutGrid, List, X } from "lucide-react";
import { CreateEventDialog } from "./CreateEventDialog";
import { EventStatsBar } from "./EventStatsBar";
import { EventVisualCard } from "./EventVisualCard";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

const CATEGORY_LABELS: Record<string, string> = {
  networking: "Networking",
  jantar: "Jantar",
  workshop: "Workshop",
  webinar: "Webinar",
  conferencia: "Conferência",
  outro: "Outro",
};

const CATEGORIES = [
  { value: "all", label: "Todas categorias" },
  { value: "networking", label: "Networking" },
  { value: "jantar", label: "Jantar" },
  { value: "workshop", label: "Workshop" },
  { value: "webinar", label: "Webinar" },
  { value: "conferencia", label: "Conferência" },
  { value: "outro", label: "Outro" },
];

export default function EventsManagementPage() {
  const { currentWorkspace } = useWorkspace();
  const [tab, setTab] = useState("upcoming");
  const [createOpen, setCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const navigate = useNavigate();

  const filters = useMemo(() => {
    switch (tab) {
      case "upcoming": return { timeframe: "upcoming" as const };
      case "past": return { timeframe: "past" as const };
      case "drafts": return { status: "draft" };
      case "cancelled": return { status: "cancelled" };
      default: return {};
    }
  }, [tab]);

  const { data: events, isLoading } = useEvents(currentWorkspace?.id, filters);

  const filteredEvents = useMemo(() => {
    if (!events) return [];
    return events.filter((ev) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!ev.title.toLowerCase().includes(q) && !ev.location?.toLowerCase().includes(q)) return false;
      }
      if (categoryFilter !== "all" && ev.event_category !== categoryFilter) return false;
      return true;
    });
  }, [events, searchQuery, categoryFilter]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Eventos & Convites</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gerir eventos, jantares de networking e convites
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gap-1.5 rounded-full shadow-md">
            <Plus className="h-4 w-4" />
            Criar Evento
          </Button>
        </div>

        {/* Stats Bar */}
        <EventStatsBar workspaceId={currentWorkspace?.id} />

        {/* Tabs + Filters */}
        <Tabs value={tab} onValueChange={setTab}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <TabsList>
              <TabsTrigger value="upcoming">Próximos</TabsTrigger>
              <TabsTrigger value="past">Passados</TabsTrigger>
              <TabsTrigger value="drafts">Rascunhos</TabsTrigger>
              <TabsTrigger value="cancelled">Cancelados</TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar eventos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-8 h-9 rounded-lg"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[150px] h-9 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex rounded-lg border overflow-hidden">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="icon"
                  className="h-9 w-9 rounded-none"
                  onClick={() => setViewMode("grid")}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="icon"
                  className="h-9 w-9 rounded-none"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <TabsContent value={tab} className="mt-4">
            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-0">
                      <Skeleton className="h-24 w-full rounded-t-xl" />
                      <div className="p-4 space-y-3">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-4 w-2/3" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : !filteredEvents.length ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <CalendarDays className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">Nenhum evento encontrado</p>
                  {searchQuery || categoryFilter !== "all" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => { setSearchQuery(""); setCategoryFilter("all"); }}
                    >
                      Limpar filtros
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" className="mt-4" onClick={() => setCreateOpen(true)}>
                      Criar primeiro evento
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : viewMode === "grid" ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredEvents.map((ev) => (
                  <EventVisualCard
                    key={ev.id}
                    event={ev}
                    onClick={() => navigate(`/dashboard/events/${ev.id}`)}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredEvents.map((ev) => (
                  <Card
                    key={ev.id}
                    className="cursor-pointer hover:border-primary/40 transition-colors"
                    onClick={() => navigate(`/dashboard/events/${ev.id}`)}
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      {ev.cover_image_url ? (
                        <img src={ev.cover_image_url} alt="" className="h-12 w-20 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="h-12 w-20 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <CalendarDays className="h-5 w-5 text-muted-foreground/50" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">{ev.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(ev.starts_at), "d MMM yyyy, HH:mm", { locale: pt })}
                          {ev.location ? ` · ${ev.location}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {ev.event_category && (
                          <Badge variant="outline" className="text-xs">
                            {CATEGORY_LABELS[ev.event_category] || ev.event_category}
                          </Badge>
                        )}
                        <Badge variant={ev.status === "published" ? "default" : "secondary"} className="text-xs">
                          {ev.status === "published" ? "Publicado" : ev.status === "cancelled" ? "Cancelado" : "Rascunho"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <CreateEventDialog open={createOpen} onOpenChange={setCreateOpen} />
    </DashboardLayout>
  );
}
