import { useState } from "react";
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
import { ArrowLeft, MessageSquare, Pin, Lock, Eye, Plus } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

export default function ForumPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const { data: categories = [] } = useForumCategories(workspaceId);
  const { data: topics = [], isLoading } = useForumTopics(workspaceId, selectedCategory);
  const createTopic = useCreateForumTopic(workspaceId);

  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategoryId, setNewCategoryId] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleCreateTopic = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    await createTopic.mutateAsync({
      title: newTitle.trim(),
      content: newContent.trim(),
      categoryId: newCategoryId || undefined,
    });
    setNewTitle("");
    setNewContent("");
    setDialogOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/fastclub")} className="mb-4 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> FastClub
        </Button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-primary" />
              Fórum
            </h1>
            <p className="text-sm text-muted-foreground">Discussões da comunidade</p>
          </div>
          {user && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-1" /> Novo Tópico</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Criar Tópico</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Input placeholder="Título" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
                  <Select value={newCategoryId} onValueChange={setNewCategoryId}>
                    <SelectTrigger><SelectValue placeholder="Categoria (opcional)" /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Textarea placeholder="Conteúdo..." value={newContent} onChange={(e) => setNewContent(e.target.value)} rows={5} />
                  <Button className="w-full" onClick={handleCreateTopic} disabled={createTopic.isPending}>
                    {createTopic.isPending ? "A publicar..." : "Publicar"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Category filter */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          <Button variant={!selectedCategory ? "default" : "outline"} size="sm" onClick={() => setSelectedCategory(undefined)}>
            Todos
          </Button>
          {categories.map(c => (
            <Button key={c.id} variant={selectedCategory === c.id ? "default" : "outline"} size="sm" onClick={() => setSelectedCategory(c.id)}>
              {c.name}
            </Button>
          ))}
        </div>

        {/* Topics list */}
        {isLoading ? (
          <p className="text-center py-12 text-muted-foreground">A carregar...</p>
        ) : topics.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum tópico ainda. Sê o primeiro!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {topics.map(topic => (
              <button
                key={topic.id}
                onClick={() => navigate(`/dashboard/fastclub/forum/${topic.id}`)}
                className="w-full text-left p-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {topic.is_pinned && <Pin className="h-3.5 w-3.5 text-primary" />}
                      {topic.is_locked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                      <h3 className="font-medium truncate">{topic.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">{topic.content}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span>{format(new Date(topic.created_at), "d MMM yyyy", { locale: pt })}</span>
                      <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{topic.views_count}</span>
                      <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{topic.replies_count}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
