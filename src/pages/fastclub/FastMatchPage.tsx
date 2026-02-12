import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Users, MessageSquare, Eye, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { PremiumGate } from "@/components/fastclub/PremiumGate";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useForumCategories, useForumTopics, useCreateForumTopic } from "@/hooks/useForum";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

const CHANNEL_ICONS: Record<string, string> = {
  "fastmatch-oportunidades": "💼",
  "fastmatch-parcerias": "🤝",
  "fastmatch-servicos": "🔧",
  "fastmatch-casos": "📊",
  "fastmatch-ferramentas": "🛠️",
  "fastmatch-networking": "🌐",
};

export default function FastMatchPage() {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  const { data: allCategories = [] } = useForumCategories(workspaceId);
  const fastmatchChannels = allCategories.filter((c) => c.slug.startsWith("fastmatch-"));

  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const activeChannelId = selectedChannelId || fastmatchChannels[0]?.id || undefined;

  const { data: topics = [], isLoading } = useForumTopics(workspaceId, activeChannelId);
  const createTopic = useCreateForumTopic(workspaceId);

  const [newTopicOpen, setNewTopicOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const handleCreateTopic = () => {
    if (!title.trim() || !content.trim() || !activeChannelId) return;
    createTopic.mutate(
      { title: title.trim(), content: content.trim(), categoryId: activeChannelId },
      {
        onSuccess: () => {
          setNewTopicOpen(false);
          setTitle("");
          setContent("");
        },
      }
    );
  };

  const activeChannel = fastmatchChannels.find((c) => c.id === activeChannelId);

  return (
    <PremiumGate featureLabel="FastMatch Hub">
      <div className="min-h-screen bg-background">
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
          {/* Back */}
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
            <Button variant="ghost" size="sm" onClick={() => navigate("/club/fastclub")} className="gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
          </motion.div>

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-primary/10">
                <Users className="w-7 h-7 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-foreground">FastMatch Hub</h1>
                  <Badge variant="secondary" className="text-xs">Premium</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Rede privada de oportunidades estratégicas entre membros verificados
                </p>
              </div>
            </div>
          </motion.div>

          {/* Channel chips */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-wrap gap-2">
            {fastmatchChannels.map((channel) => {
              const isSelected = channel.id === activeChannelId;
              const icon = CHANNEL_ICONS[channel.slug] || "📌";
              return (
                <button
                  key={channel.id}
                  onClick={() => setSelectedChannelId(channel.id)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-md"
                      : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  <span>{icon}</span>
                  {channel.name}
                </button>
              );
            })}
          </motion.div>

          {/* Channel description + CTA */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {activeChannel?.description || "Selecione um canal para ver os tópicos"}
            </p>
            <Button onClick={() => setNewTopicOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Tópico
            </Button>
          </motion.div>

          {/* Topics feed */}
          <div className="space-y-3">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">A carregar tópicos...</div>
            ) : topics.length === 0 ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16 space-y-4">
                <div className="inline-flex p-4 rounded-2xl bg-muted/50">
                  <MessageSquare className="w-8 h-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Ainda sem tópicos neste canal</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Seja o primeiro a partilhar — a sua oportunidade pode ser o match perfeito para outro membro.
                  </p>
                </div>
                <Button onClick={() => setNewTopicOpen(true)} className="gap-2 mt-2">
                  <Plus className="w-4 h-4" />
                  Criar Primeiro Tópico
                </Button>
              </motion.div>
            ) : (
              topics.map((topic, i) => (
                <motion.div
                  key={topic.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card
                    className="cursor-pointer border-border/60 hover:border-primary/30 hover:shadow-md transition-all duration-200 group"
                    onClick={() => navigate(`/club/fastclub/forum/${topic.id}`)}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <Avatar className="w-10 h-10 mt-0.5">
                          <AvatarImage src={topic.author_avatar || undefined} />
                          <AvatarFallback className="text-xs bg-muted">
                            {(topic.author_name || "?").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                            {topic.title}
                          </h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">{topic.content}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                            <span className="font-medium text-foreground/70">{topic.author_name || "Anónimo"}</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDistanceToNow(new Date(topic.created_at), { addSuffix: true, locale: pt })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {topic.views_count}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" />
                              {topic.replies_count}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* New Topic Dialog */}
        <Dialog open={newTopicOpen} onOpenChange={setNewTopicOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Tópico — {activeChannel?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <Input
                placeholder="Título do tópico"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <Textarea
                placeholder="Descreva a sua oportunidade, pedido ou partilha..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNewTopicOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateTopic} disabled={!title.trim() || !content.trim() || createTopic.isPending}>
                {createTopic.isPending ? "A publicar..." : "Publicar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PremiumGate>
  );
}
