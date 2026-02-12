import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, ArrowRight, ClipboardList, Zap, BarChart3, Gauge,
  CheckCircle,
} from "lucide-react";

const stagger = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const pillars = [
  {
    letter: "P",
    title: "Planeamento",
    icon: ClipboardList,
    color: "from-blue-600 to-blue-400",
    tagline: "Estruturar antes de agir",
    description: "Definir pipelines, segmentar contactos, mapear processos de venda e configurar o CRM para o seu modelo de negócio.",
    examples: [
      "Configurar pipeline com etapas reais do seu funil",
      "Segmentar contactos por potencial e urgência",
      "Definir campos personalizados para o seu setor",
    ],
  },
  {
    letter: "A",
    title: "Automação",
    icon: Zap,
    color: "from-amber-500 to-orange-400",
    tagline: "Eliminar tarefas repetitivas",
    description: "Automações inteligentes que movem leads, enviam follow-ups e criam tarefas sem intervenção manual.",
    examples: [
      "Follow-up automático após 48h sem resposta",
      "Mover lead de etapa ao atingir critério",
      "Notificação ao gestor quando lead qualificado",
    ],
  },
  {
    letter: "R",
    title: "Resultados",
    icon: BarChart3,
    color: "from-emerald-500 to-green-400",
    tagline: "Medir o que importa",
    description: "Dashboards, KPIs e relatórios que mostram o impacto real das ações comerciais.",
    examples: [
      "Taxa de conversão por etapa do pipeline",
      "Receita prevista vs realizada",
      "Tempo médio de fecho por tipo de negócio",
    ],
  },
  {
    letter: "E",
    title: "Eficiência",
    icon: Gauge,
    color: "from-violet-500 to-purple-400",
    tagline: "Fazer mais com menos",
    description: "IA aplicada, templates reutilizáveis e processos otimizados que multiplicam a capacidade da equipa.",
    examples: [
      "Propostas geradas com IA em 2 minutos",
      "Templates de email com personalização automática",
      "Coach IA que sugere próximas ações",
    ],
  },
];

export default function MetodoParePage() {
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
            onClick={() => navigate("/club/fastclub")}
            className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 mb-4"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <motion.div {...stagger} transition={{ delay: 0.05 }}>
            <Badge className="bg-primary-foreground/15 text-primary-foreground border-0 mb-3">
              Framework de Execução
            </Badge>
            <h1 className="text-3xl md:text-4xl font-extrabold text-primary-foreground tracking-tight">
              Método PARE
            </h1>
            <p className="text-primary-foreground/70 mt-2 max-w-xl text-base">
              Quatro pilares que estruturam a execução comercial dentro do FastCRM.
            </p>
          </motion.div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        {pillars.map((p, i) => (
          <motion.div key={p.letter} {...stagger} transition={{ delay: 0.1 + i * 0.1 }}>
            <Card
              className="border-border/50 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/club/fastclub/metodo-pare/${p.letter === "P" ? "planeamento" : p.letter === "A" ? "automacao" : p.letter === "R" ? "resultados" : "eficiencia"}`)}
            >
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row">
                  <div className={`bg-gradient-to-br ${p.color} p-6 md:p-8 md:w-48 flex flex-col items-center justify-center text-white shrink-0`}>
                    <span className="text-5xl font-black leading-none">{p.letter}</span>
                    <span className="text-sm font-semibold mt-1 opacity-90">{p.title}</span>
                  </div>
                  <div className="p-6 flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <p.icon className="w-5 h-5 text-muted-foreground" />
                      <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{p.tagline}</span>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{p.description}</p>
                    <div className="flex items-center gap-2 text-xs text-primary font-medium">
                      Ver conteúdo <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </main>
    </div>
  );
}
