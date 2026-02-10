import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useForumCategories, useForumTopics } from "@/hooks/useForum";
import { useLoyaltyProfile, getTierProgress } from "@/hooks/useLoyalty";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  MessageSquare, Trophy, Star, Crown, Users, TrendingUp,
  ArrowLeft, ChevronRight, Plus, Search, Eye, Pin, Lock,
  Zap, Gift, Flame, Heart, Award, Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";

const tierLabels: Record<string, string> = {
  bronze: "Bronze", silver: "Silver", gold: "Gold", platinum: "Platinum",
};

const tierIcons: Record<string, React.ReactNode> = {
  bronze: <Award className="h-4 w-4" />,
  silver: <Star className="h-4 w-4" />,
  gold: <Crown className="h-4 w-4" />,
  platinum: <Sparkles className="h-4 w-4" />,
};

export default function FastClubPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  const [searchQuery, setSearchQuery] = useState("");
  const { data: categories = [] } = useForumCategories(workspaceId);
  const { data: topics = [], isLoading } = useForumTopics(workspaceId);
  const { data: loyaltyProfile } = useLoyaltyProfile(workspaceId);

  const tierInfo = loyaltyProfile ? getTierProgress(loyaltyProfile.lifetime_points) : getTierProgress(0);

  const filteredTopics = searchQuery
    ? topics.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()) || t.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : topics;

  const pinnedTopics = filteredTopics.filter(t => t.is_pinned);
  const recentTopics = filteredTopics.filter(t => !t.is_pinned).slice(0, 10);
  const hotTopics = [...filteredTopics].sort((a, b) => b.replies_count - a.replies_count).slice(0, 5);

  const totalMembers = 0; // Could be fetched from a stats endpoint
  const totalTopics = topics.length;
  const totalPosts = topics.reduce((sum, t) => sum + t.replies_count, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Banner */}
      <div className="relative bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-primary-foreground overflow-hidden">
        {/* Abstract pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-40 h-40 rounded-full bg-primary-foreground/20 blur-3xl" />
          <div className="absolute bottom-0 right-20 w-60 h-60 rounded-full bg-primary-foreground/10 blur-3xl" />
        </div>

        <div className="container mx-auto px-4 py-8 relative">
          <div className="flex items-center gap-3 mb-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-primary-foreground/15 backdrop-blur-sm">
                <Zap className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight">FastClub</h1>
                <p className="text-primary-foreground/70 text-sm">A comunidade onde tudo acontece</p>
              </div>
            </div>

            <p className="text-primary-foreground/80 text-base mb-6 max-w-lg">
              Participa nas discussões, acumula pontos, sobe de nível e desbloqueia recompensas exclusivas.
            </p>

            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => navigate("/dashboard/fastclub/forum")}
                className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 gap-2 rounded-full"
              >
                <MessageSquare className="h-4 w-4" />
                Discussões
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/dashboard/fastclub/rewards")}
                className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 gap-2 rounded-full"
              >
                <Gift className="h-4 w-4" />
                Recompensas
              </Button>
              {user && (
                <Button
                  variant="outline"
                  onClick={() => navigate("/dashboard/fastclub/forum")}
                  className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 gap-2 rounded-full"
                >
                  <Plus className="h-4 w-4" />
                  Novo Tópico
                </Button>
              )}
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="flex gap-8 mt-8 pb-2"
          >
            {[
              { value: totalTopics, label: "Tópicos" },
              { value: totalPosts, label: "Respostas" },
              { value: categories.length, label: "Categorias" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-primary-foreground/60">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6 space-y-8 max-w-5xl">
        {/* My Level Card (GoKollab gamification style) */}
        {user && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="flex flex-col sm:flex-row gap-4 p-5 rounded-2xl border bg-card shadow-sm">
              <div className="flex items-center gap-4 flex-1">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  {tierIcons[tierInfo.tier] || <Award className="h-6 w-6" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-lg">Nível {tierLabels[tierInfo.tier]}</h3>
                    <Badge variant="outline" className="text-[10px]">
                      {loyaltyProfile?.balance || 0} pts
                    </Badge>
                  </div>
                  {tierInfo.next && (
                    <div className="space-y-1">
                      <Progress value={tierInfo.progress} className="h-2" />
                      <p className="text-[11px] text-muted-foreground">
                        {tierInfo.progress}% para {tierLabels[tierInfo.next]} • {loyaltyProfile?.lifetime_points || 0} pontos totais
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 sm:border-l sm:pl-4">
                <Button variant="outline" size="sm" className="gap-1 rounded-full" onClick={() => navigate("/dashboard/fastclub/rewards")}>
                  <Trophy className="h-4 w-4" />
                  Ver recompensas
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Search */}
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar tópicos, discussões..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-full bg-muted/30 border-muted-foreground/20 h-11"
          />
        </div>

        {/* Category pills (GoKollab style) */}
        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 snap-x">
            <Button
              variant="default"
              size="sm"
              className="rounded-full shrink-0 snap-start gap-1 text-xs"
              onClick={() => navigate("/dashboard/fastclub/forum")}
            >
              Todos
            </Button>
            {categories.map((c) => (
              <Button
                key={c.id}
                variant="outline"
                size="sm"
                className="rounded-full shrink-0 snap-start gap-1 text-xs"
                onClick={() => navigate("/dashboard/fastclub/forum")}
              >
                {c.icon && <span>{c.icon}</span>}
                {c.name}
              </Button>
            ))}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main feed column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Pinned / Highlighted */}
            {pinnedTopics.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Pin className="h-3.5 w-3.5" /> Fixados
                </h2>
                <div className="space-y-2">
                  {pinnedTopics.map((topic) => (
                    <TopicCard key={topic.id} topic={topic} onClick={() => navigate(`/dashboard/fastclub/forum/${topic.id}`)} />
                  ))}
                </div>
              </section>
            )}

            {/* Recent Topics */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" /> Discussões Recentes
                </h2>
                <Button variant="ghost" size="sm" className="text-xs gap-1 text-primary" onClick={() => navigate("/dashboard/fastclub/forum")}>
                  Ver todas <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>

              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 rounded-xl" />
                  ))}
                </div>
              ) : recentTopics.length > 0 ? (
                <div className="space-y-2">
                  {recentTopics.map((topic) => (
                    <TopicCard key={topic.id} topic={topic} onClick={() => navigate(`/dashboard/fastclub/forum/${topic.id}`)} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Nenhuma discussão ainda</p>
                  <p className="text-sm mb-4">Sê o primeiro a iniciar uma conversa!</p>
                  {user && (
                    <Button className="gap-1 rounded-full" onClick={() => navigate("/dashboard/fastclub/forum")}>
                      <Plus className="h-4 w-4" /> Criar Tópico
                    </Button>
                  )}
                </div>
              )}
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Hot Topics */}
            {hotTopics.length > 0 && (
              <div className="rounded-2xl border bg-card p-4 space-y-3">
                <h3 className="font-semibold flex items-center gap-2 text-sm">
                  <Flame className="h-4 w-4 text-destructive" />
                  Mais Populares
                </h3>
                <div className="space-y-2">
                  {hotTopics.map((topic, i) => (
                    <button
                      key={topic.id}
                      onClick={() => navigate(`/dashboard/fastclub/forum/${topic.id}`)}
                      className="w-full text-left flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-xs font-bold text-muted-foreground mt-0.5 w-5 shrink-0">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium line-clamp-2 leading-snug">{topic.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {topic.replies_count} respostas · {topic.views_count} views
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Categories */}
            {categories.length > 0 && (
              <div className="rounded-2xl border bg-card p-4 space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Canais
                </h3>
                <div className="space-y-1">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => navigate("/dashboard/fastclub/forum")}
                      className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors text-sm"
                    >
                      <span className="text-base">{cat.icon || "📌"}</span>
                      <span className="font-medium">{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick actions */}
            <div className="rounded-2xl border bg-card p-4 space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Acesso Rápido
              </h3>
              <div className="space-y-1">
                <QuickLink icon={<MessageSquare className="h-4 w-4" />} label="Fórum" onClick={() => navigate("/dashboard/fastclub/forum")} />
                <QuickLink icon={<Trophy className="h-4 w-4" />} label="Recompensas" onClick={() => navigate("/dashboard/fastclub/rewards")} />
                <QuickLink icon={<TrendingUp className="h-4 w-4" />} label="Leaderboard" onClick={() => navigate("/dashboard/fastclub/rewards")} />
              </div>
            </div>
          </div>
        </div>

        {/* Trust / Value props at bottom */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-8 border-t">
          {[
            { icon: <MessageSquare className="h-7 w-7 text-primary" />, title: "Discussões", desc: "Troca ideias com a comunidade" },
            { icon: <Trophy className="h-7 w-7 text-primary" />, title: "Gamificação", desc: "Ganha pontos e sobe de nível" },
            { icon: <Gift className="h-7 w-7 text-primary" />, title: "Recompensas", desc: "Troca pontos por prémios" },
            { icon: <Heart className="h-7 w-7 text-primary" />, title: "Comunidade", desc: "Liga-te a outros membros" },
          ].map((item) => (
            <div key={item.title} className="flex flex-col items-center text-center gap-2 p-4">
              {item.icon}
              <span className="text-sm font-medium">{item.title}</span>
              <span className="text-[11px] text-muted-foreground">{item.desc}</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

function TopicCard({ topic, onClick }: { topic: any; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 rounded-xl border bg-card hover:bg-muted/30 hover:shadow-sm transition-all"
    >
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
          <MessageSquare className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            {topic.is_pinned && <Pin className="h-3 w-3 text-primary" />}
            {topic.is_locked && <Lock className="h-3 w-3 text-muted-foreground" />}
            <h3 className="font-medium text-sm truncate">{topic.title}</h3>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-1">{topic.content}</p>
          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
            <span>{format(new Date(topic.created_at), "d MMM", { locale: pt })}</span>
            <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" />{topic.views_count}</span>
            <span className="flex items-center gap-0.5"><MessageSquare className="h-3 w-3" />{topic.replies_count}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

function QuickLink({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors text-sm"
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="font-medium">{label}</span>
      <ChevronRight className="h-3.5 w-3.5 ml-auto text-muted-foreground" />
    </button>
  );
}
