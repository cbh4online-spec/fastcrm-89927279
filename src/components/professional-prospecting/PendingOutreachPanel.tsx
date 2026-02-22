import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Clock, Instagram, ChevronDown, ChevronUp, Copy } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface OutreachItem {
  id: string;
  workspace_id: string;
  profile_id: string;
  step_index: number;
  status: string;
  scheduled_for: string;
  message: string | null;
  message_plain: string | null;
  tone: string | null;
  profile_name?: string;
  profile_url?: string;
}

export function PendingOutreachPanel() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(true);

  const { data: pendingItems = [], isLoading } = useQuery({
    queryKey: ["pending-outreach", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from("prospecting_outreach_queue")
        .select("*, professional_prospecting_profiles(profile_name, profile_url)")
        .eq("workspace_id", currentWorkspace.id)
        .eq("status", "ready")
        .order("scheduled_for", { ascending: true });

      if (error) throw error;
      return (data || []).map((item: any) => ({
        ...item,
        profile_name: item.professional_prospecting_profiles?.profile_name,
        profile_url: item.professional_prospecting_profiles?.profile_url,
      })) as OutreachItem[];
    },
    enabled: !!currentWorkspace?.id,
    refetchInterval: 60000,
  });

  const sendMutation = useMutation({
    mutationFn: async (item: OutreachItem) => {
      // Copy message
      if (item.message) {
        await navigator.clipboard.writeText(item.message);
      }
      // Open Instagram
      if (item.profile_url) {
        window.open(item.profile_url, "_blank");
      }
      // Mark as sent
      await supabase
        .from("prospecting_outreach_queue")
        .update({ status: "sent" } as any)
        .eq("id", item.id);
      // Update outreach_step on profile
      await supabase
        .from("professional_prospecting_profiles")
        .update({ outreach_step: item.step_index + 1 } as any)
        .eq("id", item.profile_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-outreach"] });
      queryClient.invalidateQueries({ queryKey: ["prospecting-profiles"] });
      toast.success("Mensagem copiada! A abrir perfil...");
    },
    onError: () => {
      toast.error("Erro ao processar envio");
    },
  });

  // Also show scheduled items count
  const { data: scheduledCount = 0 } = useQuery({
    queryKey: ["scheduled-outreach-count", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return 0;
      const { count, error } = await supabase
        .from("prospecting_outreach_queue")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", currentWorkspace.id)
        .eq("status", "scheduled");
      if (error) return 0;
      return count || 0;
    },
    enabled: !!currentWorkspace?.id,
  });

  if (pendingItems.length === 0 && scheduledCount === 0) return null;

  const stepLabel = (idx: number) => (idx === 1 ? "Follow-up" : "Fecho");
  const stepEmoji = (idx: number) => (idx === 1 ? "💡" : "🎯");

  return (
    <Card className="border-primary/20 bg-primary/5">
      <div
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-primary" />
          <div>
            <p className="font-semibold text-sm">
              {pendingItems.length > 0
                ? `${pendingItems.length} follow-up${pendingItems.length > 1 ? "s" : ""} pronto${pendingItems.length > 1 ? "s" : ""} para enviar`
                : `${scheduledCount} follow-up${scheduledCount > 1 ? "s" : ""} agendado${scheduledCount > 1 ? "s" : ""}`}
            </p>
            {scheduledCount > 0 && pendingItems.length > 0 && (
              <p className="text-xs text-muted-foreground">
                + {scheduledCount} agendado{scheduledCount > 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pendingItems.length > 0 && (
            <Badge variant="default" className="text-xs">
              {pendingItems.length} pendente{pendingItems.length > 1 ? "s" : ""}
            </Badge>
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {expanded && pendingItems.length > 0 && (
        <CardContent className="pt-0 space-y-3">
          {pendingItems.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 p-3 rounded-lg bg-background border"
            >
              <div className="p-1.5 rounded-full bg-pink-500/10 mt-0.5">
                <Instagram className="w-3.5 h-3.5 text-pink-500" />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">
                    {item.profile_name || "Perfil"}
                  </span>
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {stepEmoji(item.step_index)} {stepLabel(item.step_index)}
                  </Badge>
                </div>
                {item.message && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {item.message}
                  </p>
                )}
              </div>
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  sendMutation.mutate(item);
                }}
                disabled={sendMutation.isPending}
                className="gap-1 shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                Enviar agora
              </Button>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}
