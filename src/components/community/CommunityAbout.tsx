import { useCommunitySettings, useCommunityLinks } from "@/hooks/useCommunitySettings";
import { useWorkspaceMembers } from "@/hooks/useWorkspaceMembers";
import { Globe, Lock, ExternalLink, Users, Shield, Calendar } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface CommunityAboutProps {
  workspaceId: string | undefined;
}

export function CommunityAbout({ workspaceId }: CommunityAboutProps) {
  const { data: settings } = useCommunitySettings(workspaceId);
  const { data: links = [] } = useCommunityLinks(workspaceId);
  const { data: members = [] } = useWorkspaceMembers();

  const admins = members.filter(m => m.role === "owner" || m.role === "admin");

  return (
    <div className="max-w-2xl space-y-6">
      {/* Description */}
      <div className="rounded-2xl border bg-card p-6">
        <h3 className="font-bold text-lg mb-2">{settings?.name || "Comunidade"}</h3>
        <Badge variant="outline" className="mb-3 gap-1">
          {settings?.is_private ? <><Lock className="h-3 w-3" /> Privado</> : <><Globe className="h-3 w-3" /> Público</>}
        </Badge>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {settings?.description || "Bem-vindo à nossa comunidade! Aqui podes participar em discussões, ganhar pontos e trocar por recompensas exclusivas."}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-4 text-center">
          <Users className="h-5 w-5 text-primary mx-auto mb-1" />
          <p className="text-2xl font-bold">{members.length}</p>
          <p className="text-xs text-muted-foreground">Membros</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <Shield className="h-5 w-5 text-primary mx-auto mb-1" />
          <p className="text-2xl font-bold">{admins.length}</p>
          <p className="text-xs text-muted-foreground">Administradores</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <Calendar className="h-5 w-5 text-primary mx-auto mb-1" />
          <p className="text-2xl font-bold">{settings?.created_at ? new Date(settings.created_at).getFullYear() : "—"}</p>
          <p className="text-xs text-muted-foreground">Fundada em</p>
        </div>
      </div>

      {/* Links */}
      {links.length > 0 && (
        <div className="rounded-2xl border bg-card p-5">
          <h4 className="font-semibold text-sm mb-3">Recursos & Links</h4>
          <div className="space-y-2">
            {links.map(link => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
              >
                <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                <span className="text-sm font-medium group-hover:text-primary transition-colors">{link.title}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Admins */}
      {admins.length > 0 && (
        <div className="rounded-2xl border bg-card p-5">
          <h4 className="font-semibold text-sm mb-3">Equipa de Administração</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {admins.map(a => (
              <div key={a.id} className="flex items-center gap-3 p-2 rounded-lg">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {(a.profile?.full_name || "A").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{a.profile?.full_name || "Admin"}</p>
                  <p className="text-[11px] text-muted-foreground capitalize">{a.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
