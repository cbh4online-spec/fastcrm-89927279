import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, CheckCircle } from "lucide-react";
import { SubchannelLayout } from "@/components/fastclub/SubchannelLayout";

const sections = [
  {
    title: "Regras da Rede",
    items: [
      "Cada membro tem uma quota mensal de conexões — qualidade acima de quantidade",
      "Conexões são bidirecionais: ambas as partes devem aceitar",
      "Perfis incompletos não aparecem no motor de matching",
      "Membros inativos há 60+ dias são removidos da pool ativa",
    ],
  },
  {
    title: "Ética e Conduta",
    items: [
      "Respeito profissional em todas as interações",
      "Proibido spam, vendas agressivas ou contactos não solicitados",
      "Honestidade na descrição de serviços e capacidades",
      "Denúncia de comportamento inadequado resulta em suspensão",
    ],
  },
  {
    title: "Estrutura de Quotas",
    items: [
      "Free: 3 conexões por mês",
      "Premium: 10 conexões por mês",
      "Fundador: quota personalizada definida pelo admin",
      "Créditos extra disponíveis via upgrade ou mérito",
    ],
  },
];

export default function ComoFuncionaPage() {
  return (
    <SubchannelLayout
      title="Como Funciona"
      subtitle="Regras, ética e estrutura de quotas da Rede Privada."
      zoneBadge="Rede Privada"
      breadcrumbs={[
        { label: "FastClub", href: "/dashboard/fastclub" },
        { label: "Rede Privada", href: "/dashboard/fastclub/rede-privada" },
        { label: "Como Funciona" },
      ]}
      backPath="/dashboard/fastclub/rede-privada"
      ctaLabel="Abrir FastMatch no CRM"
      ctaPath="/dashboard/fastmatch"
    >
      <div className="space-y-6">
        {sections.map((section, i) => (
          <motion.div key={section.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.06 }}>
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">{section.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {section.items.map((item) => (
                  <div key={item} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-primary/60 mt-0.5 shrink-0" />
                    <span className="text-sm text-muted-foreground">{item}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </SubchannelLayout>
  );
}
