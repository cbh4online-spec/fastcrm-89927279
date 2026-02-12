import { useState } from "react";
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
  ArrowLeft, ArrowRight, Brain, Lightbulb, Loader2, Star, Zap,
} from "lucide-react";

const stagger = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

interface TemplateMetadata {
  tipo?: string;
  complexidade?: string;
  cta_url?: string;
  cta_label?: string;
}

const TYPES = ["Todos", "Automações", "Prompts IA", "Fluxos", "Integração"];

const complexidadeColors: Record<string, string> = {
  "Básico": "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  "Intermédio": "bg-amber-500/10 text-amber-600 border-amber-500/20",
  "Avançado": "bg-red-500/10 text-red-600 border-red-500/20",
};

export default function IAAvancadaPage() {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const [activeType, setActiveType] = useState("Todos");

  const { data: allSections = [], isLoading } = useQuery({
    queryKey: ["fastclub-ia-avancada", currentWorkspace?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fastclub_content_sections")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .eq("page_key", "ia-avancada")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!currentWorkspace,
  });

  const templates = allSections.filter((s) => !s.section_key.startsWith("dica"));
  const dicas = allSections.filter((s) => s.section_key.startsWith("dica"));

  const filteredTemplates = activeType === "Todos"
    ? templates
    : templates.filter((t) => (t.metadata as TemplateMetadata)?.tipo === activeType);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-br from-primary via-primary to-primary/80 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
        <div className="relative container mx-auto px-4 pt-6 pb-12">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard/fastclub")}
            className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 mb-4"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <motion.div {...stagger} transition={{ delay: 0.05 }}>
            <Badge className="bg-primary-foreground/15 text-primary-foreground border-0 mb-3">
              <Star className="w-3 h-3 mr-1" /> Premium
            </Badge>
            <h1 className="text-3xl md:text-4xl font-extrabold text-primary-foreground tracking-tight">
              IA e Automações Avançadas
            </h1>
            <p className="text-primary-foreground/70 mt-2 max-w-xl text-base">
              Templates, prompts e fluxos avançados para maximizar o FastCRM com IA.
            </p>
          </motion.div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
        <PremiumGate featureLabel="IA e Automações Avançadas">
          {/* Templates Section */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">Templates e Práticas</h2>

            {/* Type Filter */}
            <motion.div {...stagger} transition={{ delay: 0.1 }} className="flex flex-wrap gap-2">
              {TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveType(t)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeType === t
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {t}
                </button>
              ))}
            </motion.div>

            <div className="grid gap-4 sm:grid-cols-2">
              {filteredTemplates.map((template, i) => {
                const meta = (template.metadata as TemplateMetadata) || {};
                return (
                  <motion.div
                    key={template.id}
                    {...stagger}
                    transition={{ delay: 0.15 + i * 0.06 }}
                  >
                    <Card className="h-full transition-all hover:shadow-md hover:-translate-y-0.5">
                      <CardContent className="p-5 flex flex-col h-full">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Brain className="w-4 h-4 text-primary" />
                          </div>
                          {meta.tipo && (
                            <Badge variant="secondary" className="text-[10px]">{meta.tipo}</Badge>
                          )}
                          {meta.complexidade && (
                            <Badge variant="outline" className={`text-[10px] ${complexidadeColors[meta.complexidade] || ""}`}>
                              {meta.complexidade}
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-semibold text-foreground mb-1">{template.title}</h3>
                        <p className="text-sm text-muted-foreground flex-1">{template.content}</p>
                        {meta.cta_url && (
                          <FastCRMDeepLink
                            targetPath={meta.cta_url!}
                            size="sm"
                            variant="outline"
                            className="gap-1.5 mt-4 self-start"
                            fallbackBehavior="navigate"
                          >
                            {meta.cta_label || "Aplicar no FastCRM"}
                            <ArrowRight className="w-3.5 h-3.5" />
                          </FastCRMDeepLink>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </section>

          {/* Dicas Rápidas */}
          {dicas.length > 0 && (
            <section className="space-y-4 mt-8">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-primary" />
                Dicas Rápidas
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {dicas.map((dica, i) => (
                  <motion.div
                    key={dica.id}
                    {...stagger}
                    transition={{ delay: 0.4 + i * 0.05 }}
                  >
                    <Card className="border-primary/10 bg-primary/[0.02]">
                      <CardContent className="p-4">
                        <h4 className="font-semibold text-sm text-foreground mb-1">{dica.title}</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">{dica.content}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {/* CTA */}
          <motion.section {...stagger} transition={{ delay: 0.6 }} className="rounded-2xl border bg-muted/30 p-8 text-center space-y-4 mt-8">
            <Zap className="w-8 h-8 text-primary mx-auto" />
            <h3 className="text-lg font-bold text-foreground">Quer implementar estas práticas?</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Siga os playbooks de Implementação Guiada para configurar tudo passo a passo.
            </p>
            <Button variant="outline" onClick={() => navigate("/dashboard/fastclub/implementacao")} className="gap-2">
              Ver Implementação Guiada
              <ArrowRight className="w-4 h-4" />
            </Button>
          </motion.section>
        </PremiumGate>
      </main>
    </div>
  );
}
