import { SubchannelLayout } from "@/components/fastclub/SubchannelLayout";
import { AggregatedDashboard } from "@/components/fastclub/AggregatedDashboard";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function IndicadoresPage() {
  return (
    <SubchannelLayout
      title="Indicadores da Rede"
      subtitle="Dados agregados sobre a rede de conexões: membros, oportunidades e tendências."
      zoneBadge="Rede Privada"
      breadcrumbs={[
        { label: "FastClub", href: "/club/fastclub" },
        { label: "Rede Privada", href: "/club/fastclub/rede-privada" },
        { label: "Indicadores" },
      ]}
      backPath="/club/fastclub/rede-privada"
      ctaLabel="Abrir FastMatch no CRM"
      ctaPath="/dashboard/fastmatch"
    >
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <AggregatedDashboard />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Nota sobre os Indicadores</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Os indicadores apresentados são agregados e anonimizados. Refletem a atividade global da rede e são atualizados em tempo real. Para dados individuais e o motor de matching, utilize o FastMatch dentro do CRM.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </SubchannelLayout>
  );
}
