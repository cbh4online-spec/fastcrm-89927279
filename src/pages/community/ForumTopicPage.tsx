import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useForumTopic, useForumPosts, useCreateForumPost, useForumReactionCounts, useUserReaction } from "@/hooks/useForum";
import { useToggleForumReaction } from "@/hooks/useForumReactions";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Pin, Lock, Eye, MessageSquare, Send, CheckCircle, Heart, Lightbulb, Share2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const REACTION_TYPES = [
  { type: "like", icon: Heart, label: "Gosto" },
  { type: "insightful", icon: Lightbulb, label: "Útil" },
];

function ReactionBar({ topicId, postId, workspaceId }: { topicId?: string; postId?: string; workspaceId?: string }) {
  const { user } = useAuth();
  const { data: counts = {} } = useForumReactionCounts(topicId, postId);
  const { data: userReaction } = useUserReaction(topicId, postId);
  const toggle = useToggleForumReaction(workspaceId);

  return (
    <div className="flex items-center gap-1">
      {REACTION_TYPES.map(r => {
        const isActive = userReaction?.reaction_type === r.type;
        const count = counts[r.type] || 0;
        return (
          <button
            key={r.type}
            onClick={() => {
              if (!user) { toast.error("Inicia sessão para reagir."); return; }
              toggle.mutate({ topicId, postId, reactionType: r.type });
            }}
            className={cn(
              "flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full transition-colors",
              isActive
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:text-primary hover:bg-primary/5"
            )}
          >
            <r.icon className={cn("h-3.5 w-3.5", isActive && "fill-primary")} />
            {count > 0 && <span>{count}</span>}
          </button>
        );
      })}
    </div>
  );
}

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

  const handleShare = () => {
    const url = `${window.location.origin}/dashboard/fastclub/forum/${topicId}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  if (topicLoading) return <div className="flex items-center justify-center min-h-screen text-muted-foreground">A carregar...</div>;
  if (!topic) return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Tópico não encontrado</div>;

  const topicAuthorName = topic.author_name || "Membro";
  const topicInitial = topicAuthorName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>

        {/* Topic */}
        <div className="border rounded-xl p-5 bg-card mb-6">
          {/* Author header */}
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="h-11 w-11">
              {topic.author_avatar && <AvatarImage src={topic.author_avatar} alt={topicAuthorName} />}
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/40 text-primary font-bold">
                {topicInitial}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{topicAuthorName}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(topic.created_at), { addSuffix: true, locale: pt })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {topic.is_pinned && <Pin className="h-4 w-4 text-primary" />}
              {topic.is_locked && <Lock className="h-4 w-4 text-muted-foreground" />}
            </div>
          </div>

          <h1 className="text-xl font-bold mb-2">{topic.title}</h1>

          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
            <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{topic.views_count}</span>
            <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{topic.replies_count}</span>
          </div>

          <p className="text-sm text-foreground whitespace-pre-wrap mb-4">{topic.content}</p>

          {/* Reactions + share */}
          <div className="flex items-center gap-2 pt-3 border-t border-border/50">
            <ReactionBar topicId={topicId} workspaceId={workspaceId} />
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors px-2.5 py-1.5 rounded-full hover:bg-primary/5 ml-auto"
            >
              <Share2 className="h-3.5 w-3.5" /> Partilhar
            </button>
          </div>
        </div>

        {/* Replies */}
        <div className="space-y-3 mb-6">
          <h2 className="text-sm font-medium text-muted-foreground">
            {posts.length} {posts.length === 1 ? "resposta" : "respostas"}
          </h2>
          {posts.map(post => {
            const postAuthor = post.author_name || "Membro";
            const postInitial = postAuthor.charAt(0).toUpperCase();
            return (
              <div key={post.id} className={cn(
                "border rounded-xl p-4 bg-card",
                post.is_best_answer && "border-primary/30 bg-primary/[0.02]"
              )}>
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="h-8 w-8">
                    {post.author_avatar && <AvatarImage src={post.author_avatar} alt={postAuthor} />}
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/40 text-primary font-bold text-xs">
                      {postInitial}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{postAuthor}</span>
                      {post.is_best_answer && (
                        <Badge variant="default" className="text-[10px] gap-1">
                          <CheckCircle className="h-3 w-3" /> Melhor Resposta
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: pt })}
                    </p>
                  </div>
                </div>
                <p className="text-sm whitespace-pre-wrap mb-3">{post.content}</p>
                <ReactionBar postId={post.id} topicId={topicId} workspaceId={workspaceId} />
              </div>
            );
          })}
        </div>

        {/* Reply form */}
        {user && !topic.is_locked && topic.comments_enabled !== false && (
          <div className="border rounded-xl p-4 bg-card">
            <div className="flex items-start gap-3">
              <Avatar className="h-8 w-8 mt-1">
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/40 text-primary font-bold text-xs">
                  {user.email?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Textarea
                  placeholder="Escrever resposta..."
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
                <Button className="mt-3" size="sm" onClick={handleReply} disabled={!replyContent.trim() || createPost.isPending}>
                  <Send className="h-4 w-4 mr-1" />
                  {createPost.isPending ? "A enviar..." : "Responder"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {topic.is_locked && (
          <div className="text-center py-6 text-muted-foreground text-sm">
            <Lock className="h-5 w-5 mx-auto mb-2" />
            Este tópico está fechado para novas respostas.
          </div>
        )}

        {topic.comments_enabled === false && !topic.is_locked && (
          <div className="text-center py-6 text-muted-foreground text-sm">
            <MessageSquare className="h-5 w-5 mx-auto mb-2" />
            Os comentários estão desativados neste tópico.
          </div>
        )}
      </div>
    </div>
  );
}
