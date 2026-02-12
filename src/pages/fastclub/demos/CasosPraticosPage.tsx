import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { SubchannelLayout } from "@/components/fastclub/SubchannelLayout";
import { ClosedCaseTemplate } from "@/components/fastclub/ClosedCaseTemplate";

const cases = [
  {
    context: "Empresa de consultoria B2B com 3 comerciais, sem processo estruturado de follow-up.",
    action: "Implementação de pipeline com 5 etapas e automação de follow-up a 48h.",
    result: "Taxa de resposta aumentou de 12% para 34% no primeiro mês.",
    metric: "+183% taxa de resposta",
    author: "João M., CEO",
    date: "Jan 2025",
  },
  {
    context: "Agência digital com ciclo de venda longo (60+ dias) e propostas manuais.",
    action: "Propostas geradas por IA com personalização automática baseada no briefing do lead.",
    result: "Tempo de criação de proposta reduziu de 2h para 8 minutos.",
    metric: "93% menos tempo por proposta",
    author: "Ana R., Diretora Comercial",
    date: "Fev 2025",
  },
];

export default function CasosPraticosPage() {
  return (
    <SubchannelLayout
      title="Casos Práticos"
      subtitle="Resultados reais de empresas que utilizam o FastCRM."
      zoneBadge="FastCRM em Ação"
      breadcrumbs={[
        { label: "FastClub", href: "/club/fastclub" },
        { label: "FastCRM em Ação", href: "/club/fastclub/demos" },
        { label: "Casos Práticos" },
      ]}
      backPath="/club/fastclub/demos"
      ctaLabel="Abrir FastCRM"
      ctaPath="/dashboard"
    >
      <div className="space-y-6">
        {cases.map((c, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.08 }}>
            <ClosedCaseTemplate {...c} />
          </motion.div>
        ))}
      </div>
    </SubchannelLayout>
  );
}
