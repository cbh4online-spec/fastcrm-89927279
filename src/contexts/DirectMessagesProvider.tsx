import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Megaphone } from "lucide-react";

interface BroadcastModalState {
  title: string;
  body: string;
  conversationId: string;
}

interface Ctx {
  broadcastModal: BroadcastModalState | null;
  dismissBroadcast: () => void;
}

const DirectMessagesCtx = createContext<Ctx>({
  broadcastModal: null,
  dismissBroadcast: () => {},
});

export const useDirectMessagesCtx = () => useContext(DirectMessagesCtx);

export function DirectMessagesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [broadcastModal, setBroadcastModal] = useState<BroadcastModalState | null>(null);
  const seenMessageIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`dm-inbox-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "dm_messages" },
        async (payload) => {
          const msg = payload.new as any;
          if (!msg?.id || seenMessageIds.current.has(msg.id)) return;
          seenMessageIds.current.add(msg.id);

          // Skip own messages
          if (msg.sender_id === user.id) {
            qc.invalidateQueries({ queryKey: ["dm", "messages", msg.conversation_id] });
            qc.invalidateQueries({ queryKey: ["dm", "conversations"] });
            return;
          }

          // Fetch conversation + sender info
          const { data: conv } = await supabase
            .from("dm_conversations")
            .select("id, conv_type, title")
            .eq("id", msg.conversation_id)
            .maybeSingle();

          // Confirm I'm a member (RLS already filters but defensive)
          const { data: membership } = await supabase
            .from("dm_members")
            .select("id")
            .eq("conversation_id", msg.conversation_id)
            .eq("user_id", user.id)
            .maybeSingle();
          if (!membership && conv?.conv_type !== "broadcast") return;

          const { data: senderProfile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", msg.sender_id)
            .maybeSingle();
          const senderName = senderProfile?.full_name ?? "Alguém";

          // Refresh queries
          qc.invalidateQueries({ queryKey: ["dm", "messages", msg.conversation_id] });
          qc.invalidateQueries({ queryKey: ["dm", "conversations"] });
          qc.invalidateQueries({ queryKey: ["dm", "unread"] });

          if (conv?.conv_type === "broadcast") {
            setBroadcastModal({
              title: conv.title || "📢 Anúncio do administrador",
              body: msg.body,
              conversationId: conv.id,
            });
          } else {
            const preview = msg.body.length > 90 ? msg.body.slice(0, 90) + "…" : msg.body;
            const title = conv?.conv_type === "group"
              ? `${senderName} em ${conv.title || "grupo"}`
              : senderName;
            toast.message(title, {
              description: preview,
              action: {
                label: "Abrir",
                onClick: () => navigate(`/messages?c=${msg.conversation_id}`),
              },
              duration: 6000,
            });
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "dm_members", filter: `user_id=eq.${user.id}` },
        () => {
          qc.invalidateQueries({ queryKey: ["dm", "conversations"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, qc, navigate]);

  const dismissBroadcast = () => {
    if (broadcastModal) {
      // mark broadcast as read
      supabase.rpc("dm_mark_read", { _conv_id: broadcastModal.conversationId }).then(() => {
        qc.invalidateQueries({ queryKey: ["dm", "unread"] });
      });
    }
    setBroadcastModal(null);
  };

  return (
    <DirectMessagesCtx.Provider value={{ broadcastModal, dismissBroadcast }}>
      {children}
      <Dialog open={!!broadcastModal} onOpenChange={(o) => !o && dismissBroadcast()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-500/15 flex items-center justify-center">
                <Megaphone className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <DialogTitle>{broadcastModal?.title}</DialogTitle>
                <DialogDescription>Anúncio do Super Admin</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="py-2 text-sm whitespace-pre-wrap leading-relaxed">
            {broadcastModal?.body}
          </div>
          <DialogFooter>
            <Button onClick={dismissBroadcast}>Compreendi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DirectMessagesCtx.Provider>
  );
}
