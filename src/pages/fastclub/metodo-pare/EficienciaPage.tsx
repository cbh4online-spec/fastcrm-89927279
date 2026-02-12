import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gauge, CheckCircle } from "lucide-react";
import { SubchannelLayout } from "@/components/fastclub/SubchannelLayout";

const FALLBACK = {
  intro: "Fazer mais com menos. IA aplicada, templates reutilizáveis e processos otimizados que multiplicam a capacidade da equipa comercial.",
  templates: [
    "Template de Proposta com IA (geração em 2 minutos)",
    "Modelo de Email com Personalização Automática",
    "Workflow de Coach IA para Próximas Ações",
  ],
  tips: [
    "Use templates para as 3 propostas mais frequentes — automatize 80% do volume",
    "Configure o Coach IA para sugerir ações com base no histórico do lead",
    "Reutilize workflows entre membros da equipa para consistência",
  ],
};

export default function EficienciaPage() {
  return (
    <SubchannelLayout
      title="Eficiência"
      subtitle="Fazer mais com menos — IA aplicada, templates e processos otimizados."
      zoneBadge="Método PARE"
      breadcrumbs={[
        { label: "FastClub", href: "/dashboard/fastclub" },
        { label: "Método PARE", href: "/dashboard/fastclub/metodo-pare" },
        { label: "Eficiência" },
      ]}
      backPath="/dashboard/fastclub/metodo-pare"
      ctaLabel="Abrir FastCRM"
      ctaPath="/dashboard/productivity"
      gradient="from-violet-500 to-purple-400"
    >
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Gauge className="w-5 h-5 text-muted-foreground" />
                <CardTitle className="text-lg">Visão Geral</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">{FALLBACK.intro}</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="border-border/50">
            <CardHeader><CardTitle className="text-lg">Templates</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {FALLBACK.templates.map((t) => (
                <div key={t} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-muted-foreground">{t}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-border/50">
            <CardHeader><CardTitle className="text-lg">Dicas Práticas</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {FALLBACK.tips.map((t) => (
                <div key={t} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-primary/60 mt-0.5 shrink-0" />
                  <span className="text-sm text-muted-foreground">{t}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </SubchannelLayout>
  );
}
