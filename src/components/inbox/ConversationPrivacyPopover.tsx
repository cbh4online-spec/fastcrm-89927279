import { useMemo, useState } from "react";
import { Lock, Users, Globe2, Check, Loader2, Share2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useConversationPrivacy, ConversationVisibility } from "@/hooks/useConversationPrivacy";
import { useWorkspaceMembers } from "@/hooks/useWorkspaceMembers";
import { useAuth } from "@/contexts/AuthContext";
import { useCapabilities } from "@/hooks/useCapability";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  conversationId: string;
}

export function ConversationPrivacyPopover({ conversationId }: Props) {
  const { user } = useAuth();
  const { visibility, shares, isLoading, setVisibility, addShare, removeShare, conversation } =
    useConversationPrivacy(conversationId);
  const { data: members = [] } = useWorkspaceMembers();
  const { can, isSuperAdmin, role } = useCapabilities();
  const [query, setQuery] = useState("");
  const [quickPick, setQuickPick] = useState<string>("");
  const [confirmUser, setConfirmUser] = useState<{ id: string; name: string } | null>(null);

  // Permission to manage privacy: admin/owner/agency, super admin,
  // mailbox owner (connected_by) or assigned agent.
  const connectedBy = (conversation?.channel_metadata as any)?.connection_id
    ? (conversation as any)?.connected_by
    : null;
  const isAdminLike =
    isSuperAdmin || role === "owner" || role === "admin" || role === "agency";
  const isAssignee = !!user?.id && conversation?.assigned_to === user.id;
  const isMailboxOwner = !!user?.id && connectedBy === user.id;
  const canManage = isAdminLike || isAssignee || isMailboxOwner;

  const sharedIds = useMemo(() => new Set(shares.map((s) => s.user_id)), [shares]);

  const filteredMembers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members
      .filter((m) => m.user_id !== user?.id)
      .filter((m) => {
        if (!q) return true;
        const name = m.profile?.full_name?.toLowerCase() || "";
        const email = m.profile?.email?.toLowerCase() || "";
        return name.includes(q) || email.includes(q);
      });
  }, [members, query, user?.id]);

  const shareableMembers = useMemo(
    () => filteredMembers.filter((m) => !sharedIds.has(m.user_id)),
    [filteredMembers, sharedIds],
  );

  const v: ConversationVisibility = (visibility as ConversationVisibility) || "workspace";

  const icon = v === "workspace" ? Globe2 : v === "shared" ? Users : Lock;
  const Icon = icon;
  const label =
    v === "workspace" ? "Pública" : v === "shared" ? `Partilhada (${shares.length})` : "Privada";

  const handleQuickShareConfirm = () => {
    if (!confirmUser) return;
    if (!canManage) {
      toast.error("Sem permissão para partilhar esta conversa");
      setConfirmUser(null);
      return;
    }
    addShare.mutate(confirmUser.id, {
      onSettled: () => {
        setConfirmUser(null);
        setQuickPick("");
      },
    });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          title="Privacidade da conversa"
        >
          <Icon className={cn("w-4 h-4", v === "private" && "text-amber-600")} />
          <span className="hidden sm:inline">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="p-3 border-b">
          <div className="text-sm font-medium mb-1">Privacidade da conversa</div>
          <p className="text-xs text-muted-foreground">
            Controle quem do workspace pode ver esta conversa.
          </p>
          {!canManage && (
            <div className="mt-2 flex items-start gap-1.5 text-[11px] text-amber-700 bg-amber-50 dark:bg-amber-950/30 rounded p-2">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>Só leitura — sem permissão para alterar privacidade ou partilhar.</span>
            </div>
          )}
        </div>

        {/* Quick share */}
        <div className="p-3 border-b bg-muted/30">
          <div className="text-xs font-medium mb-2 flex items-center gap-1.5">
            <Share2 className="w-3.5 h-3.5" /> Partilha rápida
          </div>
          <div className="flex gap-2">
            <Select
              value={quickPick}
              onValueChange={setQuickPick}
              disabled={!canManage || shareableMembers.length === 0}
            >
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue
                  placeholder={
                    shareableMembers.length === 0
                      ? "Nada para partilhar"
                      : "Escolher membro..."
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {shareableMembers.slice(0, 30).map((m) => (
                  <SelectItem key={m.user_id} value={m.user_id} className="text-xs">
                    {m.profile?.full_name || m.profile?.email || m.user_id.slice(0, 8)}
                    <span className="text-muted-foreground ml-1">· {m.role}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              className="h-8 text-xs"
              disabled={!canManage || !quickPick || addShare.isPending}
              onClick={() => {
                const m = members.find((mm) => mm.user_id === quickPick);
                if (!m) return;
                setConfirmUser({
                  id: m.user_id,
                  name: m.profile?.full_name || m.profile?.email || "este membro",
                });
              }}
            >
              {addShare.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Partilhar"}
            </Button>
          </div>
        </div>

        <div className="p-2 space-y-1 border-b">
          <VisibilityOption
            active={v === "private"}
            icon={Lock}
            title="Privada"
            description="Só o dono da caixa, atribuído e admins."
            disabled={setVisibility.isPending || !canManage}
            onClick={() => setVisibility.mutate("private")}
          />
          <VisibilityOption
            active={v === "shared"}
            icon={Users}
            title="Partilhada"
            description="Só os utilizadores escolhidos abaixo."
            disabled={setVisibility.isPending || !canManage}
            onClick={() => setVisibility.mutate("shared")}
          />
          <VisibilityOption
            active={v === "workspace"}
            icon={Globe2}
            title="Pública no workspace"
            description="Todos os membros podem ver."
            disabled={setVisibility.isPending || !canManage}
            onClick={() => setVisibility.mutate("workspace")}
          />
        </div>

        <div className="p-3">
          <div className="text-xs font-medium mb-2 flex items-center justify-between">
            <span>Partilhar com</span>
            {(addShare.isPending || removeShare.isPending) && (
              <Loader2 className="w-3 h-3 animate-spin" />
            )}
          </div>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Procurar membro..."
            className="h-8 text-xs mb-2"
          />
          <ScrollArea className="h-48">
            <div className="space-y-1 pr-2">
              {isLoading ? (
                <div className="text-xs text-muted-foreground p-2">A carregar...</div>
              ) : filteredMembers.length === 0 ? (
                <div className="text-xs text-muted-foreground p-2">Sem membros.</div>
              ) : (
                filteredMembers.map((m) => {
                  const shared = sharedIds.has(m.user_id);
                  return (
                    <button
                      key={m.user_id}
                      disabled={!canManage}
                      onClick={() => {
                        if (!canManage) return;
                        if (shared) {
                          removeShare.mutate(m.user_id);
                        } else {
                          setConfirmUser({
                            id: m.user_id,
                            name: m.profile?.full_name || m.profile?.email || "este membro",
                          });
                        }
                      }}
                      className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded hover:bg-muted text-left disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-medium truncate">
                          {m.profile?.full_name || m.profile?.email || m.user_id.slice(0, 8)}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {m.profile?.email} · {m.role}
                        </div>
                      </div>
                      {shared ? (
                        <Badge variant="secondary" className="text-[10px] gap-1">
                          <Check className="w-3 h-3" /> Partilhada
                        </Badge>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">Partilhar</span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>

      <AlertDialog open={!!confirmUser} onOpenChange={(o) => !o && setConfirmUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Partilhar conversa?</AlertDialogTitle>
            <AlertDialogDescription>
              Vai dar acesso a esta conversa a <strong>{confirmUser?.name}</strong>. Pode remover
              a partilha a qualquer momento. Confirma?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={addShare.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleQuickShareConfirm} disabled={addShare.isPending}>
              {addShare.isPending ? "A partilhar..." : "Partilhar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Popover>
  );
}
                })
              )}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function VisibilityOption({
  active,
  icon: Icon,
  title,
  description,
  onClick,
  disabled,
}: {
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full flex items-start gap-2 px-2 py-2 rounded text-left hover:bg-muted disabled:opacity-50",
        active && "bg-muted"
      )}
    >
      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium flex items-center gap-1.5">
          {title}
          {active && <Check className="w-3 h-3 text-primary" />}
        </div>
        <div className="text-[10px] text-muted-foreground">{description}</div>
      </div>
    </button>
  );
}
