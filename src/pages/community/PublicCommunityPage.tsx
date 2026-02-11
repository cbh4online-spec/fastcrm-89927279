import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import {
  usePublicCommunitySettings,
  usePublicCommunityTopics,
  usePublicCommunityCategories,
  usePublicCommunityEvents,
} from "@/hooks/usePublicCommunity";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SocialPostCard } from "@/components/community/SocialPostCard";
import { CommunityEventBanner } from "@/components/community/CommunityEventBanner";
import {
  Loader2, MessageSquare, Users, Calendar, Heart,
  Zap, TrendingUp, Video, Globe, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
};

const publicTabs = [
  { value: "discussion", label: "Discussão", icon: MessageSquare },
  { value: "events", label: "Eventos", icon: Calendar },
  { value: "about", label: "Acerca de", icon: Heart },
];

export default function PublicCommunityPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: settings, isLoading } = usePublicCommunitySettings(slug);
  const workspaceId = settings?.workspace_id;
  const { data: topics = [] } = usePublicCommunityTopics(workspaceId);
  const { data: categories = [] } = usePublicCommunityCategories(workspaceId);
  const { data: events = [] } = usePublicCommunityEvents(workspaceId);

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <h1 className="text-2xl font-bold">Comunidade não encontrada</h1>
          <p className="text-muted-foreground">Esta comunidade não existe ou não está publicada.</p>
          <Button variant="outline" onClick={() => navigate("/")}>Voltar ao início</Button>
        </div>
      </div>
    );
  }

  const categoryMap = new Map(categories.map((c: any) => [c.id, c]));
  const filteredTopics = selectedCategory
    ? topics.filter((t: any) => t.category_id === selectedCategory)
    : topics;
  const totalTopics = topics.length;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/80">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "radial-gradient(circle at 20% 50%, hsl(var(--primary-foreground)) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        <div className="relative container mx-auto px-4 pt-10 pb-10">
          <motion.div {...fadeUp} className="max-w-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-12 w-12 rounded-2xl bg-primary-foreground/15 backdrop-blur-md flex items-center justify-center shadow-lg">
                {(settings as any).logo_url ? (
                  <img src={(settings as any).logo_url} alt="" className="h-10 w-10 rounded-xl object-cover" />
                ) : (
                  <Zap className="h-6 w-6 text-primary-foreground" />
                )}
              </div>
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-primary-foreground">
                  {settings.name}
                </h1>
                {settings.description && (
                  <p className="text-primary-foreground/60 text-sm mt-0.5 line-clamp-2">
                    {settings.description}
                  </p>
                )}
              </div>
            </div>
          </motion.div>

          {/* Stats strip */}
          <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="flex gap-6">
            {[
              { value: totalTopics, label: "Tópicos", icon: <MessageSquare className="h-3.5 w-3.5" /> },
              { value: categories.length, label: "Canais", icon: <Users className="h-3.5 w-3.5" /> },
              { value: events.length, label: "Eventos", icon: <Calendar className="h-3.5 w-3.5" /> },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-2">
                <span className="text-primary-foreground/40">{s.icon}</span>
                <div>
                  <p className="text-xl font-bold text-primary-foreground leading-none">{s.value}</p>
                  <p className="text-[10px] text-primary-foreground/50 uppercase tracking-wider">{s.label}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <main className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
        <Tabs defaultValue="discussion" className="w-full">
          <TabsList className="w-full justify-start bg-transparent border-b rounded-none p-0 h-auto gap-0">
            {publicTabs.map((t) => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 gap-1.5 text-sm"
              >
                <t.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{t.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Discussion Tab */}
          <TabsContent value="discussion" className="mt-6 space-y-4">
            <CommunityEventBanner workspaceId={workspaceId} />

            {/* Category pills */}
            {categories.length > 0 && (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={cn(
                    "shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-medium transition-colors",
                    !selectedCategory
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card hover:bg-muted/50"
                  )}
                >
                  Todos
                </button>
                {categories.map((c: any) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCategory(c.id)}
                    className={cn(
                      "shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-medium transition-colors",
                      selectedCategory === c.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card hover:bg-muted/50"
                    )}
                  >
                    <span>{c.icon || "💬"}</span>
                    {c.name}
                  </button>
                ))}
              </div>
            )}

            {/* Topics */}
            {filteredTopics.length > 0 ? (
              <div className="space-y-3">
                {filteredTopics.slice(0, 15).map((topic: any) => {
                  const cat = topic.category_id ? categoryMap.get(topic.category_id) : undefined;
                  return (
                    <SocialPostCard
                      key={topic.id}
                      topic={topic}
                      categoryName={cat?.name}
                      categoryIcon={cat?.icon || undefined}
                      onClick={() => {
                        if (user) {
                          navigate(`/club/${slug}/topic/${topic.id}`);
                        } else {
                          navigate(`/club/${slug}/auth?redirect=/club/${slug}/topic/${topic.id}`);
                        }
                      }}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 rounded-2xl border border-dashed bg-muted/20">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <p className="font-semibold text-foreground mb-1">Nenhuma discussão ainda</p>
                <p className="text-sm text-muted-foreground">Sê o primeiro a iniciar uma conversa!</p>
              </div>
            )}
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events" className="mt-6">
            <div className="space-y-4 max-w-2xl">
              {events.length === 0 ? (
                <div className="text-center py-16 rounded-2xl border border-dashed bg-muted/20">
                  <Calendar className="h-10 w-10 text-primary/40 mx-auto mb-3" />
                  <p className="font-semibold">Sem eventos agendados</p>
                  <p className="text-sm text-muted-foreground">Os próximos eventos aparecerão aqui.</p>
                </div>
              ) : (
                events.map((event: any) => (
                  <div
                    key={event.id}
                    className="flex items-center gap-4 p-4 rounded-2xl border bg-card hover:bg-muted/30 transition-colors"
                  >
                    <div
                      className={cn(
                        "h-12 w-12 rounded-xl flex items-center justify-center shrink-0",
                        event.event_type === "live"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-primary/10 text-primary"
                      )}
                    >
                      {event.event_type === "live" ? (
                        <Video className="h-5 w-5" />
                      ) : (
                        <Calendar className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="font-semibold text-sm truncate">{event.title}</h4>
                        <Badge
                          variant={event.event_type === "live" ? "destructive" : "secondary"}
                          className="text-[10px]"
                        >
                          {event.event_type === "live" ? "🔴 Live" : "📅 Evento"}
                        </Badge>
                      </div>
                      {event.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{event.description}</p>
                      )}
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {new Date(event.event_date || event.starts_at).toLocaleDateString("pt-PT", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    {event.link && (
                      <a href={event.link} target="_blank" rel="noopener noreferrer" className="shrink-0">
                        <Button variant="outline" size="sm" className="gap-1.5 rounded-full text-xs">
                          <ExternalLink className="h-3 w-3" /> Entrar
                        </Button>
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          {/* About Tab */}
          <TabsContent value="about" className="mt-6">
            <div className="max-w-2xl space-y-6">
              {/* Description */}
              <div className="rounded-2xl border bg-card p-6">
                <h3 className="font-bold text-lg mb-2">{settings.name}</h3>
                <Badge variant="outline" className="mb-3 gap-1">
                  <Globe className="h-3 w-3" /> Público
                </Badge>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {settings.description ||
                    "Bem-vindo à nossa comunidade! Aqui podes participar em discussões e trocar ideias."}
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border bg-card p-4 text-center">
                  <MessageSquare className="h-5 w-5 text-primary mx-auto mb-1" />
                  <p className="text-2xl font-bold">{totalTopics}</p>
                  <p className="text-xs text-muted-foreground">Tópicos</p>
                </div>
                <div className="rounded-xl border bg-card p-4 text-center">
                  <Users className="h-5 w-5 text-primary mx-auto mb-1" />
                  <p className="text-2xl font-bold">{categories.length}</p>
                  <p className="text-xs text-muted-foreground">Canais</p>
                </div>
                <div className="rounded-xl border bg-card p-4 text-center">
                  <Calendar className="h-5 w-5 text-primary mx-auto mb-1" />
                  <p className="text-2xl font-bold">{events.length}</p>
                  <p className="text-xs text-muted-foreground">Eventos</p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* CTA Banner for unauthenticated users */}
      {!user && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t shadow-lg z-50">
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-sm">Junte-se a {settings.name}</p>
              <p className="text-xs text-muted-foreground">Registe-se para participar nas discussões</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate(`/club/${slug}/auth?mode=login`)}>
                Entrar
              </Button>
              <Button size="sm" onClick={() => navigate(`/club/${slug}/auth`)}>
                Registar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
