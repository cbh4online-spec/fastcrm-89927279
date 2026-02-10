import { useState } from "react";
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
  Zap, Gift, Flame, Heart, Award, Sparkles, Target, Shield,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";

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

  const [searchQuery, setSearchQuery] = useState("");
  const { data: categories = [] } = useForumCategories(workspaceId);
  const { data: topics = [], isLoading } = useForumTopics(workspaceId);
  const { data: loyaltyProfile } = useLoyaltyProfile(workspaceId);

  const tierInfo = loyaltyProfile ? getTierProgress(loyaltyProfile.lifetime_points) : getTierProgress(0);
  const tier = tierConfig[tierInfo.tier] || tierConfig.bronze;

  const filteredTopics = searchQuery
    ? topics.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()) || t.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : topics;

  const pinnedTopics = filteredTopics.filter(t => t.is_pinned);
  const recentTopics = filteredTopics.filter(t => !t.is_pinned).slice(0, 8);
  const hotTopics = [...filteredTopics].sort((a, b) => b.replies_count - a.replies_count).slice(0, 5);

  const totalTopics = topics.length;
  const totalPosts = topics.reduce((sum, t) => sum + t.replies_count, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/80">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, hsl(var(--primary-foreground)) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

        <div className="relative container mx-auto px-4 pt-6 pb-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
            className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 mb-4"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <motion.div {...fadeUp} className="max-w-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-2xl bg-primary-foreground/15 backdrop-blur-md flex items-center justify-center shadow-lg">
                <Zap className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-primary-foreground">FastClub</h1>
                <p className="text-primary-foreground/60 text-sm">Comunidade · Gamificação · Recompensas</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-8">
              <Button
                onClick={() => navigate("/dashboard/fastclub/forum")}
                className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 gap-2 rounded-full shadow-md"
              >
                <MessageSquare className="h-4 w-4" /> Discussões
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/dashboard/fastclub/rewards")}
                className="border-primary-foreground/25 text-primary-foreground hover:bg-primary-foreground/10 gap-2 rounded-full"
              >
                <Gift className="h-4 w-4" /> Recompensas
              </Button>
              {user && (
                <Button
                  variant="outline"
                  onClick={() => navigate("/dashboard/fastclub/forum")}
                  className="border-primary-foreground/25 text-primary-foreground hover:bg-primary-foreground/10 gap-2 rounded-full"
                >
                  <Plus className="h-4 w-4" /> Novo Tópico
                </Button>
              )}
            </div>
          </motion.div>

          {/* Stats strip */}
          <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="flex gap-6">
            {[
              { value: totalTopics, label: "Tópicos", icon: <MessageSquare className="h-3.5 w-3.5" /> },
              { value: totalPosts, label: "Respostas", icon: <TrendingUp className="h-3.5 w-3.5" /> },
              { value: categories.length, label: "Canais", icon: <Users className="h-3.5 w-3.5" /> },
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

      <main className="container mx-auto px-4 py-6 max-w-5xl space-y-6">
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

        {/* Search bar */}
        <div className="relative max-w-xl">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar tópicos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-full bg-muted/40 border-border h-11"
          />
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

        {/* Main grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Feed */}
          <div className="lg:col-span-2 space-y-6">
            {/* Pinned */}
            {pinnedTopics.length > 0 && (
              <section>
                <SectionHeader icon={<Pin className="h-3.5 w-3.5 text-primary" />} title="Fixados" />
                <div className="space-y-2">
                  {pinnedTopics.map(topic => (
                    <TopicCard key={topic.id} topic={topic} onClick={() => navigate(`/dashboard/fastclub/forum/${topic.id}`)} isPinned />
                  ))}
                </div>
              </section>
            )}

            {/* Recent */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <SectionHeader icon={<MessageSquare className="h-3.5 w-3.5 text-primary" />} title="Discussões Recentes" />
                <Button variant="ghost" size="sm" className="text-xs gap-1 text-primary hover:text-primary" onClick={() => navigate("/dashboard/fastclub/forum")}>
                  Ver todas <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>

              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-[76px] rounded-xl" />
                  ))}
                </div>
              ) : recentTopics.length > 0 ? (
                <div className="space-y-2">
                  {recentTopics.map(topic => (
                    <TopicCard key={topic.id} topic={topic} onClick={() => navigate(`/dashboard/fastclub/forum/${topic.id}`)} />
                  ))}
                </div>
              ) : (
                <EmptyState />
              )}
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Hot */}
            {hotTopics.length > 0 && (
              <SidebarCard title="Em Alta" icon={<Flame className="h-4 w-4 text-destructive" />}>
                {hotTopics.map((topic, i) => (
                  <button
                    key={topic.id}
                    onClick={() => navigate(`/dashboard/fastclub/forum/${topic.id}`)}
                    className="w-full text-left flex items-start gap-2.5 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    <span className={cn(
                      "text-xs font-bold mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0",
                      i === 0 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
                    )}>
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium line-clamp-2 leading-snug group-hover:text-primary transition-colors">{topic.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-2">
                        <span className="flex items-center gap-0.5"><MessageSquare className="h-2.5 w-2.5" />{topic.replies_count}</span>
                        <span className="flex items-center gap-0.5"><Eye className="h-2.5 w-2.5" />{topic.views_count}</span>
                      </p>
                    </div>
                  </button>
                ))}
              </SidebarCard>
            )}

            {/* Channels */}
            {categories.length > 0 && (
              <SidebarCard title="Canais" icon={<Users className="h-4 w-4 text-primary" />}>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => navigate("/dashboard/fastclub/forum")}
                    className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-colors text-sm group"
                  >
                    <span className="text-base w-6 text-center">{cat.icon || "📌"}</span>
                    <span className="font-medium group-hover:text-primary transition-colors">{cat.name}</span>
                    <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </SidebarCard>
            )}

            {/* Quick Access */}
            <SidebarCard title="Acesso Rápido" icon={<Zap className="h-4 w-4 text-primary" />}>
              <QuickLink icon={<MessageSquare className="h-4 w-4" />} label="Fórum" desc="Todas as discussões" onClick={() => navigate("/dashboard/fastclub/forum")} />
              <QuickLink icon={<Trophy className="h-4 w-4" />} label="Recompensas" desc="Trocar pontos" onClick={() => navigate("/dashboard/fastclub/rewards")} />
              <QuickLink icon={<Target className="h-4 w-4" />} label="Meu Progresso" desc="Ver nível e pontos" onClick={() => navigate("/dashboard/fastclub/rewards")} />
            </SidebarCard>
          </div>
        </div>

        {/* Value props */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-8 border-t">
          {[
            { icon: <Shield className="h-6 w-6" />, title: "Comunidade Segura", desc: "Moderação ativa" },
            { icon: <Trophy className="h-6 w-6" />, title: "Gamificação", desc: "Pontos e níveis" },
            { icon: <Gift className="h-6 w-6" />, title: "Recompensas", desc: "Prémios exclusivos" },
            { icon: <Heart className="h-6 w-6" />, title: "Networking", desc: "Conecta-te" },
          ].map(item => (
            <div key={item.title} className="flex flex-col items-center text-center gap-1.5 p-4 rounded-xl hover:bg-muted/30 transition-colors">
              <div className="text-primary">{item.icon}</div>
              <span className="text-xs font-semibold">{item.title}</span>
              <span className="text-[10px] text-muted-foreground">{item.desc}</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

/* ---------- Sub-components ---------- */

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-3">
      {icon} {title}
    </h2>
  );
}

function SidebarCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-4 space-y-2">
      <h3 className="font-semibold text-sm flex items-center gap-2 pb-2 border-b">
        {icon} {title}
      </h3>
      {children}
    </div>
  );
}

function TopicCard({ topic, onClick, isPinned }: { topic: any; onClick: () => void; isPinned?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-3.5 rounded-xl border transition-all group",
        isPinned ? "bg-primary/[0.03] border-primary/20 hover:bg-primary/[0.06]" : "bg-card hover:bg-muted/30 hover:shadow-sm"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "h-9 w-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
          isPinned ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
        )}>
          <MessageSquare className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            {topic.is_pinned && <Pin className="h-3 w-3 text-primary shrink-0" />}
            {topic.is_locked && <Lock className="h-3 w-3 text-muted-foreground shrink-0" />}
            <h3 className="font-medium text-sm truncate group-hover:text-primary transition-colors">{topic.title}</h3>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-1 mb-1.5">{topic.content}</p>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span>{formatDistanceToNow(new Date(topic.created_at), { addSuffix: true, locale: pt })}</span>
            <span className="flex items-center gap-0.5"><Eye className="h-2.5 w-2.5" />{topic.views_count}</span>
            <span className="flex items-center gap-0.5"><MessageSquare className="h-2.5 w-2.5" />{topic.replies_count}</span>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-2 shrink-0" />
      </div>
    </button>
  );
}

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

function QuickLink({ icon, label, desc, onClick }: { icon: React.ReactNode; label: string; desc: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
    >
      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors shrink-0">
        {icon}
      </div>
      <div className="text-left min-w-0">
        <p className="text-sm font-medium group-hover:text-primary transition-colors">{label}</p>
        <p className="text-[10px] text-muted-foreground">{desc}</p>
      </div>
      <ChevronRight className="h-3.5 w-3.5 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}
