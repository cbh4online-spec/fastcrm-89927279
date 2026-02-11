import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import {
  usePublicCommunitySettings,
  usePublicCommunityTopics,
  usePublicCommunityCategories,
  usePublicCommunityEvents,
  usePublicCommunityMembers,
} from "@/hooks/usePublicCommunity";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SocialPostCard } from "@/components/community/SocialPostCard";
import { CommunityEventBanner } from "@/components/community/CommunityEventBanner";
import { PublicCommunitySidebar } from "@/components/community/PublicCommunitySidebar";
import {
  Loader2, MessageSquare, Users, Calendar, Heart, Trophy,
  Zap, TrendingUp, Video, Globe, ExternalLink, Search, Plus,
  ArrowLeft, Gift, Award, Star, Crown, Sparkles, UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
};

const allTabs = [
  { value: "discussion", key: "discussao", label: "Discussão", icon: MessageSquare },
  { value: "events", key: "eventos", label: "Eventos", icon: Calendar },
  { value: "leaderboard", key: "classificacao", label: "Classificação", icon: Trophy },
  { value: "members", key: "membros", label: "Membros", icon: Users },
  { value: "about", key: "acerca", label: "Acerca de", icon: Heart },
];

export default function PublicCommunityPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: settings, isLoading } = usePublicCommunitySettings(slug);
  const workspaceId = settings?.workspace_id;
  const { data: topics = [], isLoading: topicsLoading } = usePublicCommunityTopics(workspaceId);
  const { data: categories = [] } = usePublicCommunityCategories(workspaceId);
  const { data: events = [] } = usePublicCommunityEvents(workspaceId);
  const { data: members = [] } = usePublicCommunityMembers(workspaceId);

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

  const visibleTabs = (settings as any)?.visible_tabs || {};
  const filteredTabs = allTabs.filter(t => visibleTabs[t.key] !== false);

  const categoryMap = new Map(categories.map((c: any) => [c.id, c]));
  const totalTopics = topics.length;
  const totalPosts = topics.reduce((sum: number, t: any) => sum + (t.replies_count || 0), 0);

  const filteredTopics = topics.filter((t: any) => {
    const matchesCategory = !selectedCategory || t.category_id === selectedCategory;
    const matchesSearch = !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase()) || t.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const goAuth = (redirect?: string) => {
    const base = `/club/${slug}/auth`;
    navigate(redirect ? `${base}?redirect=${redirect}` : base);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Hero - identical to FastClubPage */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/80">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, hsl(var(--primary-foreground)) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

        <div className="relative container mx-auto px-4 pt-6 pb-10">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div />
          </div>

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
                <p className="text-primary-foreground/60 text-sm">Comunidade · Gamificação · Recompensas</p>
              </div>
            </div>
          </motion.div>

          {/* Stats strip */}
          <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="flex gap-6">
            {[
              { value: totalTopics, label: "Tópicos", icon: <MessageSquare className="h-3.5 w-3.5" /> },
              { value: totalPosts, label: "Respostas", icon: <TrendingUp className="h-3.5 w-3.5" /> },
              { value: categories.length, label: "Canais", icon: <Users className="h-3.5 w-3.5" /> },
              { value: events.length, label: "Eventos", icon: <Calendar className="h-3.5 w-3.5" /> },
            ].map(s => (
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

      <main className="container mx-auto px-4 py-6 max-w-6xl space-y-6">
        {/* Gamification preview card */}
        <motion.div {...fadeUp} transition={{ delay: 0.15 }} className="-mt-8 relative z-10">
          <div className="rounded-2xl border bg-card shadow-lg p-5 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center gap-4 flex-1">
                <div className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 bg-gradient-to-br from-amber-700 to-amber-500 text-white shadow-md">
                  <Award className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <h3 className="font-bold text-base">Nível Bronze</h3>
                    <Badge className="text-[10px] border bg-amber-500/10 text-amber-700 border-amber-200">Bronze</Badge>
                  </div>
                  <div className="flex items-baseline gap-1.5 mb-2">
                    <span className="text-2xl font-extrabold text-foreground">0</span>
                    <span className="text-xs text-muted-foreground">pontos disponíveis</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Bronze</span>
                      <span>Silver</span>
                    </div>
                    <Progress value={0} className="h-1.5" />
                    <p className="text-[10px] text-muted-foreground">Regista-te para ganhar pontos e subir de nível</p>
                  </div>
                </div>
              </div>
              <div className="flex sm:flex-col items-center gap-2 sm:border-l sm:pl-4">
                <Button size="sm" className="gap-1.5 rounded-full w-full" onClick={() => goAuth()}>
                  <Gift className="h-3.5 w-3.5" /> Resgatar
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5 rounded-full w-full" onClick={() => goAuth()}>
                  <Trophy className="h-3.5 w-3.5" /> Histórico
                </Button>
              </div>
            </div>
            {/* Overlay for non-authenticated */}
            {!user && (
              <div className="absolute inset-0 bg-card/60 backdrop-blur-[2px] rounded-2xl flex items-center justify-center">
                <Button className="gap-1.5 rounded-full shadow-lg" onClick={() => goAuth()}>
                  <Sparkles className="h-4 w-4" /> Regista-te para ganhar pontos
                </Button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Navigation Tabs - identical to FastClubPage */}
        <Tabs defaultValue={filteredTabs[0]?.value || "discussion"} className="w-full">
          <TabsList className="w-full justify-start bg-transparent border-b rounded-none p-0 h-auto gap-0">
            {filteredTabs.map(t => (
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
          <TabsContent value="discussion" className="mt-6">
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <CommunityEventBanner workspaceId={workspaceId} />

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Pesquisar tópicos..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 rounded-full bg-muted/40 border-border h-11"
                    />
                  </div>
                  <Button
                    className="gap-1.5 rounded-full h-11"
                    onClick={() => goAuth()}
                  >
                    <Plus className="h-4 w-4" /> Novo
                  </Button>
                </div>

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

                {topicsLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-[140px] rounded-2xl" />
                    ))}
                  </div>
                ) : filteredTopics.length > 0 ? (
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
                              goAuth(`/club/${slug}/topic/${topic.id}`);
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
              </div>

              <div className="hidden lg:block">
                <PublicCommunitySidebar
                  workspaceId={workspaceId}
                  settings={settings as any}
                  onRegisterClick={() => goAuth()}
                  topicsCount={totalTopics + totalPosts}
                />
              </div>
            </div>
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
                  <div key={event.id} className="flex items-center gap-4 p-4 rounded-2xl border bg-card hover:bg-muted/30 transition-colors">
                    <div className={cn(
                      "h-12 w-12 rounded-xl flex items-center justify-center shrink-0",
                      event.event_type === "live" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                    )}>
                      {event.event_type === "live" ? <Video className="h-5 w-5" /> : <Calendar className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="font-semibold text-sm truncate">{event.title}</h4>
                        <Badge variant={event.event_type === "live" ? "destructive" : "secondary"} className="text-[10px]">
                          {event.event_type === "live" ? "🔴 Live" : "📅 Evento"}
                        </Badge>
                      </div>
                      {event.description && <p className="text-xs text-muted-foreground line-clamp-1">{event.description}</p>}
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {new Date(event.event_date || event.starts_at).toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
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

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard" className="mt-6">
            <div className="text-center py-16 rounded-2xl border border-dashed bg-muted/20 relative overflow-hidden">
              <Trophy className="h-10 w-10 text-primary/40 mx-auto mb-3" />
              <p className="font-semibold">Classificação</p>
              <p className="text-sm text-muted-foreground mb-4">Participa para aparecer no leaderboard!</p>
              {!user && (
                <Button className="gap-1.5 rounded-full" onClick={() => goAuth()}>
                  <Sparkles className="h-4 w-4" /> Registar para participar
                </Button>
              )}
            </div>
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members" className="mt-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {members.map((m: any) => (
                  <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-muted/30 transition-colors">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                      {(m.profile?.full_name || "U").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.profile?.full_name || "Membro"}</p>
                      <p className="text-[11px] text-muted-foreground capitalize">{m.role}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] capitalize shrink-0">{m.role}</Badge>
                  </div>
                ))}
              </div>
              {members.length === 0 && (
                <p className="text-sm text-muted-foreground py-8 text-center">Nenhum membro encontrado</p>
              )}
            </div>
          </TabsContent>

          {/* About Tab */}
          <TabsContent value="about" className="mt-6">
            <div className="max-w-2xl space-y-6">
              <div className="rounded-2xl border bg-card p-6">
                <h3 className="font-bold text-lg mb-2">{settings.name}</h3>
                <Badge variant="outline" className="mb-3 gap-1">
                  <Globe className="h-3 w-3" /> Público
                </Badge>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {(settings as any).description || "Bem-vindo à nossa comunidade! Aqui podes participar em discussões, ganhar pontos e trocar por recompensas exclusivas."}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border bg-card p-4 text-center">
                  <Users className="h-5 w-5 text-primary mx-auto mb-1" />
                  <p className="text-2xl font-bold">{members.length}</p>
                  <p className="text-xs text-muted-foreground">Membros</p>
                </div>
                <div className="rounded-xl border bg-card p-4 text-center">
                  <MessageSquare className="h-5 w-5 text-primary mx-auto mb-1" />
                  <p className="text-2xl font-bold">{totalTopics}</p>
                  <p className="text-xs text-muted-foreground">Tópicos</p>
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
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-sm">Junte-se a {settings.name}</p>
              <p className="text-xs text-muted-foreground">Registe-se para participar nas discussões e ganhar pontos</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => goAuth()}>
                Entrar
              </Button>
              <Button size="sm" onClick={() => goAuth()}>
                Registar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
