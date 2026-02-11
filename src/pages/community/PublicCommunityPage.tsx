import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  usePublicCommunitySettings,
  usePublicCommunityTopics,
  usePublicCommunityCategories,
  usePublicCommunityEvents,
} from "@/hooks/usePublicCommunity";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageSquare, Users, Calendar, Lock, ArrowRight, Clock } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

export default function PublicCommunityPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const { data: settings, isLoading } = usePublicCommunitySettings(slug);
  const workspaceId = settings?.workspace_id;
  const { data: topics = [] } = usePublicCommunityTopics(workspaceId);
  const { data: categories = [] } = usePublicCommunityCategories(workspaceId);
  const { data: events = [] } = usePublicCommunityEvents(workspaceId);

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <h1 className="text-2xl font-bold">Comunidade não encontrada</h1>
          <p className="text-muted-foreground">Esta comunidade não existe ou não está publicada.</p>
          <Button variant="outline" onClick={() => navigate("/")}>Voltar ao início</Button>
        </div>
      </div>
    );
  }

  const primaryColor = (settings as any).primary_color || "#6366f1";

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative">
        {(settings as any).banner_url ? (
          <div className="h-56 md:h-72 w-full overflow-hidden">
            <img src={(settings as any).banner_url} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
        ) : (
          <div className="h-56 md:h-72 w-full" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)` }} />
        )}

        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
          <div className="max-w-4xl mx-auto flex items-end gap-4">
            {(settings as any).logo_url && (
              <img
                src={(settings as any).logo_url}
                alt={settings.name}
                className="h-16 w-16 md:h-20 md:w-20 rounded-xl border-4 border-background shadow-lg object-cover"
              />
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold text-white drop-shadow-md">{settings.name}</h1>
              {settings.description && (
                <p className="text-white/80 text-sm md:text-base mt-1 line-clamp-2">{settings.description}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <MessageSquare className="h-4 w-4" />
            <span>{topics.length} tópicos</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            <span>{categories.length} canais</span>
          </div>
          {events.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>{events.length} eventos</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Channels */}
        {categories.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4">Canais</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {categories.map((cat: any) => (
                <div key={cat.id} className="flex items-center gap-2 p-3 rounded-lg border bg-card">
                  <span className="text-lg">{cat.icon || "💬"}</span>
                  <span className="text-sm font-medium truncate">{cat.name}</span>
                  {cat.is_paid && <Lock className="h-3 w-3 text-muted-foreground ml-auto" />}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recent topics */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Tópicos Recentes</h2>
          {topics.length === 0 ? (
            <p className="text-muted-foreground text-sm">Ainda não há tópicos nesta comunidade.</p>
          ) : (
            <div className="space-y-2">
              {topics.map((topic: any) => (
                <div
                  key={topic.id}
                  className="flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => {
                    if (user) {
                      navigate(`/club/${slug}/topic/${topic.id}`);
                    } else {
                      navigate(`/club/${slug}/auth?redirect=/club/${slug}/topic/${topic.id}`);
                    }
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {topic.is_pinned && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Fixo</Badge>}
                      {topic.forum_categories && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {topic.forum_categories.icon} {topic.forum_categories.name}
                        </Badge>
                      )}
                    </div>
                    <h3 className="text-sm font-medium truncate">{topic.title}</h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(topic.created_at), "d MMM yyyy", { locale: pt })}
                      </span>
                      <span>{topic.replies_count || 0} respostas</span>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Events */}
        {events.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4">Próximos Eventos</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {events.map((event: any) => (
                <div key={event.id} className="p-4 rounded-lg border bg-card">
                  <h3 className="font-medium text-sm">{event.title}</h3>
                  {event.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{event.description}</p>
                  )}
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(event.event_date), "d MMM yyyy 'às' HH:mm", { locale: pt })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* CTA Banner for unauthenticated users */}
      {!user && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t shadow-lg z-50">
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-sm">Junte-se a {settings.name}</p>
              <p className="text-xs text-muted-foreground">Registe-se para participar nas discussões</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate(`/club/${slug}/auth?mode=login`)}>
                Entrar
              </Button>
              <Button size="sm" onClick={() => navigate(`/club/${slug}/auth`)}>
                Registar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
