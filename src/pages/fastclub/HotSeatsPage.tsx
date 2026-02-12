import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Mic, Calendar, Clock, Users, CheckCircle2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PremiumGate } from "@/components/fastclub/PremiumGate";
import { FastCRMDeepLink } from "@/components/fastclub/FastCRMDeepLink";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

export default function HotSeatsPage() {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const [historyOpen, setHistoryOpen] = useState(false);

  const { data: sessions = [] } = useQuery({
    queryKey: ["fastclub-hotseats", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];
      const { data } = await supabase
        .from("fastclub_content_sections")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .eq("page_key", "hot-seats")
        .order("sort_order");
      return data || [];
    },
    enabled: !!currentWorkspace,
  });

  const futureSessions = sessions.filter((s) => {
    const meta = (s.metadata || {}) as Record<string, unknown>;
    return meta.tipo === "futuro";
  });

  const pastSessions = sessions.filter((s) => {
    const meta = (s.metadata || {}) as Record<string, unknown>;
    return meta.tipo === "passado";
  });

  return (
    <PremiumGate featureLabel="Hot Seats">
      <div className="space-y-8 p-6 max-w-6xl mx-auto">
        {/* Back */}
        <Button variant="ghost" size="sm" onClick={() => navigate("/club/fastclub")} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Voltar ao FastClub
        </Button>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-border/50 p-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 rounded-xl bg-primary/10">
              <Mic className="w-6 h-6 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Hot Seats</h1>
          <p className="text-muted-foreground max-w-2xl">
            Sessões de mentoria ao vivo onde apresentas o teu caso e recebes feedback direto do grupo e dos especialistas.
          </p>
        </motion.div>

        {/* Upcoming Sessions */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Próximas Sessões</h2>
          {futureSessions.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 space-y-3">
              <Calendar className="w-10 h-10 text-muted-foreground/40 mx-auto" />
              <p className="text-muted-foreground">Nenhuma sessão agendada de momento.</p>
              <p className="text-sm text-muted-foreground/60">Novas sessões serão anunciadas em breve.</p>
            </motion.div>
          )}
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {futureSessions.map((session, i) => {
              const meta = (session.metadata || {}) as Record<string, unknown>;
              const dataStr = meta.data as string;
              const hora = meta.hora as string;
              const tema = meta.tema as string;
              const vagas = meta.vagas as number;
              let formattedDate = dataStr;
              try {
                formattedDate = format(new Date(dataStr), "d 'de' MMMM, yyyy", { locale: pt });
              } catch {}

              return (
                <motion.div key={session.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                  <Card className="h-full border-border/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>{formattedDate}</span>
                        {hora && (
                          <>
                            <Clock className="w-4 h-4 ml-2" />
                            <span>{hora}</span>
                          </>
                        )}
                      </div>
                      <h3 className="font-semibold text-foreground">{session.title}</h3>
                      {tema && <p className="text-sm text-muted-foreground">{tema}</p>}
                      <div className="flex items-center justify-between">
                        {vagas != null && (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1">
                            <Users className="w-3 h-3" /> {vagas} vagas
                          </Badge>
                        )}
                        <FastCRMDeepLink targetPath="/dashboard" variant="default" size="sm" fallbackBehavior="navigate">
                          Inscrever-me
                        </FastCRMDeepLink>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Past Sessions */}
        {pastSessions.length > 0 && (
          <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground">
                <ChevronDown className={`w-4 h-4 transition-transform ${historyOpen ? "rotate-180" : ""}`} />
                Sessões Anteriores ({pastSessions.length})
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 mt-4">
              {pastSessions.map((session, i) => {
                const meta = (session.metadata || {}) as Record<string, unknown>;
                const dataStr = meta.data as string;
                const takeaways = (meta.takeaways || []) as string[];
                let formattedDate = dataStr;
                try {
                  formattedDate = format(new Date(dataStr), "d 'de' MMMM, yyyy", { locale: pt });
                } catch {}

                return (
                  <motion.div key={session.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Card className="border-border/40">
                      <CardContent className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-foreground">{session.title}</h3>
                          <span className="text-xs text-muted-foreground">{formattedDate}</span>
                        </div>
                        {takeaways.length > 0 && (
                          <ul className="space-y-1.5">
                            {takeaways.map((t, j) => (
                              <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                                {t}
                              </li>
                            ))}
                          </ul>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </PremiumGate>
  );
}
