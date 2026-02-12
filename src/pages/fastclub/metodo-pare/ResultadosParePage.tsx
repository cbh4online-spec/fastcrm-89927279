import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, CheckCircle } from "lucide-react";
import { SubchannelLayout } from "@/components/fastclub/SubchannelLayout";

const FALLBACK = {
  intro: "Medir o que importa. Dashboards, KPIs e relatórios que mostram o impacto real das ações comerciais e permitem decisões baseadas em dados.",
  templates: [
    "Dashboard de Taxa de Conversão por Etapa",
    "Relatório Receita Prevista vs Realizada",
    "Modelo de Análise de Tempo Médio de Fecho",
  ],
  tips: [
    "Defina no máximo 5 KPIs principais — excesso de métricas dilui o foco",
    "Compare períodos homólogos para identificar tendências reais",
    "Use previsões para antecipar meses fracos e agir preventivamente",
  ],
};

export default function ResultadosParePage() {
  return (
    <SubchannelLayout
      title="Resultados"
      subtitle="Medir o que importa — dashboards, KPIs e relatórios de impacto comercial."
      zoneBadge="Método PARE"
      breadcrumbs={[
        { label: "FastClub", href: "/dashboard/fastclub" },
        { label: "Método PARE", href: "/dashboard/fastclub/metodo-pare" },
        { label: "Resultados" },
      ]}
      backPath="/dashboard/fastclub/metodo-pare"
      ctaLabel="Abrir FastCRM"
      ctaPath="/dashboard/reports"
      gradient="from-emerald-500 to-green-400"
    >
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-muted-foreground" />
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
