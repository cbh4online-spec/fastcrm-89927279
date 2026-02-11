import { useWorkspaceMembers } from "@/hooks/useWorkspaceMembers";
import { useCommunityMembers, useResendCommunityInvite } from "@/hooks/useCommunityMembers";
import { useCommunitySettings } from "@/hooks/useCommunitySettings";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Shield, Crown, Clock, CheckCircle2, RotateCcw, Loader2, FileText, EyeOff } from "lucide-react";
import { useState } from "react";
import { MemberAnswersDialog } from "./MemberAnswersDialog";

export function CommunityMembersList() {
  const { currentWorkspace } = useWorkspace();
  const { data: workspaceMembers = [], isLoading: loadingWs } = useWorkspaceMembers();
  const { data: communityMembers = [], isLoading: loadingCm } = useCommunityMembers();
  const { data: communitySettings } = useCommunitySettings(currentWorkspace?.id);
  const resendInvite = useResendCommunityInvite();
  const [search, setSearch] = useState("");
  const [answersOpen, setAnswersOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<{ id: string; name: string } | null>(null);

  const isLoading = loadingWs || loadingCm;

  // Build unified list: workspace members + community-only members
  const wsEmails = new Set(workspaceMembers.map(m => m.profile?.email?.toLowerCase()).filter(Boolean));

  const communityOnly = communityMembers.filter(
    cm => !wsEmails.has(cm.email.toLowerCase())
  );

  // Filter
  const filterFn = (name: string, email: string) => {
    if (!search) return true;
    const lower = search.toLowerCase();
    return name.toLowerCase().includes(lower) || email.toLowerCase().includes(lower);
  };

  const filteredWs = workspaceMembers.filter(m =>
    filterFn(m.profile?.full_name || "", m.profile?.email || "")
  );

  const filteredCm = communityOnly.filter(cm =>
    filterFn(cm.name, cm.email)
  );

  const roleIcon = (role: string) => {
    if (role === "owner") return <Crown className="h-3 w-3 text-yellow-500" />;
    if (role === "admin") return <Shield className="h-3 w-3 text-primary" />;
    return null;
  };

  const statusBadge = (status: string) => {
    if (status === "active") {
      return (
        <Badge variant="outline" className="text-[10px] gap-1 text-green-600 border-green-200 bg-green-50">
          <CheckCircle2 className="h-2.5 w-2.5" /> Activo
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-[10px] gap-1 text-amber-600 border-amber-200 bg-amber-50">
        <Clock className="h-2.5 w-2.5" /> Pendente
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar membros..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 rounded-full bg-muted/40 h-10"
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">A carregar membros...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Workspace members */}
          {filteredWs.map(m => (
            <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-muted/30 transition-colors">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {(m.profile?.full_name || "U").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium truncate">{m.profile?.full_name || "Utilizador"}</p>
                  {roleIcon(m.role)}
                </div>
                <p className="text-[11px] text-muted-foreground truncate">{m.profile?.email || ""}</p>
              </div>
              <Badge variant="outline" className="text-[10px] capitalize shrink-0">{m.role}</Badge>
            </div>
          ))}

          {/* Community-only members (invited) */}
          {filteredCm.map(cm => {
            const isPrivate = (cm as any).is_profile_public === false;
            const forceAnon = (communitySettings as any)?.force_anonymous === true;
            const showAnon = forceAnon || isPrivate;
            const displayName = showAnon ? ((cm as any).display_alias || "Membro Anónimo") : cm.name;
            const displayEmail = (cm as any).show_email === false ? "••••@••••" : cm.email;
            const showAv = (cm as any).show_avatar !== false && !forceAnon;

            return (
            <div key={cm.id} className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-muted/30 transition-colors">
              <Avatar className="h-10 w-10">
                <AvatarFallback className={showAnon ? "bg-muted text-muted-foreground font-semibold" : "bg-muted text-muted-foreground font-semibold"}>
                  {showAnon ? "?" : displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className={`text-sm font-medium truncate ${showAnon ? "italic text-muted-foreground" : ""}`}>{displayName}</p>
                  {isPrivate && !forceAnon && (
                    <EyeOff className="h-3 w-3 text-muted-foreground shrink-0" />
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground truncate">{displayEmail}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {statusBadge(cm.status)}
                {cm.status === "pending" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => resendInvite.mutate(cm.id)}
                    disabled={resendInvite.isPending}
                    title="Reenviar convite"
                  >
                    {resendInvite.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="h-3.5 w-3.5" />
                    )}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => { setSelectedMember({ id: cm.id, name: cm.name }); setAnswersOpen(true); }}
                  title="Ver respostas"
                >
                  <FileText className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {!isLoading && filteredWs.length === 0 && filteredCm.length === 0 && (
        <p className="text-sm text-muted-foreground py-8 text-center">Nenhum membro encontrado</p>
      )}

      <MemberAnswersDialog
        open={answersOpen}
        onOpenChange={setAnswersOpen}
        memberId={selectedMember?.id}
        memberName={selectedMember?.name || ""}
      />
    </div>
  );
}
