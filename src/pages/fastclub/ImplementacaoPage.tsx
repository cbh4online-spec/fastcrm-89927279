import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { PremiumGate } from "@/components/fastclub/PremiumGate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowLeft, ArrowRight, BookOpen, ChevronDown, Clock, Loader2, Star,
} from "lucide-react";

const stagger = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

interface PlaybookMetadata {
  categoria?: string;
  duracao?: string;
  nivel?: string;
  checklist?: string[];
}

const CATEGORIES = ["Todos", "Onboarding", "Pipeline", "Automações", "Integração"];

const nivelColors: Record<string, string> = {
  "Básico": "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  "Intermédio": "bg-amber-500/10 text-amber-600 border-amber-500/20",
  "Avançado": "bg-red-500/10 text-red-600 border-red-500/20",
};

export default function ImplementacaoPage() {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: playbooks = [], isLoading } = useQuery({
    queryKey: ["fastclub-implementacao", currentWorkspace?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fastclub_content_sections")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .eq("page_key", "implementacao")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!currentWorkspace,
  });

  const filtered = activeCategory === "Todos"
    ? playbooks
    : playbooks.filter((p) => (p.metadata as PlaybookMetadata)?.categoria === activeCategory);

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
              Implementação Guiada
            </h1>
            <p className="text-primary-foreground/70 mt-2 max-w-xl text-base">
              Playbooks e checklists para implementar o FastCRM com sucesso.
            </p>
          </motion.div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        <PremiumGate featureLabel="Implementação Guiada">
          {/* Category Filter */}
          <motion.div {...stagger} transition={{ delay: 0.1 }} className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {cat}
              </button>
            ))}
          </motion.div>

          {/* Playbook Grid */}
          <div className="grid gap-4 mt-6">
            {filtered.map((playbook, i) => {
              const meta = (playbook.metadata as PlaybookMetadata) || {};
              const isExpanded = expandedId === playbook.id;

              return (
                <motion.div
                  key={playbook.id}
                  {...stagger}
                  transition={{ delay: 0.15 + i * 0.06 }}
                >
                  <Collapsible open={isExpanded} onOpenChange={() => setExpandedId(isExpanded ? null : playbook.id)}>
                    <Card className="transition-all hover:shadow-md">
                      <CollapsibleTrigger asChild>
                        <CardContent className="p-5 cursor-pointer">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1">
                              <div className="p-2 rounded-lg bg-primary/10 mt-0.5">
                                <BookOpen className="w-4 h-4 text-primary" />
                              </div>
                              <div className="space-y-1 flex-1">
                                <h3 className="font-semibold text-foreground">{playbook.title}</h3>
                                <p className="text-sm text-muted-foreground line-clamp-2">{playbook.content}</p>
                                <div className="flex items-center gap-2 pt-1">
                                  {meta.nivel && (
                                    <Badge variant="outline" className={`text-[10px] ${nivelColors[meta.nivel] || ""}`}>
                                      {meta.nivel}
                                    </Badge>
                                  )}
                                  {meta.duracao && (
                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <Clock className="w-3 h-3" />
                                      {meta.duracao}
                                    </span>
                                  )}
                                  {meta.categoria && (
                                    <Badge variant="secondary" className="text-[10px]">{meta.categoria}</Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 mt-1 ${isExpanded ? "rotate-180" : ""}`} />
                          </div>
                        </CardContent>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-5 pb-5 pt-0 border-t">
                          <div className="pt-4 space-y-3">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Checklist</span>
                            {meta.checklist?.map((step, j) => (
                              <div key={j} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                                  {j + 1}
                                </span>
                                <span className="text-sm text-foreground">{step}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                </motion.div>
              );
            })}
          </div>

          {/* CTA */}
          <motion.section {...stagger} transition={{ delay: 0.5 }} className="rounded-2xl border bg-muted/30 p-8 text-center space-y-4 mt-8">
            <BookOpen className="w-8 h-8 text-primary mx-auto" />
            <h3 className="text-lg font-bold text-foreground">Precisa de mais ajuda?</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Explore o Desafio 7 Dias para uma experiência guiada passo a passo.
            </p>
            <Button variant="outline" onClick={() => navigate("/club/fastclub/desafio-7-dias")} className="gap-2">
              Ver Desafio 7 Dias
              <ArrowRight className="w-4 h-4" />
            </Button>
          </motion.section>
        </PremiumGate>
      </main>
    </div>
  );
}
