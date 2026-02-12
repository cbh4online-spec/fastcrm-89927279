import { motion } from "framer-motion";
import { SubchannelLayout } from "@/components/fastclub/SubchannelLayout";
import { ClosedCaseTemplate } from "@/components/fastclub/ClosedCaseTemplate";

const cases = [
  {
    context: "Agência de marketing procurava parceiro técnico para implementação de CRM em cliente enterprise.",
    action: "Conexão via FastMatch com consultora especializada em integração de sistemas.",
    result: "Projeto conjunto de 45k€ fechado em 3 semanas após o primeiro contacto na rede.",
    metric: "45.000€ em receita conjunta",
    author: "Empresa A + Empresa B",
    date: "Mar 2025",
  },
  {
    context: "Startup SaaS precisava de canal de distribuição B2B para o mercado português.",
    action: "Match com distribuidor com carteira ativa de 200+ PMEs no setor-alvo.",
    result: "Acordo de distribuição assinado — 12 vendas no primeiro trimestre.",
    metric: "12 clientes em 90 dias",
    author: "Startup X + Distribuidor Y",
    date: "Fev 2025",
  },
];

export default function NegociosFechadosPage() {
  return (
    <SubchannelLayout
      title="Negócios Fechados"
      subtitle="Casos reais de negócios originados na Rede Privada."
      zoneBadge="Rede Privada"
      breadcrumbs={[
        { label: "FastClub", href: "/dashboard/fastclub" },
        { label: "Rede Privada", href: "/dashboard/fastclub/rede-privada" },
        { label: "Negócios Fechados" },
      ]}
      backPath="/dashboard/fastclub/rede-privada"
      ctaLabel="Abrir FastMatch no CRM"
      ctaPath="/dashboard/fastmatch"
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
