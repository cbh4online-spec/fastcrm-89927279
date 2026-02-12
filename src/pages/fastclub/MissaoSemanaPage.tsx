import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { FastCRMDeepLink } from "@/components/fastclub/FastCRMDeepLink";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { PremiumGate } from "@/components/fastclub/PremiumGate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowLeft, ArrowRight, CalendarClock, CheckSquare, Loader2, Star, Target,
} from "lucide-react";

const stagger = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

interface MissaoMetadata {
  objetivo?: string;
  cta_url?: string;
  cta_label?: string;
  passos?: string[];
}

export default function MissaoSemanaPage() {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();

  const { data: missoes = [], isLoading } = useQuery({
    queryKey: ["fastclub-missao-semana", currentWorkspace?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fastclub_content_sections")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .eq("page_key", "missao-semana")
        .order("sort_order", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!currentWorkspace,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentMissao = missoes[0];
  const previousMissoes = missoes.slice(1);
  const currentMeta = (currentMissao?.metadata as MissaoMetadata) || {};

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary via-primary to-primary/80 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
        <div className="relative container mx-auto px-4 pt-6 pb-12">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/club/fastclub")}
            className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 mb-4"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <motion.div {...stagger} transition={{ delay: 0.05 }}>
            <Badge className="bg-primary-foreground/15 text-primary-foreground border-0 mb-3">
              <Star className="w-3 h-3 mr-1" /> Premium
            </Badge>
            <h1 className="text-3xl md:text-4xl font-extrabold text-primary-foreground tracking-tight">
              Missão da Semana
            </h1>
            <p className="text-primary-foreground/70 mt-2 max-w-xl text-base">
              Missões semanais orientadas à execução real no FastCRM.
            </p>
          </motion.div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 max-w-3xl space-y-8">
        <PremiumGate featureLabel="Missão da Semana">
          {/* Current Mission */}
          {currentMissao && (
            <motion.div {...stagger} transition={{ delay: 0.1 }}>
              <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent shadow-lg">
                <CardContent className="p-8 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-primary/10">
                      <CalendarClock className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <Badge variant="secondary" className="text-xs mb-1">Missão Atual</Badge>
                      <h2 className="text-xl font-bold text-foreground">{currentMissao.title}</h2>
                    </div>
                  </div>

                  <p className="text-muted-foreground leading-relaxed">{currentMissao.content}</p>

                  {currentMeta.objetivo && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                      <Target className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Objetivo</span>
                        <p className="text-sm font-medium text-foreground">{currentMeta.objetivo}</p>
                      </div>
                    </div>
                  )}

                  {/* Checklist */}
                  {currentMeta.passos && currentMeta.passos.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Passos</span>
                      <div className="space-y-2">
                        {currentMeta.passos.map((passo, i) => (
                          <motion.div
                            key={i}
                            {...stagger}
                            transition={{ delay: 0.2 + i * 0.05 }}
                            className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow"
                          >
                            <CheckSquare className="w-4 h-4 text-primary/60 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-foreground">{passo}</span>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {currentMeta.cta_url && (
                    <FastCRMDeepLink
                      targetPath={currentMeta.cta_url!}
                      className="gap-2 w-full sm:w-auto"
                      size="lg"
                      fallbackBehavior="navigate"
                    >
                      {currentMeta.cta_label || "Executar no FastCRM"}
                      <ArrowRight className="w-4 h-4" />
                    </FastCRMDeepLink>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Previous Missions */}
          {previousMissoes.length > 0 && (
            <motion.div {...stagger} transition={{ delay: 0.3 }} className="mt-8">
              <h3 className="text-lg font-semibold text-foreground mb-4">Missões Anteriores</h3>
              <Accordion type="multiple">
                {previousMissoes.map((missao, i) => {
                  const meta = (missao.metadata as MissaoMetadata) || {};
                  return (
                    <AccordionItem key={missao.id} value={missao.id}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3 text-left">
                          <CalendarClock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium">{missao.title}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pl-7">
                          <p className="text-sm text-muted-foreground">{missao.content}</p>
                          {meta.passos && (
                            <div className="space-y-1.5">
                              {meta.passos.map((p, j) => (
                                <div key={j} className="flex items-start gap-2 text-sm">
                                  <CheckSquare className="w-3.5 h-3.5 text-muted-foreground/50 mt-0.5 flex-shrink-0" />
                                  <span className="text-muted-foreground">{p}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {meta.cta_url && (
                            <FastCRMDeepLink
                              targetPath={meta.cta_url!}
                              size="sm"
                              variant="outline"
                              className="gap-1.5"
                              fallbackBehavior="navigate"
                            >
                              {meta.cta_label || "Executar no FastCRM"}
                              <ArrowRight className="w-3.5 h-3.5" />
                            </FastCRMDeepLink>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </motion.div>
          )}
        </PremiumGate>
      </main>
    </div>
  );
}
