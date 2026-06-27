import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IXCard } from "@/components/entity/ix/IXCard";
import { Building2, Clock, Check, X, Send } from "lucide-react";
import { motion } from "framer-motion";
import { useFastMatchInterests } from "@/hooks/useFastMatchInterests";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ProfileInfo {
  id: string;
  company_name: string | null;
  industry: string | null;
}

interface PendingInterestsTabProps {
  profiles: ProfileInfo[];
  onAccept: (interestId: string, fromProfileId: string) => Promise<void>;
  isAccepting?: boolean;
}

export function PendingInterestsTab({ profiles, onAccept, isAccepting }: PendingInterestsTabProps) {
  const { data: interests } = useFastMatchInterests();
  const queryClient = useQueryClient();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [view, setView] = useState<"received" | "sent">("received");

  const getProfileInfo = (profileId: string): ProfileInfo =>
    profiles.find((p) => p.id === profileId) || { id: profileId, company_name: "Empresa", industry: null };

  const handleReject = async (interestId: string) => {
    setRejectingId(interestId);
    try {
      await supabase.from("fastmatch_interests").update({ status: "rejected" }).eq("id", interestId);
      queryClient.invalidateQueries({ queryKey: ["fastmatch-interests"] });
      toast.success("Interesse recusado.");
    } catch {
      toast.error("Erro ao recusar interesse.");
    } finally {
      setRejectingId(null);
    }
  };

  const received = interests?.received?.filter((i) => i.status === "pending") || [];
  const sent = interests?.sent || [];

  const subTabs: { id: "received" | "sent"; label: string; count: number; icon?: typeof Send }[] = [
    { id: "received", label: "Recebidos", count: received.length },
    { id: "sent", label: "Enviados", count: sent.length, icon: Send },
  ];

  return (
    <div className="space-y-4">
      {/* Sub-tabs em pílula */}
      <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1">
        {subTabs.map((t) => {
          const active = view === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setView(t.id)}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium rounded-full transition-colors",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.icon && <t.icon className="h-3.5 w-3.5" />}
              {t.label}
              {t.count > 0 && (
                <span
                  className={cn(
                    "h-5 min-w-5 px-1.5 inline-flex items-center justify-center rounded-full text-[11px] font-semibold",
                    active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-foreground"
                  )}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {view === "received" && (
        <>
          {received.length === 0 ? (
            <IXCard>
              <div className="flex flex-col items-center justify-center text-center py-12">
                <Clock className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <h3 className="text-sm font-medium mb-1">Nenhum interesse recebido pendente</h3>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Quando outros perfis demonstrarem interesse no teu, vão aparecer aqui para aceitar ou recusar.
                </p>
              </div>
            </IXCard>
          ) : (
            <div className="space-y-2">
              {received.map((interest, i) => {
                const profile = getProfileInfo(interest.from_profile_id);
                return (
                  <motion.div
                    key={interest.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="group flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3 hover:border-primary/40 hover:shadow-sm transition-all"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{profile.company_name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {profile.industry && <span className="truncate">{profile.industry}</span>}
                        {profile.industry && <span>•</span>}
                        <span className="tabular-nums">
                          {formatDistanceToNow(new Date(interest.created_at), { addSuffix: true, locale: pt })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                        onClick={() => handleReject(interest.id)}
                        disabled={rejectingId === interest.id}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        className="gap-1.5 text-xs rounded-full"
                        onClick={() => onAccept(interest.id, interest.from_profile_id)}
                        disabled={isAccepting}
                      >
                        <Check className="w-3.5 h-3.5" />
                        Aceitar
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </>
      )}

      {view === "sent" && (
        <>
          {sent.length === 0 ? (
            <IXCard>
              <div className="flex flex-col items-center justify-center text-center py-12">
                <Send className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <h3 className="text-sm font-medium mb-1">Nenhum interesse enviado</h3>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Demonstra interesse em perfis na aba "Descobrir" para iniciar conexões.
                </p>
              </div>
            </IXCard>
          ) : (
            <div className="space-y-2">
              {sent.map((interest, i) => {
                const profile = getProfileInfo(interest.to_profile_id);
                const statusLabel =
                  interest.status === "mutual" ? "Mútuo" : interest.status === "pending" ? "Pendente" : interest.status;
                const statusColor =
                  interest.status === "mutual"
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-600 border-amber-500/20";

                return (
                  <motion.div
                    key={interest.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{profile.company_name}</p>
                      {profile.industry && (
                        <p className="text-xs text-muted-foreground truncate">{profile.industry}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge className={`${statusColor} text-[10px]`}>{statusLabel}</Badge>
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {formatDistanceToNow(new Date(interest.created_at), { addSuffix: true, locale: pt })}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
