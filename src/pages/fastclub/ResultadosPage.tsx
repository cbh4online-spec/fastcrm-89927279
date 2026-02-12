import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, ArrowRight, BarChart3, Loader2, Quote, TrendingUp, Users, Zap,
} from "lucide-react";

const stagger = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const metricIcons: Record<string, typeof BarChart3> = {
  members_active: Users,
  weekly_opportunities: TrendingUp,
  avg_response_rate: BarChart3,
  avg_conversion_rate: Zap,
};

const testimonials = [
  {
    quote: "O FastCRM transformou a forma como gerimos oportunidades. Em 3 meses duplicámos a taxa de conversão.",
    name: "Ricardo Mendes",
    role: "Diretor Comercial",
    company: "Luso Digital",
  },
  {
    quote: "A automação do pipeline libertou 12 horas por semana à equipa de vendas.",
    name: "Ana Ferreira",
    role: "CEO",
    company: "Growth Partners",
  },
  {
    quote: "O Método PARE deu-nos um framework claro para escalar sem caos operacional.",
    name: "Pedro Santos",
    role: "Head of Sales",
    company: "TechBridge",
  },
  {
    quote: "A rede FastMatch gerou 8 parcerias estratégicas no primeiro trimestre.",
    name: "Sofia Costa",
    role: "Business Development",
    company: "Iberian Ventures",
  },
];

export default function ResultadosPage() {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();

  // Fetch aggregated metrics
  const { data: metrics = [], isLoading: loadingMetrics } = useQuery({
    queryKey: ["fastclub-crm-aggregates", currentWorkspace?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fastclub_crm_aggregates")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!currentWorkspace,
  });

  // Fetch success cases
  const { data: cases = [], isLoading: loadingCases } = useQuery({
    queryKey: ["fastclub-resultados-cases", currentWorkspace?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fastclub_content_sections")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .eq("page_key", "resultados")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!currentWorkspace,
  });

  if (loadingMetrics || loadingCases) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
              Prova Social
            </Badge>
            <h1 className="text-3xl md:text-4xl font-extrabold text-primary-foreground tracking-tight">
              Resultados do Ecossistema
            </h1>
            <p className="text-primary-foreground/70 mt-2 max-w-xl text-base">
              Métricas reais, casos de sucesso e testemunhos de quem já utiliza o FastCRM.
            </p>
          </motion.div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 max-w-5xl space-y-12">
        {/* Section 1: Aggregated Metrics */}
        <section className="space-y-5">
          <motion.h2 {...stagger} transition={{ delay: 0.1 }} className="text-xl font-bold text-foreground">
            Métricas do Ecossistema
          </motion.h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics.map((m, i) => {
              const val = m.metric_value as Record<string, string | number> | null;
              const Icon = metricIcons[m.metric_key] || BarChart3;
              return (
                <motion.div key={m.id} {...stagger} transition={{ delay: 0.15 + i * 0.06 }}>
                  <Card className="border-border/50 hover:shadow-md transition-shadow">
                    <CardContent className="p-6 space-y-3">
                      <div className="inline-flex p-2.5 rounded-xl bg-primary/10">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-extrabold text-foreground">
                          {val?.value ?? "—"}
                        </p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {val?.label ?? m.metric_key}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          <motion.div {...stagger} transition={{ delay: 0.4 }} className="flex justify-center">
            <Button size="sm" variant="outline" onClick={() => navigate("/club/fastclub/demos")} className="gap-1.5">
              Ver FastCRM em Ação <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </motion.div>
        </section>

        {/* Section 2: Success Cases */}
        {cases.length > 0 && (
          <section className="space-y-5">
            <motion.h2 {...stagger} transition={{ delay: 0.45 }} className="text-xl font-bold text-foreground">
              Casos de Sucesso
            </motion.h2>
            <div className="grid md:grid-cols-2 gap-4">
              {cases.map((c, i) => {
                const meta = c.metadata as Record<string, string> | null;
                return (
                  <motion.div key={c.id} {...stagger} transition={{ delay: 0.5 + i * 0.06 }}>
                    <Card className="border-border/50 hover:shadow-md transition-shadow h-full bg-gradient-to-br from-background to-muted/20">
                      <CardContent className="p-6 space-y-4">
                        <div className="flex items-center gap-2">
                          {meta?.empresa && (
                            <Badge variant="secondary" className="text-xs">{meta.empresa}</Badge>
                          )}
                          {meta?.setor && (
                            <Badge variant="outline" className="text-xs">{meta.setor}</Badge>
                          )}
                        </div>
                        <h4 className="font-bold text-foreground">{c.title}</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                          {c.content}
                        </p>
                        {meta?.metrica && (
                          <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                            <TrendingUp className="w-4 h-4 text-primary" />
                            <span className="text-sm font-semibold text-primary">{meta.metrica}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}

        {/* Section 3: Testimonials */}
        <section className="space-y-5">
          <motion.h2 {...stagger} transition={{ delay: 0.7 }} className="text-xl font-bold text-foreground">
            O Que Dizem os Membros
          </motion.h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {testimonials.map((t, i) => (
              <motion.div key={t.name} {...stagger} transition={{ delay: 0.75 + i * 0.06 }}>
                <Card className="border-border/50 hover:shadow-md transition-shadow h-full">
                  <CardContent className="p-6 space-y-4">
                    <Quote className="w-6 h-6 text-primary/30" />
                    <p className="text-sm text-foreground leading-relaxed italic">
                      "{t.quote}"
                    </p>
                    <div className="pt-2 border-t border-border/50">
                      <p className="text-sm font-semibold text-foreground">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role} · {t.company}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <motion.section {...stagger} transition={{ delay: 1 }} className="rounded-2xl border bg-gradient-to-br from-primary/5 to-muted/30 p-8 text-center space-y-4">
          <Zap className="w-8 h-8 text-primary mx-auto" />
          <h3 className="text-lg font-bold text-foreground">Quer resultados como estes?</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Comece pelo Desafio 7 Dias e ative o FastCRM passo a passo.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button onClick={() => navigate("/club/fastclub/desafio-7-dias")} className="gap-2">
              Iniciar Desafio <ArrowRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" onClick={() => navigate("/club/fastclub/start-here")} className="gap-2">
              Voltar ao Início
            </Button>
          </div>
        </motion.section>
      </main>
    </div>
  );
}
