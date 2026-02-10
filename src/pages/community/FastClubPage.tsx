import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useForumCategories, useForumTopics } from "@/hooks/useForum";
import { useLoyaltyProfile, getTierProgress } from "@/hooks/useLoyalty";
import { useCommunityEvents } from "@/hooks/useCommunityEvents";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  MessageSquare, Trophy, Star, Crown, Users, TrendingUp,
  ArrowLeft, Plus, Search, Gift, Zap, Heart, Award, Sparkles,
  Settings, Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { SocialPostCard } from "@/components/community/SocialPostCard";
import { CommunitySidebar } from "@/components/community/CommunitySidebar";
import { CommunityEventBanner } from "@/components/community/CommunityEventBanner";
import { CommunityMembersList } from "@/components/community/CommunityMembersList";
import { CommunityLeaderboard } from "@/components/community/CommunityLeaderboard";
import { CommunityAbout } from "@/components/community/CommunityAbout";
import { CommunitySettingsDialog } from "@/components/community/CommunitySettingsDialog";

const tierConfig: Record<string, { label: string; icon: React.ReactNode; gradient: string; bg: string }> = {
  bronze: {
    label: "Bronze",
    icon: <Award className="h-5 w-5" />,
    gradient: "from-amber-700 to-amber-500",
    bg: "bg-amber-500/10 text-amber-700 border-amber-200",
  },
  silver: {
    label: "Silver",
    icon: <Star className="h-5 w-5" />,
    gradient: "from-slate-500 to-slate-400",
    bg: "bg-slate-400/10 text-slate-600 border-slate-200",
  },
  gold: {
    label: "Gold",
    icon: <Crown className="h-5 w-5" />,
    gradient: "from-yellow-500 to-amber-400",
    bg: "bg-yellow-400/10 text-yellow-700 border-yellow-200",
  },
  platinum: {
    label: "Platinum",
    icon: <Sparkles className="h-5 w-5" />,
    gradient: "from-violet-500 to-indigo-400",
    bg: "bg-violet-400/10 text-violet-700 border-violet-200",
  },
};

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
};

export default function FastClubPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const isAdmin = currentWorkspace?.role === "owner" || currentWorkspace?.role === "admin";

  const [searchQuery, setSearchQuery] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const { data: categories = [] } = useForumCategories(workspaceId);
  const { data: topics = [], isLoading } = useForumTopics(workspaceId);
  const { data: loyaltyProfile } = useLoyaltyProfile(workspaceId);
  const { data: events = [] } = useCommunityEvents(workspaceId);

  const tierInfo = loyaltyProfile ? getTierProgress(loyaltyProfile.lifetime_points) : getTierProgress(0);
  const tier = tierConfig[tierInfo.tier] || tierConfig.bronze;

  const filteredTopics = searchQuery
    ? topics.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()) || t.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : topics;

  const categoryMap = new Map(categories.map(c => [c.id, c]));
  const totalTopics = topics.length;
  const totalPosts = topics.reduce((sum, t) => sum + t.replies_count, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/80">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, hsl(var(--primary-foreground)) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

        <div className="relative container mx-auto px-4 pt-6 pb-10">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
              className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            {isAdmin && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSettingsOpen(true)}
                className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
              >
                <Settings className="h-5 w-5" />
              </Button>
            )}
          </div>

          <motion.div {...fadeUp} className="max-w-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-12 w-12 rounded-2xl bg-primary-foreground/15 backdrop-blur-md flex items-center justify-center shadow-lg">
                <Zap className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-primary-foreground">FastClub</h1>
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
        {/* Gamification card */}
        {user && (
          <motion.div {...fadeUp} transition={{ delay: 0.15 }} className="-mt-8 relative z-10">
            <div className="rounded-2xl border bg-card shadow-lg p-5">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 bg-gradient-to-br text-white shadow-md", tier.gradient)}>
                    {tier.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h3 className="font-bold text-base">Nível {tier.label}</h3>
                      <Badge className={cn("text-[10px] border", tier.bg)}>{tier.label}</Badge>
                    </div>
                    <div className="flex items-baseline gap-1.5 mb-2">
                      <span className="text-2xl font-extrabold text-foreground">{loyaltyProfile?.balance || 0}</span>
                      <span className="text-xs text-muted-foreground">pontos disponíveis</span>
                    </div>
                    {tierInfo.next && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>{tier.label}</span>
                          <span>{tierConfig[tierInfo.next]?.label}</span>
                        </div>
                        <Progress value={tierInfo.progress} className="h-1.5" />
                        <p className="text-[10px] text-muted-foreground">
                          {loyaltyProfile?.lifetime_points || 0} pts acumulados · {tierInfo.progress}% para {tierConfig[tierInfo.next]?.label}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex sm:flex-col items-center gap-2 sm:border-l sm:pl-4">
                  <Button size="sm" className="gap-1.5 rounded-full w-full" onClick={() => navigate("/dashboard/fastclub/rewards")}>
                    <Gift className="h-3.5 w-3.5" /> Resgatar
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5 rounded-full w-full" onClick={() => navigate("/dashboard/fastclub/rewards")}>
                    <Trophy className="h-3.5 w-3.5" /> Histórico
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Navigation Tabs */}
        <Tabs defaultValue="discussion" className="w-full">
          <TabsList className="w-full justify-start bg-transparent border-b rounded-none p-0 h-auto gap-0">
            {[
              { value: "discussion", label: "Discussão", icon: MessageSquare },
              { value: "events", label: "Eventos", icon: Calendar },
              { value: "leaderboard", label: "Classificação", icon: Trophy },
              { value: "members", label: "Membros", icon: Users },
              { value: "about", label: "Acerca de", icon: Heart },
            ].map(t => (
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
                {/* Event banner */}
                <CommunityEventBanner workspaceId={workspaceId} />

                {/* Search + new topic */}
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
                  {user && (
                    <Button onClick={() => navigate("/dashboard/fastclub/forum")} className="gap-1.5 rounded-full h-11">
                      <Plus className="h-4 w-4" /> Novo
                    </Button>
                  )}
                </div>

                {/* Category pills */}
                {categories.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                    {categories.map(c => (
                      <button
                        key={c.id}
                        onClick={() => navigate("/dashboard/fastclub/forum")}
                        className="shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border bg-card hover:bg-muted/50 transition-colors text-xs font-medium"
                      >
                        <span>{c.icon || "💬"}</span>
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}

                {/* Feed */}
                {isLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-[140px] rounded-2xl" />
                    ))}
                  </div>
                ) : filteredTopics.length > 0 ? (
                  <div className="space-y-3">
                    {filteredTopics.slice(0, 15).map(topic => {
                      const cat = topic.category_id ? categoryMap.get(topic.category_id) : undefined;
                      return (
                        <SocialPostCard
                          key={topic.id}
                          topic={topic}
                          categoryName={cat?.name}
                          categoryIcon={cat?.icon || undefined}
                          onClick={() => navigate(`/dashboard/fastclub/forum/${topic.id}`)}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState />
                )}
              </div>

              {/* Sidebar */}
              <div className="hidden lg:block">
                <CommunitySidebar workspaceId={workspaceId} />
              </div>
            </div>
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events" className="mt-6">
            <EventsList workspaceId={workspaceId} events={events} />
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard" className="mt-6">
            <CommunityLeaderboard workspaceId={workspaceId} />
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members" className="mt-6">
            <CommunityMembersList />
          </TabsContent>

          {/* About Tab */}
          <TabsContent value="about" className="mt-6">
            <CommunityAbout workspaceId={workspaceId} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Admin Settings Dialog */}
      <CommunitySettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} workspaceId={workspaceId} />
    </div>
  );
}

/* ---------- Sub-components ---------- */

function EmptyState() {
  const navigate = useNavigate();
  const { user } = useAuth();
  return (
    <div className="text-center py-16 rounded-2xl border border-dashed bg-muted/20">
      <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
        <MessageSquare className="h-6 w-6 text-primary" />
      </div>
      <p className="font-semibold text-foreground mb-1">Nenhuma discussão ainda</p>
      <p className="text-sm text-muted-foreground mb-5">Sê o primeiro a iniciar uma conversa!</p>
      {user && (
        <Button className="gap-1.5 rounded-full" onClick={() => navigate("/dashboard/fastclub/forum")}>
          <Plus className="h-4 w-4" /> Criar Tópico
        </Button>
      )}
    </div>
  );
}

function EventsList({ workspaceId, events }: { workspaceId: string | undefined; events: any[] }) {
  if (events.length === 0) {
    return (
      <div className="text-center py-16 rounded-2xl border border-dashed bg-muted/20">
        <Calendar className="h-10 w-10 text-primary/40 mx-auto mb-3" />
        <p className="font-semibold">Sem eventos agendados</p>
        <p className="text-sm text-muted-foreground">Os próximos eventos aparecerão aqui.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-w-2xl">
      {events.map(event => (
        <div key={event.id} className="flex items-center gap-4 p-4 rounded-2xl border bg-card hover:bg-muted/30 transition-colors">
          <div className={cn(
            "h-12 w-12 rounded-xl flex items-center justify-center shrink-0",
            event.event_type === "live" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
          )}>
            <Calendar className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h4 className="font-semibold text-sm truncate">{event.title}</h4>
              <Badge variant={event.event_type === "live" ? "destructive" : "secondary"} className="text-[10px]">
                {event.event_type === "live" ? "🔴 Live" : "📅 Evento"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-1">{event.description}</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {new Date(event.starts_at).toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
