import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  MessageCircle, Sparkles, Hash, Loader2, X, Pencil
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
    });
    setNewTitle("");
    setNewContent("");
    setNewCategoryId("");
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
                          placeholder="Escreve o conteúdo do tópico..."
                          value={newContent}
                          onChange={(e) => setNewContent(e.target.value)}
                          rows={6}
                        />
                        <span className="absolute bottom-2 right-2 text-[10px] text-muted-foreground">
                          {newContent.length} caracteres
                        </span>
                      </div>

                      <Button className="w-full" onClick={handleCreateTopic} disabled={createTopic.isPending}>
                        {createTopic.isPending ? "A publicar..." : "Publicar Tópico"}
                      </Button>
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

            {/* Active channel banner */}
            <AnimatePresence>
              {selectedCategoryData && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/5 border border-primary/10"
                >
                  <Hash className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">{selectedCategoryData.icon} {selectedCategoryData.name}</span>
                  {selectedCategoryData.description && (
                    <span className="text-xs text-muted-foreground ml-2">{selectedCategoryData.description}</span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Topics */}
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredTopics.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{searchQuery ? "Nenhum resultado encontrado." : "Nenhum tópico ainda. Sê o primeiro!"}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTopics.map((topic, i) => (
                  <motion.div
                    key={topic.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.3 }}
                  >
                    <SocialPostCard
                      topic={topic}
                      categoryName={topic.category_id ? categoryMap[topic.category_id]?.name : undefined}
                      categoryIcon={topic.category_id ? categoryMap[topic.category_id]?.icon ?? undefined : undefined}
                      onClick={() => navigate(`/dashboard/fastclub/forum/${topic.id}`)}
                    />
                  </motion.div>
                ))}
              </div>
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
