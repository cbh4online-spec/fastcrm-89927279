import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, CheckCircle } from "lucide-react";
import { SubchannelLayout } from "@/components/fastclub/SubchannelLayout";

const FALLBACK = {
  intro: "A automação elimina tarefas repetitivas. Movimentação de leads, follow-ups e notificações acontecem sem intervenção manual, libertando a equipa para o que importa: vender.",
  templates: [
    "Workflow de Follow-up Automático (48h sem resposta)",
    "Automação de Qualificação de Lead por Score",
    "Notificação ao Gestor quando Lead Qualificado",
  ],
  tips: [
    "Automatize primeiro o que mais repete — normalmente é o follow-up",
    "Use condições compostas para evitar automações irrelevantes",
    "Revise as automações mensalmente para manter a relevância",
  ],
};

export default function AutomacaoPage() {
  return (
    <SubchannelLayout
      title="Automação"
      subtitle="Eliminar tarefas repetitivas — follow-ups, movimentação de leads e notificações automáticas."
      zoneBadge="Método PARE"
      breadcrumbs={[
        { label: "FastClub", href: "/dashboard/fastclub" },
        { label: "Método PARE", href: "/dashboard/fastclub/metodo-pare" },
        { label: "Automação" },
      ]}
      backPath="/dashboard/fastclub/metodo-pare"
      ctaLabel="Abrir FastCRM"
      ctaPath="/dashboard/automations"
      gradient="from-amber-500 to-orange-400"
    >
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-muted-foreground" />
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
