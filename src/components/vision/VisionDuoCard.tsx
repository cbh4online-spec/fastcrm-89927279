import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Mail, Send, Clock, CheckCircle, Loader2, Bell, Copy, ExternalLink } from "lucide-react";
import { useVisionDuoLinks, useCreateDuoInvite } from "@/hooks/useVision";
import { useVisionDuoNotifications } from "@/hooks/useVisionDuo";
import { supabase as _supabase } from "@/integrations/supabase/client";
const supabase = _supabase as any;
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

interface Props {
  visionId: string;
}

export function VisionDuoCard({ visionId }: Props) {
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const { data: links = [], isLoading } = useVisionDuoLinks(visionId);
  const { notifications, markAsRead } = useVisionDuoNotifications(visionId);
  const { currentWorkspace } = useWorkspace();

  const handleInvite = async () => {
    if (!email.trim() || !currentWorkspace?.id) return;
    setIsSending(true);

    try {
      const { data, error } = await supabase.functions.invoke("vision-duo-invite", {
        body: { 
          action: "send_invite", 
          visionId, 
          inviteeEmail: email, 
          workspaceId: currentWorkspace.id 
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      toast.success("Convite Duo enviado!");
      if (data?.inviteUrl) {
        toast.info("Link de convite copiado!", { duration: 5000 });
        navigator.clipboard.writeText(data.inviteUrl).catch(() => {});
      }
      setEmail("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar convite");
    } finally {
      setIsSending(false);
    }
  };

  const copyInviteLink = (token: string) => {
    const url = `${window.location.origin}/vision/duo/accept/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Users className="h-5 w-5 text-violet-500" />Modo Duo
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Convida um parceiro de accountability para acompanhar a tua visão.</p>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Bell className="h-4 w-4 text-violet-500" />
              Notificações Duo
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-[10px] px-1.5 h-5">{unreadCount}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-48">
              <div className="space-y-2">
                {notifications.slice(0, 10).map((n) => (
                  <div
                    key={n.id}
                    className={`p-3 rounded-lg text-sm cursor-pointer transition-colors ${
                      n.is_read ? "bg-muted/30" : "bg-violet-500/5 border border-violet-500/20"
                    }`}
                    onClick={() => !n.is_read && markAsRead(n.id)}
                  >
                    <p className="font-medium text-foreground">{n.title}</p>
                    {n.message && <p className="text-xs text-muted-foreground mt-1">{n.message}</p>}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(n.created_at).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Existing links */}
      {links.map((link) => (
        <Card key={link.id} className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-violet-500/10 flex items-center justify-center">
                  <Mail className="h-4 w-4 text-violet-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{link.invitee_email}</p>
                  <p className="text-xs text-muted-foreground">Convidado em {new Date(link.created_at).toLocaleDateString("pt-PT")}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1 text-xs">
                  {link.status === "pending" ? <><Clock className="h-3 w-3" />Pendente</> : <><CheckCircle className="h-3 w-3 text-green-500" />Aceite</>}
                </Badge>
                {link.status === "pending" && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyInviteLink(link.invite_token)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Invite form */}
      <Card className="border-border/50">
        <CardHeader><CardTitle className="text-sm font-medium">Enviar Convite</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@parceiro.com"
              className="bg-background"
              onKeyDown={(e) => e.key === "Enter" && handleInvite()}
            />
            <Button size="sm" className="gap-1 shrink-0" onClick={handleInvite} disabled={!email.trim() || isSending}>
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Convidar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            O parceiro receberá um email com o link para aceitar o convite.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
