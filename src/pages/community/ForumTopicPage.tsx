import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useForumTopic, useForumPosts, useCreateForumPost } from "@/hooks/useForum";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Pin, Lock, Eye, MessageSquare, Send, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

export default function ForumTopicPage() {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  const { data: topic, isLoading: topicLoading } = useForumTopic(topicId);
  const { data: posts = [], isLoading: postsLoading } = useForumPosts(topicId);
  const createPost = useCreateForumPost(workspaceId);
  const [replyContent, setReplyContent] = useState("");

  const handleReply = async () => {
    if (!replyContent.trim() || !topicId) return;
    await createPost.mutateAsync({ topicId, content: replyContent.trim() });
    setReplyContent("");
  };

  if (topicLoading) return <div className="flex items-center justify-center min-h-screen text-muted-foreground">A carregar...</div>;
  if (!topic) return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Tópico não encontrado</div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>

        {/* Topic */}
        <div className="border rounded-xl p-5 bg-card mb-6">
          <div className="flex items-center gap-2 mb-2">
            {topic.is_pinned && <Pin className="h-4 w-4 text-primary" />}
            {topic.is_locked && <Lock className="h-4 w-4 text-muted-foreground" />}
            <h1 className="text-xl font-bold">{topic.title}</h1>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
            <span>{format(new Date(topic.created_at), "d MMM yyyy, HH:mm", { locale: pt })}</span>
            <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{topic.views_count}</span>
          </div>
          <p className="text-sm text-foreground whitespace-pre-wrap">{topic.content}</p>
        </div>

        {/* Replies */}
        <div className="space-y-3 mb-6">
          <h2 className="text-sm font-medium text-muted-foreground">
            {posts.length} {posts.length === 1 ? "resposta" : "respostas"}
          </h2>
          {posts.map(post => (
            <div key={post.id} className="border rounded-xl p-4 bg-card">
              <div className="flex items-center gap-2 mb-2">
                {post.is_best_answer && (
                  <Badge variant="default" className="text-[10px] gap-1">
                    <CheckCircle className="h-3 w-3" /> Melhor Resposta
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {format(new Date(post.created_at), "d MMM yyyy, HH:mm", { locale: pt })}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{post.content}</p>
            </div>
          ))}
        </div>

        {/* Reply form */}
        {user && !topic.is_locked && (
          <div className="border rounded-xl p-4 bg-card">
            <Textarea
              placeholder="Escrever resposta..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              rows={4}
            />
            <Button className="mt-3" onClick={handleReply} disabled={!replyContent.trim() || createPost.isPending}>
              <Send className="h-4 w-4 mr-1" />
              {createPost.isPending ? "A enviar..." : "Responder"}
            </Button>
          </div>
        )}

        {topic.is_locked && (
          <div className="text-center py-6 text-muted-foreground text-sm">
            <Lock className="h-5 w-5 mx-auto mb-2" />
            Este tópico está fechado para novas respostas.
          </div>
        )}
      </div>
    </div>
  );
}
