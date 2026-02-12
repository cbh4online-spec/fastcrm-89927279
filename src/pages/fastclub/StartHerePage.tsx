import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, ArrowRight, Zap, Target, BarChart3, Users,
  CheckCircle, Layers, Sparkles, TrendingUp,
} from "lucide-react";

const stagger = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const ecosystemPillars = [
  {
    icon: Zap,
    title: "FastCRM",
    subtitle: "Infraestrutura Digital",
    description: "Pipeline, contactos, propostas, automações e IA — tudo num único sistema modular.",
    color: "from-primary/20 to-primary/5",
    iconColor: "text-primary",
  },
  {
    icon: Target,
    title: "Método PARE",
    subtitle: "Framework de Execução",
    description: "Planeamento, Automação, Resultados e Eficiência — a metodologia que estrutura o seu crescimento.",
    color: "from-blue-500/20 to-blue-500/5",
    iconColor: "text-blue-600",
  },
  {
    icon: Users,
    title: "Rede Privada",
    subtitle: "FastMatch Hub",
    description: "Rede exclusiva de oportunidades entre membros verificados — matching estratégico, não social.",
    color: "from-emerald-500/20 to-emerald-500/5",
    iconColor: "text-emerald-600",
  },
];

const howItWorks = [
  { step: "01", title: "Explore o Método PARE", desc: "Conheça o framework que organiza a execução no FastCRM." },
  { step: "02", title: "Veja o FastCRM em Ação", desc: "Demos curtas e casos práticos reais." },
  { step: "03", title: "Complete o Desafio 7 Dias", desc: "Micro-missões diárias para ativar o FastCRM." },
  { step: "04", title: "Aceda à Zona Premium", desc: "Missões avançadas, playbooks e a Rede Privada." },
];

export default function StartHerePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
              Ponto de Partida
            </Badge>
            <h1 className="text-3xl md:text-4xl font-extrabold text-primary-foreground tracking-tight">
              Bem-vindo ao FastClub
            </h1>
            <p className="text-primary-foreground/70 mt-2 max-w-xl text-base">
              O ecossistema que combina tecnologia, método e rede para acelerar resultados comerciais.
            </p>
          </motion.div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 max-w-5xl space-y-10">
        {/* Ecosystem pillars */}
        <section className="space-y-5">
          <motion.h2 {...stagger} transition={{ delay: 0.1 }} className="text-xl font-bold text-foreground">
            O Ecossistema
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-4">
            {ecosystemPillars.map((p, i) => (
              <motion.div key={p.title} {...stagger} transition={{ delay: 0.15 + i * 0.08 }}>
                <Card className="h-full border-border/50 hover:shadow-md transition-shadow">
                  <CardContent className="p-6 space-y-4">
                    <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${p.color}`}>
                      <p.icon className={`w-6 h-6 ${p.iconColor}`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">{p.title}</h3>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{p.subtitle}</p>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{p.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="space-y-5">
          <motion.h2 {...stagger} transition={{ delay: 0.3 }} className="text-xl font-bold text-foreground">
            Como Funciona
          </motion.h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {howItWorks.map((item, i) => (
              <motion.div key={item.step} {...stagger} transition={{ delay: 0.35 + i * 0.06 }}>
                <Card className="border-border/50 hover:shadow-md transition-shadow">
                  <CardContent className="p-5 flex items-start gap-4">
                    <span className="text-2xl font-extrabold text-primary/30 leading-none">{item.step}</span>
                    <div>
                      <h4 className="font-semibold text-foreground text-sm">{item.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* CTAs */}
        <motion.section {...stagger} transition={{ delay: 0.6 }} className="rounded-2xl border bg-muted/30 p-8 text-center space-y-4">
          <Sparkles className="w-8 h-8 text-primary mx-auto" />
          <h3 className="text-lg font-bold text-foreground">Pronto para começar?</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Explore o Método PARE ou veja o FastCRM em ação com demonstrações práticas.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button onClick={() => navigate("/dashboard/fastclub/metodo-pare")} className="gap-2">
              Método PARE <ArrowRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" onClick={() => navigate("/dashboard/fastclub/demos")} className="gap-2">
              FastCRM em Ação <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </motion.section>
      </main>
    </div>
  );
}
