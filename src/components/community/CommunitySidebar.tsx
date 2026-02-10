import { useCommunitySettings, useCommunityLinks } from "@/hooks/useCommunitySettings";
import { useWorkspaceMembers } from "@/hooks/useWorkspaceMembers";
import { useForumTopics } from "@/hooks/useForum";
import { Users, Globe, Lock, ExternalLink, UserPlus, MessageSquare, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface CommunitySidebarProps {
  workspaceId: string | undefined;
  onInviteClick?: () => void;
}

export function CommunitySidebar({ workspaceId, onInviteClick }: CommunitySidebarProps) {
  const { data: settings } = useCommunitySettings(workspaceId);
  const { data: links = [] } = useCommunityLinks(workspaceId);
  const { data: members = [] } = useWorkspaceMembers();
  const { data: topics = [] } = useForumTopics(workspaceId);

  const admins = members.filter(m => m.role === "owner" || m.role === "admin");
  const recentMembers = members.slice(-8);
  const totalPosts = topics.reduce((sum, t) => sum + t.replies_count, 0);

  return (
    <div className="space-y-5">
      {/* Community Info Card */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        {/* Banner */}
        <div className="h-24 bg-gradient-to-br from-primary/30 via-primary/20 to-primary/10 relative">
          {settings?.banner_url && (
            <img src={settings.banner_url} alt="" className="w-full h-full object-cover" />
          )}
        </div>

        <div className="p-4 space-y-3">
          <div>
            <h3 className="font-bold text-base">{settings?.name || "Comunidade"}</h3>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
              {settings?.is_private ? (
                <><Lock className="h-3 w-3" /> Privado</>
              ) : (
                <><Globe className="h-3 w-3" /> Público</>
              )}
            </div>
          </div>

          {settings?.description && (
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
              {settings.description}
            </p>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 py-2 border-y">
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">{members.length}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Membros</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">{topics.length + totalPosts}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Posts</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">{admins.length}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Admins</p>
            </div>
          </div>

          {/* Recent members avatars */}
          {recentMembers.length > 0 && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Membros recentes</p>
              <div className="flex -space-x-2">
                {recentMembers.map(m => (
                  <Avatar key={m.id} className="h-7 w-7 border-2 border-card">
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-semibold">
                      {(m.profile?.full_name || "U").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {members.length > 8 && (
                  <div className="h-7 w-7 rounded-full border-2 border-card bg-muted flex items-center justify-center text-[9px] text-muted-foreground font-semibold">
                    +{members.length - 8}
                  </div>
                )}
              </div>
            </div>
          )}

          <Button size="sm" className="w-full gap-1.5 rounded-full" onClick={onInviteClick}>
            <UserPlus className="h-3.5 w-3.5" /> Convidar Membros
          </Button>
        </div>
      </div>

      {/* Promotional Links */}
      {links.length > 0 && (
        <div className="rounded-2xl border bg-card p-4 space-y-2">
          <h3 className="font-semibold text-sm flex items-center gap-2 pb-2 border-b">
            <ExternalLink className="h-4 w-4 text-primary" /> Recursos
          </h3>
          {links.map(link => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-colors text-sm group"
            >
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
              <span className="font-medium group-hover:text-primary transition-colors">{link.title}</span>
            </a>
          ))}
        </div>
      )}

      {/* Admins */}
      {admins.length > 0 && (
        <div className="rounded-2xl border bg-card p-4 space-y-2">
          <h3 className="font-semibold text-sm flex items-center gap-2 pb-2 border-b">
            <Shield className="h-4 w-4 text-primary" /> Administradores
          </h3>
          {admins.map(admin => (
            <div key={admin.id} className="flex items-center gap-2.5 px-2 py-1.5">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-semibold">
                  {(admin.profile?.full_name || "A").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{admin.profile?.full_name || "Admin"}</p>
                <p className="text-[10px] text-muted-foreground capitalize">{admin.role}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
