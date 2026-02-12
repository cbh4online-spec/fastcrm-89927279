import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, FlaskConical, Send, Beaker, Cpu, Link2, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { PremiumGate } from "@/components/fastclub/PremiumGate";
import { FastCRMDeepLink } from "@/components/fastclub/FastCRMDeepLink";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const estadoBadge: Record<string, { label: string; className: string }> = {
  Ativo: { label: "Ativo", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  "Em Breve": { label: "Em Breve", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  Concluido: { label: "Concluído", className: "bg-muted text-muted-foreground border-border" },
};

const tipoIcons: Record<string, typeof Beaker> = {
  Feature: Beaker,
  IA: Cpu,
  Integracao: Link2,
  Analytics: BarChart3,
};

export default function LaboratorioPage() {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const [feedback, setFeedback] = useState("");

  const { data: experiments = [] } = useQuery({
    queryKey: ["fastclub-laboratorio", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];
      const { data } = await supabase
        .from("fastclub_content_sections")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .eq("page_key", "laboratorio")
        .order("sort_order");
      return data || [];
    },
    enabled: !!currentWorkspace,
  });

  const handleFeedback = () => {
    if (!feedback.trim()) return;
    toast.success("Obrigado pelo teu feedback! Será analisado pela equipa.");
    setFeedback("");
  };

  return (
    <PremiumGate featureLabel="Laboratório Fast">
      <div className="space-y-8 p-6 max-w-6xl mx-auto">
        {/* Back */}
        <Button variant="ghost" size="sm" onClick={() => navigate("/club/fastclub")} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Voltar ao FastClub
        </Button>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-border/50 p-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 rounded-xl bg-primary/10">
              <FlaskConical className="w-6 h-6 text-primary" />
            </div>
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 font-semibold">Beta</Badge>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Laboratório Fast</h1>
          <p className="text-muted-foreground max-w-2xl">
            Experimenta funcionalidades em desenvolvimento antes de todos. O teu feedback molda o produto final.
          </p>
        </motion.div>

        {/* Experiments Grid */}
        <div className="grid gap-5 md:grid-cols-2">
          {experiments.map((exp, i) => {
            const meta = (exp.metadata || {}) as Record<string, string>;
            const estado = meta.estado || "Em Breve";
            const tipo = meta.tipo || "Feature";
            const TipoIcon = tipoIcons[tipo] || Beaker;
            const badge = estadoBadge[estado] || estadoBadge["Em Breve"];

            return (
              <motion.div key={exp.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                <Card className="h-full border-border/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <TipoIcon className="w-5 h-5 text-primary/70" />
                        <h3 className="font-semibold text-foreground">{exp.title}</h3>
                      </div>
                      <Badge variant="outline" className={badge.className}>{badge.label}</Badge>
                    </div>
                    {exp.content && <p className="text-sm text-muted-foreground leading-relaxed">{exp.content}</p>}
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">{tipo}</Badge>
                      {estado === "Ativo" && (
                        <FastCRMDeepLink targetPath="/dashboard" variant="outline" size="sm" fallbackBehavior="navigate">
                          Experimentar
                        </FastCRMDeepLink>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {experiments.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 space-y-3">
            <FlaskConical className="w-12 h-12 text-muted-foreground/40 mx-auto" />
            <p className="text-muted-foreground">Nenhum experimento disponível de momento.</p>
            <p className="text-sm text-muted-foreground/60">Volta em breve — estamos a preparar coisas incríveis.</p>
          </motion.div>
        )}

        {/* Feedback Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-2xl border border-border/50 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Dá-nos o teu Feedback</h2>
          <p className="text-sm text-muted-foreground">O que achas dos experimentos? Que funcionalidades gostarias de ver no FastCRM?</p>
          <Textarea
            placeholder="Escreve aqui o teu feedback..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={4}
            className="resize-none"
          />
          <Button onClick={handleFeedback} disabled={!feedback.trim()} className="gap-2">
            <Send className="w-4 h-4" /> Enviar Feedback
          </Button>
        </motion.div>
      </div>
    </PremiumGate>
  );
}
