import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePublicCommunitySettings, usePublicTopicDetail, usePublicTopicPosts } from "@/hooks/usePublicCommunity";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Clock, Lock } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

export default function PublicCommunityTopicPage() {
  const { slug, topicId } = useParams<{ slug: string; topicId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const { data: settings, isLoading: settingsLoading } = usePublicCommunitySettings(slug);
  const { data: topic, isLoading: topicLoading } = usePublicTopicDetail(topicId);
  const { data: posts = [] } = usePublicTopicPosts(topicId);

  const isLoading = settingsLoading || topicLoading || authLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!settings || !topic) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <h1 className="text-2xl font-bold">Tópico não encontrado</h1>
          <Button variant="outline" onClick={() => navigate(`/club/${slug}`)}>Voltar à comunidade</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <Button variant="ghost" size="sm" className="gap-1.5 mb-3" onClick={() => navigate(`/club/${slug}`)}>
            <ArrowLeft className="h-4 w-4" /> {settings.name}
          </Button>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {topic.is_pinned && <Badge variant="secondary" className="text-xs">Fixo</Badge>}
              {(topic as any).forum_categories && (
                <Badge variant="outline" className="text-xs">
                  {(topic as any).forum_categories.icon} {(topic as any).forum_categories.name}
                </Badge>
              )}
            </div>
            <h1 className="text-xl font-bold">{topic.title}</h1>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(new Date(topic.created_at), "d MMM yyyy 'às' HH:mm", { locale: pt })}
              </span>
              <span>{topic.replies_count || 0} respostas</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-6 space-y-4">
        {/* Original post */}
        {topic.content && (
          <div className="p-4 rounded-lg border bg-card">
            <p className="text-sm whitespace-pre-wrap">{topic.content}</p>
          </div>
        )}

        {/* Replies */}
        {posts.filter((p: any) => !p.is_first_post).map((post: any) => (
          <div key={post.id} className="p-4 rounded-lg border bg-card">
            <p className="text-sm whitespace-pre-wrap">{post.content}</p>
            <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {format(new Date(post.created_at), "d MMM yyyy 'às' HH:mm", { locale: pt })}
            </div>
          </div>
        ))}

        {/* Reply CTA */}
        {!user ? (
          <div className="p-6 rounded-lg border bg-muted/50 text-center space-y-3">
            <Lock className="h-6 w-6 mx-auto text-muted-foreground" />
            <p className="text-sm font-medium">Registe-se para responder</p>
            <p className="text-xs text-muted-foreground">Crie uma conta ou inicie sessão para participar na discussão</p>
            <div className="flex justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate(`/club/${slug}/auth?mode=login&redirect=/club/${slug}/topic/${topicId}`)}>
                Entrar
              </Button>
              <Button size="sm" onClick={() => navigate(`/club/${slug}/auth?redirect=/club/${slug}/topic/${topicId}`)}>
                Registar
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-lg border bg-card text-center text-sm text-muted-foreground">
            <p>Para responder, aceda à comunidade completa no <a href="/dashboard/fastclub" className="text-primary hover:underline">painel</a>.</p>
          </div>
        )}
      </div>
    </div>
  );
}
