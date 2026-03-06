import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export function useUnreadInboxCount() {
  const { currentWorkspace } = useWorkspace();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!currentWorkspace?.id) return;

    const fetchCount = async () => {
      const { count: c } = await supabase
        .from("conversations")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", currentWorkspace.id)
        .eq("status", "open")
        .gt("unread_count", 0);
      setCount(c ?? 0);
    };

    fetchCount();

    const channel = supabase
      .channel(`unread-count-${currentWorkspace.id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "conversations",
        filter: `workspace_id=eq.${currentWorkspace.id}`,
      }, () => {
        fetchCount();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentWorkspace?.id]);

  return count;
}
