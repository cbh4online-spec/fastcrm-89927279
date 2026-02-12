import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useForumCategories, useForumTopics, useCreateForumTopic } from "@/hooks/useForum";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspaceMembers } from "@/hooks/useWorkspaceMembers";
import { SocialPostCard } from "@/components/community/SocialPostCard";
import { CommunitySidebar } from "@/components/community/CommunitySidebar";
import { AddChannelDialog, ChannelData } from "@/components/community/AddChannelDialog";
import { DraggableChannelList } from "@/components/community/DraggableChannelList";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, MessageSquare, Plus, Search, Clock, TrendingUp,
  MessageCircle, Sparkles, Hash, Loader2, X, Pencil, Lock, Eye,
  Users, ArrowUpRight, Zap
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type SortMode = "recent" | "popular" | "comments";

export default function ForumPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [addChannelOpen, setAddChannelOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<ChannelData | null>(null);
  const isAdmin = currentWorkspace?.role === "owner" || currentWorkspace?.role === "admin";

  const { data: categories = [] } = useForumCategories(workspaceId);
  const { data: topics = [], isLoading } = useForumTopics(workspaceId, selectedCategory);
  const { data: members = [] } = useWorkspaceMembers();
  const createTopic = useCreateForumTopic(workspaceId);

  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategoryId, setNewCategoryId] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  const selectedCategoryData = categories.find(c => c.id === selectedCategory);

  // Stats
  const totalReplies = topics.reduce((sum, t) => sum + t.replies_count, 0);

  // Filter & sort
  const filteredTopics = useMemo(() => {
    let result = [...topics];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) || t.content.toLowerCase().includes(q)
      );
    }

    switch (sortMode) {
      case "popular":
        result.sort((a, b) => b.views_count - a.views_count);
        break;
      case "comments":
        result.sort((a, b) => b.replies_count - a.replies_count);
        break;
      default:
        result.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    }

    return result;
  }, [topics, searchQuery, sortMode]);

  const handleCreateTopic = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    await createTopic.mutateAsync({
      title: newTitle.trim(),
      content: newContent.trim(),
      categoryId: newCategoryId || undefined,
      commentsEnabled,
    });
    setNewTitle("");
    setNewContent("");
    setNewCategoryId("");
    setCommentsEnabled(true);
    setAiSuggestions([]);
    setDialogOpen(false);
  };

  const handleAiSuggest = async () => {
    if (!newContent.trim() || newContent.trim().length < 10) {
      toast.error("Escreve pelo menos 10 caracteres de conteúdo primeiro.");
      return;
    }
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("community-ai-suggest-title", {
        body: { content: newContent },
      });
      if (error) throw error;
      if (data?.suggestions?.length) {
        setAiSuggestions(data.suggestions);
      } else {
        toast.info("Sem sugestões disponíveis.");
      }
    } catch {
      toast.error("Erro ao gerar sugestões de título.");
    } finally {
      setAiLoading(false);
    }
  };

  const categoryMap = useMemo(() => {
    const map: Record<string, { name: string; icon: string | null }> = {};
    categories.forEach(c => { map[c.id] = { name: c.name, icon: c.icon }; });
    return map;
  }, [categories]);

  const sortButtons: { key: SortMode; label: string; icon: React.ReactNode }[] = [
    { key: "recent", label: "Recentes", icon: <Clock className="h-3.5 w-3.5" /> },
    { key: "popular", label: "Populares", icon: <TrendingUp className="h-3.5 w-3.5" /> },
    { key: "comments", label: "Comentados", icon: <MessageCircle className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/fastclub")} className="mb-4 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> FastClub
        </Button>

        {/* Hero Header */}
        <div className="rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border p-6 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <MessageSquare className="h-6 w-6 text-primary" />
                Fórum da Comunidade
              </h1>
              <p className="text-sm text-muted-foreground mt-1">Discussões, dúvidas e partilha de conhecimento</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-xl font-bold text-foreground">{topics.length}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Tópicos</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-foreground">{totalReplies}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Respostas</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-foreground">{members.length}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Membros</p>
              </div>
            </div>
          </div>
        </div>

        {/* 2-Column Layout */}
        <div className="flex gap-6">
          {/* Main Content */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Search + Sort + New Topic */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar tópicos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 rounded-full"
                />
              </div>
              <div className="flex items-center gap-1 bg-muted/50 rounded-full p-0.5">
                {sortButtons.map(s => (
                  <Button
                    key={s.key}
                    variant={sortMode === s.key ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setSortMode(s.key)}
                    className="rounded-full gap-1 text-xs h-8 px-3"
                  >
                    {s.icon}
                    {s.label}
                  </Button>
                ))}
              </div>
              {user && (
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="rounded-full gap-1"><Plus className="h-4 w-4" /> Novo Tópico</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg">
                    <DialogHeader><DialogTitle>Criar Novo Tópico</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      {/* Author preview */}
                      <div className="flex items-center gap-3 pb-3 border-b border-border/50">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/40 text-primary font-bold text-sm">
                            {user?.email?.charAt(0).toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-semibold">{user?.email?.split("@")[0] || "Utilizador"}</p>
                          <p className="text-[11px] text-muted-foreground">A publicar na comunidade</p>
                        </div>
                      </div>

                      {/* Title with AI suggest */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="Título do tópico..."
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            className="flex-1"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={handleAiSuggest}
                            disabled={aiLoading}
                            title="Sugerir título com IA"
                          >
                            {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-primary" />}
                          </Button>
                        </div>
                        <AnimatePresence>
                          {aiSuggestions.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="flex flex-wrap gap-1.5"
                            >
                              {aiSuggestions.map((s, i) => (
                                <button
                                  key={i}
                                  onClick={() => { setNewTitle(s); setAiSuggestions([]); }}
                                  className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full hover:bg-primary/20 transition-colors"
                                >
                                  {s}
                                </button>
                              ))}
                              <button onClick={() => setAiSuggestions([])} className="text-xs text-muted-foreground px-1">
                                <X className="h-3 w-3" />
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Category select with icons */}
                      <Select value={newCategoryId} onValueChange={setNewCategoryId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Canal (opcional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(c => (
                            <SelectItem key={c.id} value={c.id}>
                              <span className="flex items-center gap-2">
                                {c.icon && <span>{c.icon}</span>}
                                {c.name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Content with char count */}
                      <div className="relative">
                        <Textarea
                          placeholder="O que está na sua mente? Partilhe uma ideia, dúvida ou experiência..."
                          value={newContent}
                          onChange={(e) => setNewContent(e.target.value)}
                          rows={6}
                        />
                        <span className="absolute bottom-2 right-2 text-[10px] text-muted-foreground">
                          {newContent.length} caracteres
                        </span>
                      </div>

                      {/* Comments toggle */}
                      <div className="flex items-center justify-between py-2 px-1">
                        <Label htmlFor="comments-toggle" className="text-sm text-muted-foreground cursor-pointer flex items-center gap-2">
                          <MessageCircle className="h-4 w-4" />
                          Ativar comentários
                        </Label>
                        <Switch
                          id="comments-toggle"
                          checked={commentsEnabled}
                          onCheckedChange={setCommentsEnabled}
                        />
                      </div>

                      {/* Footer buttons */}
                      <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleCreateTopic} disabled={createTopic.isPending || !newTitle.trim() || !newContent.trim()}>
                          {createTopic.isPending ? "A publicar..." : "Publicar Postagem"}
                        </Button>
                      </DialogFooter>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {/* Category filter */}
            <DraggableChannelList
              categories={categories}
              workspaceId={workspaceId}
              isAdmin={isAdmin}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              onEditChannel={(ch) => setEditingChannel(ch)}
              onAddChannel={() => setAddChannelOpen(true)}
              showAllButton
            />

            {/* Immersive channel banner */}
            <AnimatePresence mode="wait">
              {selectedCategoryData && (
                <motion.div
                  key={selectedCategoryData.id}
                  initial={{ opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="rounded-2xl border p-5 bg-gradient-to-r from-primary/8 via-primary/4 to-transparent"
                >
                  <div className="flex items-center gap-4">
                    <motion.span
                      initial={{ scale: 0, rotate: -20 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.1 }}
                      className="text-4xl"
                    >
                      {selectedCategoryData.icon || "💬"}
                    </motion.span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-bold text-lg text-foreground">{selectedCategoryData.name}</h2>
                        {(selectedCategoryData as any).is_private && (
                          <Badge variant="outline" className="text-[10px] gap-0.5 border-primary/30 text-primary">
                            <Lock className="h-2.5 w-2.5" /> Privado
                          </Badge>
                        )}
                        {(selectedCategoryData as any).is_read_only && (
                          <Badge variant="outline" className="text-[10px] gap-0.5">
                            <Eye className="h-2.5 w-2.5" /> Leitura
                          </Badge>
                        )}
                        {(selectedCategoryData as any).is_paid && (
                          <Badge className="text-[10px] gap-0.5 bg-amber-500/10 text-amber-600 border-amber-500/20" variant="outline">
                            <Zap className="h-2.5 w-2.5" /> Premium
                          </Badge>
                        )}
                      </div>
                      {selectedCategoryData.description && (
                        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{selectedCategoryData.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-center">
                        <p className="text-xl font-bold text-foreground">{filteredTopics.length}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">tópicos</p>
                      </div>
                      {user && (
                        <Button
                          size="sm"
                          className="rounded-full gap-1.5"
                          onClick={() => {
                            setNewCategoryId(selectedCategory || "");
                            setDialogOpen(true);
                          }}
                        >
                          <Plus className="h-3.5 w-3.5" /> Novo Tópico
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Activity bar */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="flex items-center gap-4 mt-3 pt-3 border-t border-border/40 text-xs text-muted-foreground"
                  >
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      {members.length} membros
                    </span>
                    {filteredTopics.length > 0 && (
                      <>
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          Última publicação {(() => {
                            const latest = filteredTopics[0];
                            const diff = Date.now() - new Date(latest.updated_at).getTime();
                            const mins = Math.floor(diff / 60000);
                            if (mins < 60) return `há ${mins}m`;
                            const hrs = Math.floor(mins / 60);
                            if (hrs < 24) return `há ${hrs}h`;
                            return `há ${Math.floor(hrs / 24)}d`;
                          })()}
                        </span>
                        {(() => {
                          const recentCount = filteredTopics.filter(t =>
                            Date.now() - new Date(t.created_at).getTime() < 7 * 24 * 60 * 60 * 1000
                          ).length;
                          if (recentCount >= 3) return (
                            <span className="flex items-center gap-1 text-primary font-medium">
                              <ArrowUpRight className="h-3.5 w-3.5" />
                              Em tendência
                            </span>
                          );
                          return null;
                        })()}
                      </>
                    )}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Topics */}
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredTopics.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", bounce: 0.3 }}
                className="text-center py-16"
              >
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                >
                  <MessageSquare className="h-16 w-16 mx-auto text-primary/30" />
                </motion.div>
                <h3 className="font-semibold text-foreground mt-4 text-lg">
                  {searchQuery
                    ? "Nenhum resultado encontrado."
                    : selectedCategoryData
                      ? `Sê o primeiro a publicar em ${selectedCategoryData.name}!`
                      : "Nenhum tópico ainda. Sê o primeiro!"}
                </h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  {searchQuery
                    ? "Tenta pesquisar por outros termos."
                    : "Partilha uma ideia, dúvida ou experiência com a comunidade."}
                </p>
                {!searchQuery && user && (
                  <>
                    <Button
                      className="rounded-full gap-1.5"
                      onClick={() => {
                        setNewCategoryId(selectedCategory || "");
                        setDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4" /> Criar primeiro tópico
                    </Button>
                    {selectedCategoryData && (
                      <div className="flex flex-wrap justify-center gap-2 mt-4">
                        {[
                          `Dicas sobre ${selectedCategoryData.name}`,
                          `Dúvida sobre ${selectedCategoryData.name}`,
                          `Experiência com ${selectedCategoryData.name}`,
                        ].map((suggestion, i) => (
                          <motion.button
                            key={i}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 + i * 0.1 }}
                            onClick={() => {
                              setNewTitle(suggestion);
                              setNewCategoryId(selectedCategory || "");
                              setDialogOpen(true);
                            }}
                            className="text-xs bg-muted hover:bg-primary/10 text-muted-foreground hover:text-primary px-3 py-1.5 rounded-full transition-colors"
                          >
                            💡 {suggestion}
                          </motion.button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedCategory || "all"}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-3"
                >
                  {filteredTopics.map((topic, i) => (
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
                        categoryName={topic.category_id ? categoryMap[topic.category_id]?.name : undefined}
                        categoryIcon={topic.category_id ? categoryMap[topic.category_id]?.icon ?? undefined : undefined}
                        onClick={() => navigate(`/dashboard/fastclub/forum/${topic.id}`)}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>
            )}
          </div>

          {/* Sidebar */}
          <div className="hidden lg:block w-72 shrink-0">
            <CommunitySidebar workspaceId={workspaceId} />
          </div>
        </div>
      </div>

      <AddChannelDialog open={addChannelOpen} onOpenChange={setAddChannelOpen} workspaceId={workspaceId} />
      <AddChannelDialog
        open={!!editingChannel}
        onOpenChange={(open) => { if (!open) setEditingChannel(null); }}
        workspaceId={workspaceId}
        channel={editingChannel}
      />
    </div>
  );
}
