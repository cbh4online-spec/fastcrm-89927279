import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useForumCategories, useForumTopics } from "@/hooks/useForum";
import { useLoyaltyProfile, getTierProgress } from "@/hooks/useLoyalty";
import { useCommunityEvents, useCreateCommunityEvent } from "@/hooks/useCommunityEvents";
import { useCommunitySettings } from "@/hooks/useCommunitySettings";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  MessageSquare, Trophy, Star, Crown, Users, TrendingUp,
  ArrowLeft, Plus, Search, Gift, Zap, Heart, Award, Sparkles,
  Settings, Calendar, Hash, Video, Link as LinkIcon, UserPlus, Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { SocialPostCard } from "@/components/community/SocialPostCard";
import { CommunitySidebar } from "@/components/community/CommunitySidebar";
import { CommunityEventBanner } from "@/components/community/CommunityEventBanner";
import { CommunityMembersList } from "@/components/community/CommunityMembersList";
import { CommunityLeaderboard } from "@/components/community/CommunityLeaderboard";
import { CommunityAbout } from "@/components/community/CommunityAbout";
import { CommunitySettingsDialog } from "@/components/community/CommunitySettingsDialog";
import { AddChannelDialog, ChannelData } from "@/components/community/AddChannelDialog";
import { InviteToCommunityDialog } from "@/components/community/InviteToCommunityDialog";
import { DraggableChannelList } from "@/components/community/DraggableChannelList";

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

const allTabs = [
  { value: "discussion", key: "discussao", label: "Discussão", icon: MessageSquare },
  { value: "events", key: "eventos", label: "Eventos", icon: Calendar },
  { value: "leaderboard", key: "classificacao", label: "Classificação", icon: Trophy },
  { value: "members", key: "membros", label: "Membros", icon: Users },
  { value: "about", key: "acerca", label: "Acerca de", icon: Heart },
];

export default function FastClubPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const isAdmin = currentWorkspace?.role === "owner" || currentWorkspace?.role === "admin";

  const [searchQuery, setSearchQuery] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addChannelOpen, setAddChannelOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<ChannelData | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  const { data: categories = [] } = useForumCategories(workspaceId);
  const { data: topics = [], isLoading } = useForumTopics(workspaceId);
  const { data: loyaltyProfile } = useLoyaltyProfile(workspaceId);
  const { data: events = [] } = useCommunityEvents(workspaceId);
  const { data: communitySettings } = useCommunitySettings(workspaceId);

  const visibleTabs = (communitySettings as any)?.visible_tabs || {};
  const filteredTabs = allTabs.filter(t => visibleTabs[t.key] !== false);

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
        {communitySettings?.banner_url && (
          <img src={communitySettings.banner_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-primary/60" />
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
            <div className="flex items-center gap-1">
              {isAdmin && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAddChannelOpen(true)}
                    className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 gap-1.5 text-xs"
                  >
                    <Hash className="h-4 w-4" /> Canal
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSettingsOpen(true)}
                    className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
                  >
                    <Settings className="h-5 w-5" />
                  </Button>
                </>
              )}
            </div>
          </div>

          <motion.div {...fadeUp} className="max-w-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-12 w-12 rounded-2xl bg-primary-foreground/15 backdrop-blur-md flex items-center justify-center shadow-lg">
                {communitySettings?.logo_url ? (
                  <img src={communitySettings.logo_url} alt="" className="h-10 w-10 rounded-xl object-cover" />
                ) : (
                  <Zap className="h-6 w-6 text-primary-foreground" />
                )}
              </div>
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-primary-foreground">
                  {communitySettings?.name || "FastClub"}
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
                  {user && (
                    <Button onClick={() => navigate("/dashboard/fastclub/forum")} className="gap-1.5 rounded-full h-11">
                      <Plus className="h-4 w-4" /> Novo
                    </Button>
                  )}
                </div>

                {(categories.length > 0 || isAdmin) && (
                  <DraggableChannelList
                    categories={categories}
                    workspaceId={workspaceId}
                    isAdmin={isAdmin}
                    onClickChannel={() => navigate("/dashboard/fastclub/forum")}
                    onEditChannel={(ch) => setEditingChannel(ch)}
                    onAddChannel={() => setAddChannelOpen(true)}
                  />
                )}

                {isLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-[140px] rounded-2xl" />
                    ))}
                  </div>
                ) : filteredTopics.length > 0 ? (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={searchQuery}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-3"
                    >
                      {filteredTopics.slice(0, 15).map((topic, i) => {
                        const cat = topic.category_id ? categoryMap.get(topic.category_id) : undefined;
                        return (
                          <motion.div
                            key={topic.id}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05, type: "spring", stiffness: 300, damping: 25 }}
                            whileHover={{ scale: 1.008, transition: { duration: 0.2 } }}
                            className="transition-shadow hover:shadow-md rounded-2xl"
                          >
                            <SocialPostCard
                              topic={topic}
                              categoryName={cat?.name}
                              categoryIcon={cat?.icon || undefined}
                              onClick={() => navigate(`/dashboard/fastclub/forum/${topic.id}`)}
                            />
                          </motion.div>
                        );
                      })}
                    </motion.div>
                  </AnimatePresence>
                ) : (
                  <EmptyState />
                )}
              </div>

              <div className="hidden lg:block">
                <CommunitySidebar workspaceId={workspaceId} onInviteClick={() => setInviteOpen(true)} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="events" className="mt-6">
            <EventsList workspaceId={workspaceId} events={events} isAdmin={!!isAdmin} />
          </TabsContent>

          <TabsContent value="leaderboard" className="mt-6">
            <CommunityLeaderboard workspaceId={workspaceId} />
          </TabsContent>

          <TabsContent value="members" className="mt-6">
            <div className="space-y-4">
              {isAdmin && (
                <div className="flex justify-end">
                  <Button onClick={() => setInviteOpen(true)} className="gap-1.5 rounded-full" size="sm">
                    <UserPlus className="h-4 w-4" /> Convidar
                  </Button>
                </div>
              )}
              <CommunityMembersList />
            </div>
          </TabsContent>

          <TabsContent value="about" className="mt-6">
            <CommunityAbout workspaceId={workspaceId} />
          </TabsContent>
        </Tabs>
      </main>

      <CommunitySettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} workspaceId={workspaceId} />
      <AddChannelDialog open={addChannelOpen} onOpenChange={setAddChannelOpen} workspaceId={workspaceId} />
      <AddChannelDialog
        open={!!editingChannel}
        onOpenChange={(open) => { if (!open) setEditingChannel(null); }}
        workspaceId={workspaceId}
        channel={editingChannel}
      />
      <InviteToCommunityDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  );
}

/* ---------- Sub-components ---------- */

function EmptyState() {
  const navigate = useNavigate();
  const { user } = useAuth();
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", bounce: 0.3 }}
      className="text-center py-16 rounded-2xl border border-dashed bg-muted/20"
    >
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
        className="mx-auto mb-4"
      >
        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <MessageSquare className="h-7 w-7 text-primary/40" />
        </div>
      </motion.div>
      <p className="font-semibold text-foreground mb-1">Nenhuma discussão ainda</p>
      <p className="text-sm text-muted-foreground mb-5">Sê o primeiro a iniciar uma conversa!</p>
      {user && (
        <Button className="gap-1.5 rounded-full" onClick={() => navigate("/dashboard/fastclub/forum")}>
          <Plus className="h-4 w-4" /> Criar Tópico
        </Button>
      )}
    </motion.div>
  );
}

function EventsList({ workspaceId, events, isAdmin }: { workspaceId: string | undefined; events: any[]; isAdmin: boolean }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState("evento");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [link, setLink] = useState("");
  const createEvent = useCreateCommunityEvent(workspaceId);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setEventType("evento");
    setStartsAt("");
    setEndsAt("");
    setLink("");
  };

  const handleSubmit = () => {
    if (!title.trim()) { toast.error("O título é obrigatório"); return; }
    if (!startsAt) { toast.error("A data de início é obrigatória"); return; }

    createEvent.mutate(
      {
        title: title.trim(),
        description: description.trim() || null,
        event_type: eventType,
        starts_at: new Date(startsAt).toISOString(),
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        link: link.trim() || null,
      },
      {
        onSuccess: () => {
          resetForm();
          setCreateOpen(false);
        },
      }
    );
  };

  return (
    <div className="space-y-4 max-w-2xl">
      {isAdmin && (
        <div className="flex justify-end">
          <Button onClick={() => setCreateOpen(true)} className="gap-1.5 rounded-full">
            <Plus className="h-4 w-4" /> Criar Evento
          </Button>
        </div>
      )}

      {events.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", bounce: 0.3 }}
          className="text-center py-16 rounded-2xl border border-dashed bg-muted/20"
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            className="mx-auto mb-3"
          >
            <Calendar className="h-12 w-12 text-primary/30 mx-auto" />
          </motion.div>
          <p className="font-semibold">Sem eventos agendados</p>
          <p className="text-sm text-muted-foreground">Os próximos eventos aparecerão aqui.</p>
        </motion.div>
      ) : (
        events.map((event, i) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, type: "spring", stiffness: 300, damping: 25 }}
            whileHover={{ scale: 1.008, transition: { duration: 0.2 } }}
            className="flex items-center gap-4 p-4 rounded-2xl border bg-card hover:bg-muted/30 transition-all hover:shadow-md"
          >
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
                {new Date(event.starts_at).toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
            {event.link && (
              <a href={event.link} target="_blank" rel="noopener noreferrer" className="shrink-0">
                <Button variant="outline" size="sm" className="gap-1.5 rounded-full text-xs">
                  <LinkIcon className="h-3 w-3" /> Entrar
                </Button>
              </a>
            )}
          </motion.div>
        ))
      )}

      {/* Create Event Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Evento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="evt-title">Título *</Label>
              <Input id="evt-title" placeholder="Nome do evento" value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="evt-desc">Descrição</Label>
              <Textarea id="evt-desc" placeholder="Descrição do evento..." value={description} onChange={e => setDescription(e.target.value)} rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="evento">📅 Evento</SelectItem>
                  <SelectItem value="live">🔴 Live</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="evt-start">Início *</Label>
                <Input id="evt-start" type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="evt-end">Fim</Label>
                <Input id="evt-end" type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="evt-link">Link externo</Label>
              <Input id="evt-link" placeholder="https://meet.google.com/..." value={link} onChange={e => setLink(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createEvent.isPending}>
              {createEvent.isPending ? "A criar..." : "Criar Evento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
