import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

/** Shows a non-blocking corner toast when a new lead notification arrives. */
export function NewLeadToastListener() {
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const wsId = currentWorkspace?.id;

  useEffect(() => {
    if (!wsId) return;
    const channel = supabase
      .channel(`new-lead-toast-${wsId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "admin_notifications", filter: `workspace_id=eq.${wsId}` },
        (payload) => {
          const n = payload.new as { type?: string; title?: string; message?: string | null; metadata?: { lead_id?: string | null } };
          if (n.type !== "lead") return;
          const leadId = n.metadata?.lead_id;
          toast(n.title || "Nova lead", {
            description: n.message ?? undefined,
            duration: 8000,
            action: {
              label: "Abrir lead",
              onClick: () => navigate(leadId ? `/dashboard/leads/${leadId}` : "/dashboard/leads"),
            },
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [wsId, navigate]);

  return null;
}
