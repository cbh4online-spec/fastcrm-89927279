import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface OnlineUser {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  online_at: string;
}

export function useOnlinePresence() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!user || !currentWorkspace?.id) return;

    const ch = supabase.channel(`presence:workspace:${currentWorkspace.id}`, {
      config: { presence: { key: user.id } },
    });

    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState<OnlineUser>();
      const users: OnlineUser[] = [];
      const seen = new Set<string>();

      for (const presences of Object.values(state)) {
        for (const p of presences) {
          if (!seen.has(p.user_id)) {
            seen.add(p.user_id);
            users.push({
              user_id: p.user_id,
              full_name: p.full_name,
              avatar_url: p.avatar_url,
              online_at: p.online_at,
            });
          }
        }
      }

      setOnlineUsers(users);
    });

    ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await ch.track({
          user_id: user.id,
          full_name: user.user_metadata?.full_name || null,
          avatar_url: user.user_metadata?.avatar_url || null,
          online_at: new Date().toISOString(),
        });
      }
    });

    setChannel(ch);

    return () => {
      ch.untrack();
      supabase.removeChannel(ch);
    };
  }, [user?.id, currentWorkspace?.id]);

  return {
    onlineUsers,
    onlineCount: onlineUsers.length,
  };
}
