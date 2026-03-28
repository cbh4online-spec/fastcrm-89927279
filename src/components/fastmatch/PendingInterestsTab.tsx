import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Clock, Check, X, ArrowRight, Send } from "lucide-react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFastMatchInterests } from "@/hooks/useFastMatchInterests";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";

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

  const getProfileInfo = (profileId: string): ProfileInfo => {
    return profiles.find(p => p.id === profileId) || { id: profileId, company_name: "Empresa", industry: null };
  };

  const handleReject = async (interestId: string) => {
    setRejectingId(interestId);
    try {
      await supabase
        .from("fastmatch_interests")
        .update({ status: "rejected" })
        .eq("id", interestId);
      queryClient.invalidateQueries({ queryKey: ["fastmatch-interests"] });
      toast.success("Interesse recusado.");
    } catch {
      toast.error("Erro ao recusar interesse.");
    } finally {
      setRejectingId(null);
    }
  };

  const received = interests?.received?.filter(i => i.status === "pending") || [];
  const sent = interests?.sent || [];

  return (
    <div className="space-y-6">
      <Tabs defaultValue="received" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="received" className="gap-1.5 text-sm">
            Recebidos
            {received.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-[10px] flex items-center justify-center rounded-full">
                {received.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="sent" className="gap-1.5 text-sm">
            <Send className="w-3.5 h-3.5" />
            Enviados ({sent.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="received" className="space-y-3">
          {received.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <Clock className="w-8 h-8 mx-auto text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Nenhum interesse recebido pendente.</p>
            </div>
          ) : (
            received.map((interest, i) => {
              const profile = getProfileInfo(interest.from_profile_id);
              return (
                <motion.div
                  key={interest.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="border-primary/20 bg-primary/[0.02]">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Building2 className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{profile.company_name}</p>
                            {profile.industry && (
                              <p className="text-xs text-muted-foreground">{profile.industry}</p>
                            )}
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {formatDistanceToNow(new Date(interest.created_at), { addSuffix: true, locale: pt })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
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
                            className="gap-1.5 text-xs"
                            onClick={() => onAccept(interest.id, interest.from_profile_id)}
                            disabled={isAccepting}
                          >
                            <Check className="w-3.5 h-3.5" />
                            Aceitar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="sent" className="space-y-3">
          {sent.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <Send className="w-8 h-8 mx-auto text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Nenhum interesse enviado.</p>
            </div>
          ) : (
            sent.map((interest, i) => {
              const profile = getProfileInfo(interest.to_profile_id);
              const statusLabel = interest.status === "mutual" ? "Mútuo" : interest.status === "pending" ? "Pendente" : interest.status;
              const statusColor = interest.status === "mutual"
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                : "bg-amber-500/10 text-amber-600 border-amber-500/20";

              return (
                <motion.div
                  key={interest.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="border-border/60">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-muted">
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{profile.company_name}</p>
                            {profile.industry && (
                              <p className="text-xs text-muted-foreground">{profile.industry}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={`${statusColor} text-[10px]`}>{statusLabel}</Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {formatDistanceToNow(new Date(interest.created_at), { addSuffix: true, locale: pt })}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
